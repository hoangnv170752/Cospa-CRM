import { FastifyInstance } from 'fastify';
import { prisma } from '../services/prisma.js';

interface ResendAttachment {
  id: string;
  filename: string;
  content_type: string;
  content_disposition?: string;
  content_id?: string;
}

interface ResendEmailReceivedEvent {
  type: 'email.received';
  created_at: string;
  data: {
    email_id: string;
    created_at: string;
    from: string;
    to: string[];
    bcc: string[];
    cc: string[];
    received_for: string[];
    message_id: string;
    subject: string;
    attachments: ResendAttachment[];
  };
}

interface ResendWebhookEvent {
  type: string;
  created_at: string;
  data: Record<string, unknown>;
}

export async function webhookRoutes(fastify: FastifyInstance) {
  // POST /webhooks/resend - Resend webhook receiver
  fastify.post<{ Body: ResendWebhookEvent }>(
    '/webhooks/resend',
    {
      schema: {
        tags: ['Webhooks'],
        summary: 'Resend webhook endpoint',
        description:
          'Receives webhook events from Resend (e.g. email.received for inbound emails). No authentication required — verify via Resend webhook secret.',
        body: {
          type: 'object',
          properties: {
            type: { type: 'string' },
            created_at: { type: 'string' },
            data: { type: 'object' },
          },
        },
      },
    },
    async (request, reply) => {
      const event = request.body;

      // Optionally verify webhook signature
      // const svixId = request.headers['svix-id'];
      // const svixTimestamp = request.headers['svix-timestamp'];
      // const svixSignature = request.headers['svix-signature'];
      // You can use resend.webhooks.verify() here if RESEND_WEBHOOK_SECRET is set

      if (event.type === 'email.received') {
        const receivedEvent = event as unknown as ResendEmailReceivedEvent;
        const emailData = receivedEvent.data;

        try {
          // Check for duplicate
          const existing = await prisma.inboundEmail.findUnique({
            where: { resendEmailId: emailData.email_id },
          });

          if (existing) {
            return reply.send({ status: 'duplicate', id: existing.id });
          }

          // Fetch email content from Resend API
          let htmlBody: string | null = null;
          let textBody: string | null = null;

          try {
            // Use Resend SDK to retrieve full email content
            const emailContent = await fetch(
              `https://api.resend.com/emails/${emailData.email_id}/content`,
              {
                headers: {
                  Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
                },
              }
            );

            if (emailContent.ok) {
              const content = (await emailContent.json()) as {
                html?: string;
                text?: string;
              };
              htmlBody = content.html || null;
              textBody = content.text || null;
            }
          } catch (fetchError) {
            console.warn('Could not fetch email content from Resend:', fetchError);
          }

          // Try to match to a tenant by the "to" address domain
          let tenantId: string | null = null;
          for (const toAddr of emailData.to) {
            const domain = toAddr.split('@')[1];
            if (domain) {
              const tenant = await prisma.tenant.findFirst({
                where: {
                  OR: [
                    { domain },
                    { slug: domain.split('.')[0] },
                  ],
                },
                select: { id: true },
              });
              if (tenant) {
                tenantId = tenant.id;
                break;
              }
            }
          }

          // Store the inbound email
          const inboundEmail = await prisma.inboundEmail.create({
            data: {
              resendEmailId: emailData.email_id,
              from: emailData.from,
              to: emailData.to,
              cc: emailData.cc || [],
              bcc: emailData.bcc || [],
              subject: emailData.subject || null,
              messageId: emailData.message_id || null,
              receivedFor: emailData.received_for || [],
              htmlBody,
              textBody,
              tenantId,
              attachments: emailData.attachments?.length
                ? {
                    create: emailData.attachments.map((att) => ({
                      resendAttachmentId: att.id,
                      filename: att.filename,
                      contentType: att.content_type,
                      contentDisposition: att.content_disposition || null,
                      contentId: att.content_id || null,
                    })),
                  }
                : undefined,
            },
            include: {
              attachments: true,
            },
          });

          console.log(
            `Inbound email received: ${inboundEmail.id} from ${emailData.from} subject="${emailData.subject}"`
          );

          return reply.send({ status: 'received', id: inboundEmail.id });
        } catch (error) {
          console.error('Failed to process inbound email:', error);
          return reply.status(500).send({ error: 'Failed to process email' });
        }
      }

      // Handle other event types (delivery status, bounces, etc.)
      if (event.type === 'email.delivered') {
        const resendId = (event.data as { email_id?: string }).email_id;
        if (resendId) {
          await prisma.emailRecipient.updateMany({
            where: { resendId },
            data: { status: 'delivered' },
          });
        }
        return reply.send({ status: 'ok' });
      }

      if (event.type === 'email.opened') {
        const resendId = (event.data as { email_id?: string }).email_id;
        if (resendId) {
          await prisma.emailRecipient.updateMany({
            where: { resendId },
            data: { status: 'opened', openedAt: new Date() },
          });
        }
        return reply.send({ status: 'ok' });
      }

      if (event.type === 'email.clicked') {
        const resendId = (event.data as { email_id?: string }).email_id;
        if (resendId) {
          await prisma.emailRecipient.updateMany({
            where: { resendId },
            data: { status: 'clicked', clickedAt: new Date() },
          });
        }
        return reply.send({ status: 'ok' });
      }

      if (event.type === 'email.bounced') {
        const resendId = (event.data as { email_id?: string }).email_id;
        if (resendId) {
          await prisma.emailRecipient.updateMany({
            where: { resendId },
            data: { status: 'bounced' },
          });
        }
        return reply.send({ status: 'ok' });
      }

      // Unknown event type — acknowledge anyway
      return reply.send({ status: 'ignored', type: event.type });
    }
  );

  // GET /inbound-emails - List received emails (sysadmin or tenant scoped)
  fastify.get(
    '/inbound-emails',
    {
      preHandler: [
        (await import('../middleware/auth.js')).authenticate,
        (await import('../middleware/auth.js')).requireRole('sys_admin', 'tenant_admin'),
      ],
      schema: {
        tags: ['Inbound Emails'],
        summary: 'List received emails',
        description: 'Get inbound emails. Sysadmin sees all, tenant admins see emails matched to their tenant.',
        security: [{ bearerAuth: [] }],
        querystring: {
          type: 'object',
          properties: {
            page: { type: 'number', default: 1 },
            limit: { type: 'number', default: 20 },
            search: { type: 'string' },
          },
        },
      },
    },
    async (request, reply) => {
      const { page = 1, limit = 20, search } = request.query as {
        page?: number;
        limit?: number;
        search?: string;
      };
      const skip = (page - 1) * limit;

      const isSysAdmin = request.user?.role === 'sys_admin';
      const tenantFilter = !isSysAdmin && request.user?.tenantId
        ? { tenantId: request.user.tenantId }
        : {};

      const searchFilter = search
        ? {
            OR: [
              { from: { contains: search, mode: 'insensitive' as const } },
              { subject: { contains: search, mode: 'insensitive' as const } },
            ],
          }
        : {};

      const where = { ...tenantFilter, ...searchFilter };

      const [emails, total] = await Promise.all([
        prisma.inboundEmail.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
          include: {
            _count: { select: { attachments: true } },
            tenant: { select: { id: true, name: true } },
          },
        }),
        prisma.inboundEmail.count({ where }),
      ]);

      return reply.send({
        data: emails,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      });
    }
  );

  // GET /inbound-emails/:id - Get single inbound email with content
  fastify.get<{ Params: { id: string } }>(
    '/inbound-emails/:id',
    {
      preHandler: [
        (await import('../middleware/auth.js')).authenticate,
        (await import('../middleware/auth.js')).requireRole('sys_admin', 'tenant_admin'),
      ],
      schema: {
        tags: ['Inbound Emails'],
        summary: 'Get inbound email details',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
          required: ['id'],
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params;

      const isSysAdmin = request.user?.role === 'sys_admin';
      const tenantFilter = !isSysAdmin && request.user?.tenantId
        ? { tenantId: request.user.tenantId }
        : {};

      const email = await prisma.inboundEmail.findFirst({
        where: { id, ...tenantFilter },
        include: {
          attachments: true,
          tenant: { select: { id: true, name: true } },
        },
      });

      if (!email) {
        return reply.status(404).send({ error: 'Email not found' });
      }

      // Mark as processed if still in received state
      if (email.status === 'received') {
        await prisma.inboundEmail.update({
          where: { id },
          data: { status: 'processed', processedAt: new Date() },
        });
      }

      return reply.send(email);
    }
  );
}
