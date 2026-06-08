import { Resend } from 'resend';
import { prisma } from '../services/prisma.js';
import { authenticate, requireRole } from '../middleware/auth.js';
const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'noreply@crm.cospa.ai.vn';
export async function emailRoutes(fastify) {
    // POST /contacts/send-email - Send bulk emails to contacts
    fastify.post('/contacts/send-email', {
        preHandler: [authenticate, requireRole('sys_admin', 'tenant_admin', 'tenant_user')],
        schema: {
            tags: ['Emails'],
            summary: 'Send bulk emails to contacts',
            description: 'Send emails to multiple contacts. Sysadmin can send to all contacts, tenants can only send to their own contacts.',
            security: [{ bearerAuth: [] }],
            body: {
                type: 'object',
                properties: {
                    contactIds: {
                        type: 'array',
                        items: { type: 'string', format: 'uuid' },
                        description: 'Array of contact IDs to send email to',
                    },
                    contacts: {
                        type: 'array',
                        items: {
                            type: 'object',
                            properties: {
                                email: { type: 'string', format: 'email' },
                                firstName: { type: 'string' },
                                lastName: { type: 'string' },
                            },
                            required: ['email'],
                        },
                        description: 'Array of contact objects with email, firstName, lastName',
                    },
                    subject: { type: 'string' },
                    htmlContent: { type: 'string' },
                    textContent: { type: 'string' },
                    fromName: { type: 'string' },
                },
                required: ['subject', 'htmlContent'],
            },
            response: {
                200: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean' },
                        message: { type: 'string' },
                        totalContacts: { type: 'number' },
                        successCount: { type: 'number' },
                        failedCount: { type: 'number' },
                        emailId: { type: 'string' },
                        errors: { type: 'array', items: { type: 'object' } },
                    },
                },
            },
        },
    }, async (request, reply) => {
        const { contactIds, contacts: providedContacts, subject, htmlContent, textContent, fromName } = request.body;
        if (!contactIds && !providedContacts) {
            return reply.status(400).send({
                error: 'Either contactIds or contacts array is required',
            });
        }
        let contactList = [];
        // If contactIds provided, fetch contacts from database
        if (contactIds && contactIds.length > 0) {
            // Sysadmin can access all contacts, tenant users only their own
            const isSysAdmin = request.user?.role === 'sys_admin';
            const tenantFilter = !isSysAdmin && request.user?.tenantId
                ? { company: { tenantId: request.user.tenantId } }
                : {};
            const dbContacts = await prisma.contact.findMany({
                where: {
                    id: { in: contactIds },
                    ...tenantFilter,
                },
                select: {
                    id: true,
                    email: true,
                    firstName: true,
                    lastName: true,
                },
            });
            contactList = dbContacts;
        }
        // Add provided contacts
        if (providedContacts && providedContacts.length > 0) {
            contactList = [...contactList, ...providedContacts];
        }
        if (contactList.length === 0) {
            return reply.status(400).send({
                error: 'No valid contacts found to send email',
            });
        }
        const fromAddress = fromName
            ? `${fromName} <${FROM_EMAIL}>`
            : FROM_EMAIL;
        // Create email record in database
        const emailRecord = await prisma.email.create({
            data: {
                subject,
                htmlContent,
                fromName: fromName || null,
                fromEmail: FROM_EMAIL,
                status: 'sending',
                sentById: request.user?.userId || null,
                tenantId: request.user?.tenantId || null,
                recipients: {
                    create: contactList.map((contact) => ({
                        email: contact.email,
                        name: contact.firstName && contact.lastName
                            ? `${contact.firstName} ${contact.lastName}`
                            : contact.firstName || null,
                        status: 'pending',
                        contactId: contact.id || null,
                    })),
                },
            },
            include: {
                recipients: true,
            },
        });
        // Prepare emails with personalization
        const emails = contactList.map((contact, index) => {
            const personalizedHtml = htmlContent
                .replace(/{{firstName}}/g, contact.firstName || '')
                .replace(/{{lastName}}/g, contact.lastName || '')
                .replace(/{{email}}/g, contact.email);
            const personalizedText = textContent
                ? textContent
                    .replace(/{{firstName}}/g, contact.firstName || '')
                    .replace(/{{lastName}}/g, contact.lastName || '')
                    .replace(/{{email}}/g, contact.email)
                : undefined;
            return {
                from: fromAddress,
                to: contact.email,
                subject,
                html: personalizedHtml,
                text: personalizedText,
                _recipientId: emailRecord.recipients[index]?.id,
            };
        });
        // Send emails in batches (Resend supports up to 100 per batch)
        const results = [];
        const batchSize = 100;
        let successCount = 0;
        const errors = [];
        for (let i = 0; i < emails.length; i += batchSize) {
            const batch = emails.slice(i, i + batchSize);
            const batchWithoutMeta = batch.map(({ _recipientId, ...rest }) => rest);
            try {
                const batchResult = await resend.batch.send(batchWithoutMeta);
                results.push(batchResult);
                // Update recipient status in database
                if (batchResult.data) {
                    const dataArray = Array.isArray(batchResult.data) ? batchResult.data : [batchResult.data];
                    for (let j = 0; j < dataArray.length; j++) {
                        const recipientId = batch[j]?._recipientId;
                        if (recipientId) {
                            await prisma.emailRecipient.update({
                                where: { id: recipientId },
                                data: {
                                    status: 'sent',
                                    resendId: dataArray[j]?.id || null,
                                },
                            });
                        }
                        successCount++;
                    }
                }
                if (batchResult.error) {
                    errors.push(batchResult.error);
                    // Mark all in batch as failed
                    for (const email of batch) {
                        if (email._recipientId) {
                            await prisma.emailRecipient.update({
                                where: { id: email._recipientId },
                                data: {
                                    status: 'failed',
                                    error: String(batchResult.error),
                                },
                            });
                        }
                    }
                }
            }
            catch (error) {
                results.push({ error, data: null });
                errors.push(error);
                // Mark all in batch as failed
                for (const email of batch) {
                    if (email._recipientId) {
                        await prisma.emailRecipient.update({
                            where: { id: email._recipientId },
                            data: {
                                status: 'failed',
                                error: String(error),
                            },
                        });
                    }
                }
            }
        }
        // Update email record with final status
        const failedCount = contactList.length - successCount;
        await prisma.email.update({
            where: { id: emailRecord.id },
            data: {
                status: failedCount === 0 ? 'sent' : failedCount === contactList.length ? 'failed' : 'partial_failure',
                totalSent: successCount,
                totalFailed: failedCount,
            },
        });
        return reply.send({
            success: errors.length === 0,
            message: `Sent ${successCount} of ${contactList.length} emails successfully`,
            totalContacts: contactList.length,
            successCount,
            failedCount,
            emailId: emailRecord.id,
            errors: errors.length > 0 ? errors : undefined,
        });
    });
    // POST /tenants/send-email - Send emails to tenant admins (sysadmin only)
    fastify.post('/tenants/send-email', {
        preHandler: [authenticate, requireRole('sys_admin')],
        schema: {
            tags: ['Emails'],
            summary: 'Send emails to tenant admins (sysadmin only)',
            description: 'Send emails to tenant admin users. Only accessible by system administrators.',
            security: [{ bearerAuth: [] }],
            body: {
                type: 'object',
                properties: {
                    tenantIds: {
                        type: 'array',
                        items: { type: 'string', format: 'uuid' },
                        description: 'Array of tenant IDs. If empty, sends to all tenants.',
                    },
                    subject: { type: 'string' },
                    htmlContent: { type: 'string' },
                    textContent: { type: 'string' },
                    fromName: { type: 'string' },
                },
                required: ['subject', 'htmlContent'],
            },
            response: {
                200: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean' },
                        message: { type: 'string' },
                        totalTenants: { type: 'number' },
                        successCount: { type: 'number' },
                        failedCount: { type: 'number' },
                        emailId: { type: 'string' },
                        errors: { type: 'array', items: { type: 'object' } },
                    },
                },
            },
        },
    }, async (request, reply) => {
        const { tenantIds, subject, htmlContent, textContent, fromName } = request.body;
        // Get tenant admin users
        const tenantFilter = tenantIds && tenantIds.length > 0
            ? { tenantId: { in: tenantIds } }
            : {};
        const tenantAdmins = await prisma.user.findMany({
            where: {
                role: 'tenant_admin',
                status: 'active',
                ...tenantFilter,
            },
            select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                tenantId: true,
                tenant: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
            },
        });
        if (tenantAdmins.length === 0) {
            return reply.status(400).send({
                error: 'No tenant admins found',
            });
        }
        const fromAddress = fromName
            ? `${fromName} <${FROM_EMAIL}>`
            : FROM_EMAIL;
        // Create email record in database
        const emailRecord = await prisma.email.create({
            data: {
                subject,
                htmlContent,
                fromName: fromName || null,
                fromEmail: FROM_EMAIL,
                status: 'sending',
                sentById: request.user?.userId || null,
                tenantId: null, // Sysadmin email
                recipients: {
                    create: tenantAdmins.map((admin) => ({
                        email: admin.email,
                        name: `${admin.firstName} ${admin.lastName}`,
                        status: 'pending',
                        tenantRecipientId: admin.tenant?.id || null,
                    })),
                },
            },
            include: {
                recipients: true,
            },
        });
        // Prepare emails with personalization
        const emails = tenantAdmins.map((admin, index) => {
            const personalizedHtml = htmlContent
                .replace(/{{firstName}}/g, admin.firstName || '')
                .replace(/{{lastName}}/g, admin.lastName || '')
                .replace(/{{email}}/g, admin.email)
                .replace(/{{tenantName}}/g, admin.tenant?.name || '');
            const personalizedText = textContent
                ? textContent
                    .replace(/{{firstName}}/g, admin.firstName || '')
                    .replace(/{{lastName}}/g, admin.lastName || '')
                    .replace(/{{email}}/g, admin.email)
                    .replace(/{{tenantName}}/g, admin.tenant?.name || '')
                : undefined;
            return {
                from: fromAddress,
                to: admin.email,
                subject,
                html: personalizedHtml,
                text: personalizedText,
                _recipientId: emailRecord.recipients[index]?.id,
            };
        });
        // Send emails in batches
        const results = [];
        const batchSize = 100;
        let successCount = 0;
        const errors = [];
        for (let i = 0; i < emails.length; i += batchSize) {
            const batch = emails.slice(i, i + batchSize);
            const batchWithoutMeta = batch.map(({ _recipientId, ...rest }) => rest);
            try {
                const batchResult = await resend.batch.send(batchWithoutMeta);
                results.push(batchResult);
                // Update recipient status in database
                if (batchResult.data) {
                    const dataArray = Array.isArray(batchResult.data) ? batchResult.data : [batchResult.data];
                    for (let j = 0; j < dataArray.length; j++) {
                        const recipientId = batch[j]?._recipientId;
                        if (recipientId) {
                            await prisma.emailRecipient.update({
                                where: { id: recipientId },
                                data: {
                                    status: 'sent',
                                    resendId: dataArray[j]?.id || null,
                                },
                            });
                        }
                        successCount++;
                    }
                }
                if (batchResult.error) {
                    errors.push(batchResult.error);
                    // Mark all in batch as failed
                    for (const email of batch) {
                        if (email._recipientId) {
                            await prisma.emailRecipient.update({
                                where: { id: email._recipientId },
                                data: {
                                    status: 'failed',
                                    error: String(batchResult.error),
                                },
                            });
                        }
                    }
                }
            }
            catch (error) {
                results.push({ error, data: null });
                errors.push(error);
                // Mark all in batch as failed
                for (const email of batch) {
                    if (email._recipientId) {
                        await prisma.emailRecipient.update({
                            where: { id: email._recipientId },
                            data: {
                                status: 'failed',
                                error: String(error),
                            },
                        });
                    }
                }
            }
        }
        // Update email record with final status
        const failedCount = tenantAdmins.length - successCount;
        await prisma.email.update({
            where: { id: emailRecord.id },
            data: {
                status: failedCount === 0 ? 'sent' : failedCount === tenantAdmins.length ? 'failed' : 'partial_failure',
                totalSent: successCount,
                totalFailed: failedCount,
            },
        });
        return reply.send({
            success: errors.length === 0,
            message: `Sent ${successCount} of ${tenantAdmins.length} emails successfully`,
            totalTenants: tenantAdmins.length,
            successCount,
            failedCount,
            emailId: emailRecord.id,
            errors: errors.length > 0 ? errors : undefined,
        });
    });
    // POST /emails/send - Send a single email
    fastify.post('/emails/send', {
        preHandler: [authenticate, requireRole('sys_admin', 'tenant_admin', 'tenant_user')],
        schema: {
            tags: ['Emails'],
            summary: 'Send a single email',
            security: [{ bearerAuth: [] }],
            body: {
                type: 'object',
                properties: {
                    to: { type: 'string', format: 'email' },
                    subject: { type: 'string' },
                    htmlContent: { type: 'string' },
                    textContent: { type: 'string' },
                    fromName: { type: 'string' },
                },
                required: ['to', 'subject', 'htmlContent'],
            },
            response: {
                200: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean' },
                        id: { type: 'string' },
                        emailId: { type: 'string' },
                    },
                },
            },
        },
    }, async (request, reply) => {
        const { to, subject, htmlContent, textContent, fromName } = request.body;
        const fromAddress = fromName
            ? `${fromName} <${FROM_EMAIL}>`
            : FROM_EMAIL;
        // Create email record in database
        const emailRecord = await prisma.email.create({
            data: {
                subject,
                htmlContent,
                fromName: fromName || null,
                fromEmail: FROM_EMAIL,
                status: 'sending',
                sentById: request.user?.userId || null,
                tenantId: request.user?.tenantId || null,
                recipients: {
                    create: {
                        email: to,
                        status: 'pending',
                    },
                },
            },
            include: {
                recipients: true,
            },
        });
        try {
            const result = await resend.emails.send({
                from: fromAddress,
                to,
                subject,
                html: htmlContent,
                text: textContent,
            });
            if (result.error) {
                // Update status to failed
                await prisma.email.update({
                    where: { id: emailRecord.id },
                    data: {
                        status: 'failed',
                        totalFailed: 1,
                    },
                });
                await prisma.emailRecipient.update({
                    where: { id: emailRecord.recipients[0]?.id },
                    data: {
                        status: 'failed',
                        error: String(result.error),
                    },
                });
                return reply.status(400).send({
                    success: false,
                    error: result.error,
                });
            }
            // Update status to sent
            await prisma.email.update({
                where: { id: emailRecord.id },
                data: {
                    status: 'sent',
                    totalSent: 1,
                },
            });
            await prisma.emailRecipient.update({
                where: { id: emailRecord.recipients[0]?.id },
                data: {
                    status: 'sent',
                    resendId: result.data?.id || null,
                },
            });
            return reply.send({
                success: true,
                id: result.data?.id,
                emailId: emailRecord.id,
            });
        }
        catch (error) {
            // Update status to failed
            await prisma.email.update({
                where: { id: emailRecord.id },
                data: {
                    status: 'failed',
                    totalFailed: 1,
                },
            });
            await prisma.emailRecipient.update({
                where: { id: emailRecord.recipients[0]?.id },
                data: {
                    status: 'failed',
                    error: String(error),
                },
            });
            return reply.status(500).send({
                success: false,
                error: String(error),
            });
        }
    });
    // GET /emails - Get email history
    fastify.get('/emails', {
        preHandler: [authenticate, requireRole('sys_admin', 'tenant_admin', 'tenant_user')],
        schema: {
            tags: ['Emails'],
            summary: 'Get email history',
            description: 'Get list of sent emails. Sysadmin sees all, tenants see their own.',
            security: [{ bearerAuth: [] }],
            querystring: {
                type: 'object',
                properties: {
                    page: { type: 'number', default: 1 },
                    limit: { type: 'number', default: 20 },
                },
            },
            response: {
                200: {
                    type: 'object',
                    properties: {
                        emails: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    id: { type: 'string' },
                                    subject: { type: 'string' },
                                    fromName: { type: 'string' },
                                    fromEmail: { type: 'string' },
                                    status: { type: 'string' },
                                    totalSent: { type: 'number' },
                                    totalFailed: { type: 'number' },
                                    createdAt: { type: 'string' },
                                },
                            },
                        },
                        total: { type: 'number' },
                        page: { type: 'number' },
                        limit: { type: 'number' },
                    },
                },
            },
        },
    }, async (request, reply) => {
        const { page = 1, limit = 20 } = request.query;
        const skip = (page - 1) * limit;
        const isSysAdmin = request.user?.role === 'sys_admin';
        const tenantFilter = !isSysAdmin && request.user?.tenantId
            ? { tenantId: request.user.tenantId }
            : {};
        const [emails, total] = await Promise.all([
            prisma.email.findMany({
                where: tenantFilter,
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
                include: {
                    sentBy: {
                        select: {
                            firstName: true,
                            lastName: true,
                            email: true,
                        },
                    },
                    _count: {
                        select: {
                            recipients: true,
                        },
                    },
                },
            }),
            prisma.email.count({ where: tenantFilter }),
        ]);
        return reply.send({
            emails,
            total,
            page,
            limit,
        });
    });
    // GET /emails/:id - Get email details with recipients
    fastify.get('/emails/:id', {
        preHandler: [authenticate, requireRole('sys_admin', 'tenant_admin', 'tenant_user')],
        schema: {
            tags: ['Emails'],
            summary: 'Get email details',
            security: [{ bearerAuth: [] }],
            params: {
                type: 'object',
                properties: {
                    id: { type: 'string', format: 'uuid' },
                },
                required: ['id'],
            },
        },
    }, async (request, reply) => {
        const { id } = request.params;
        const isSysAdmin = request.user?.role === 'sys_admin';
        const tenantFilter = !isSysAdmin && request.user?.tenantId
            ? { tenantId: request.user.tenantId }
            : {};
        const email = await prisma.email.findFirst({
            where: {
                id,
                ...tenantFilter,
            },
            include: {
                sentBy: {
                    select: {
                        firstName: true,
                        lastName: true,
                        email: true,
                    },
                },
                recipients: {
                    orderBy: { createdAt: 'asc' },
                },
            },
        });
        if (!email) {
            return reply.status(404).send({ error: 'Email not found' });
        }
        return reply.send(email);
    });
}
//# sourceMappingURL=emails.js.map