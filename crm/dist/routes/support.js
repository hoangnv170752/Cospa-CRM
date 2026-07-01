import { prisma } from '../services/prisma.js';
import { authenticate } from '../middleware/auth.js';
export async function supportRoutes(fastify) {
    // GET /support/messages - Get support conversation messages
    fastify.get('/support/messages', {
        preHandler: [authenticate],
        schema: {
            tags: ['Support'],
            summary: 'Get support messages',
            description: 'Get all messages from the support conversation with platform administrators',
            security: [{ bearerAuth: [] }],
        },
    }, async (request, reply) => {
        const currentUserId = request.user.userId;
        // Find existing support conversation for this user
        let conversation = await prisma.conversation.findFirst({
            where: {
                type: 'support',
                participants: {
                    some: { userId: currentUserId },
                },
            },
            include: {
                messages: {
                    where: { deletedAt: null },
                    orderBy: { createdAt: 'asc' },
                    include: {
                        sender: {
                            select: {
                                id: true,
                                firstName: true,
                                lastName: true,
                                role: true,
                            },
                        },
                    },
                },
                participants: {
                    select: {
                        userId: true,
                        lastReadAt: true,
                    },
                },
            },
        });
        if (!conversation) {
            // No support conversation yet, return empty
            return reply.send({
                messages: [],
                unreadCount: 0,
            });
        }
        // Get unread count
        const participant = conversation.participants.find((p) => p.userId === currentUserId);
        const unreadCount = await prisma.directMessage.count({
            where: {
                conversationId: conversation.id,
                senderId: { not: currentUserId },
                createdAt: {
                    gt: participant?.lastReadAt || new Date(0),
                },
                deletedAt: null,
            },
        });
        // Mark as read
        await prisma.conversationParticipant.updateMany({
            where: {
                conversationId: conversation.id,
                userId: currentUserId,
            },
            data: { lastReadAt: new Date() },
        });
        // Transform messages for frontend
        const messages = conversation.messages.map((msg) => ({
            id: msg.id,
            content: msg.content,
            senderId: msg.senderId,
            senderName: `${msg.sender.firstName} ${msg.sender.lastName}`.trim(),
            senderRole: msg.sender.role,
            createdAt: msg.createdAt.toISOString(),
            isOwn: msg.senderId === currentUserId,
        }));
        return reply.send({
            messages,
            unreadCount,
            conversationId: conversation.id,
        });
    });
    // POST /support/messages - Send a support message
    fastify.post('/support/messages', {
        preHandler: [authenticate],
        schema: {
            tags: ['Support'],
            summary: 'Send a support message',
            description: 'Send a message to platform administrators. Creates support conversation if not exists.',
            security: [{ bearerAuth: [] }],
            body: {
                type: 'object',
                required: ['content'],
                properties: {
                    content: { type: 'string', minLength: 1, maxLength: 5000 },
                },
            },
        },
    }, async (request, reply) => {
        const { content } = request.body;
        const currentUserId = request.user.userId;
        // Prevent sys_admin from using this endpoint
        if (request.user.role === 'sys_admin') {
            return reply.status(403).send({
                error: 'System administrators should use the messaging system directly',
            });
        }
        // Find existing support conversation
        let conversation = await prisma.conversation.findFirst({
            where: {
                type: 'support',
                participants: {
                    some: { userId: currentUserId },
                },
            },
        });
        // If no conversation, create one with a SysAdmin
        if (!conversation) {
            // Find an active SysAdmin
            const sysAdmin = await prisma.user.findFirst({
                where: { role: 'sys_admin', status: 'active' },
                orderBy: { lastLoginAt: 'desc' },
            });
            if (!sysAdmin) {
                return reply.status(503).send({
                    error: 'No support administrator available at the moment. Please try again later.',
                });
            }
            // Get current user's info for conversation title
            const currentUser = await prisma.user.findUnique({
                where: { id: currentUserId },
                include: {
                    tenant: { select: { name: true } },
                },
            });
            const tenantName = currentUser?.tenant?.name || 'Unknown';
            const userName = `${currentUser?.firstName || ''} ${currentUser?.lastName || ''}`.trim() || currentUser?.email;
            // Create new support conversation
            conversation = await prisma.conversation.create({
                data: {
                    title: `Support: ${tenantName} - ${userName}`,
                    type: 'support',
                    participants: {
                        create: [
                            { userId: currentUserId },
                            { userId: sysAdmin.id },
                        ],
                    },
                },
            });
        }
        // Create the message
        const message = await prisma.directMessage.create({
            data: {
                conversationId: conversation.id,
                senderId: currentUserId,
                content,
            },
            include: {
                sender: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        role: true,
                    },
                },
            },
        });
        // Update conversation timestamp
        await prisma.conversation.update({
            where: { id: conversation.id },
            data: { updatedAt: new Date() },
        });
        // Update sender's lastReadAt
        await prisma.conversationParticipant.updateMany({
            where: {
                conversationId: conversation.id,
                userId: currentUserId,
            },
            data: { lastReadAt: new Date() },
        });
        return reply.status(201).send({
            id: message.id,
            content: message.content,
            senderId: message.senderId,
            senderName: `${message.sender.firstName} ${message.sender.lastName}`.trim(),
            senderRole: message.sender.role,
            createdAt: message.createdAt.toISOString(),
            isOwn: true,
        });
    });
}
//# sourceMappingURL=support.js.map