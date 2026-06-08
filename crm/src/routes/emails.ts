import { FastifyInstance } from 'fastify';
import { Resend } from 'resend';
import { prisma } from '../services/prisma.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'noreply@crm.cospa.ai.vn';

interface ContactEmail {
  email: string;
  firstName?: string;
  lastName?: string;
}

interface SendBulkEmailBody {
  contactIds?: string[];
  contacts?: ContactEmail[];
  subject: string;
  htmlContent: string;
  textContent?: string;
  fromName?: string;
}

interface SendTenantEmailBody {
  tenantIds?: string[];
  subject: string;
  htmlContent: string;
  textContent?: string;
  fromName?: string;
}

interface SendSingleEmailBody {
  to: string;
  subject: string;
  htmlContent: string;
  textContent?: string;
  fromName?: string;
}

export async function emailRoutes(fastify: FastifyInstance) {
  // POST /contacts/send-email - Send bulk emails to contacts
  fastify.post<{ Body: SendBulkEmailBody }>(
    '/contacts/send-email',
    {
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
              errors: { type: 'array', items: { type: 'object' } },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const { contactIds, contacts: providedContacts, subject, htmlContent, textContent, fromName } = request.body;

      if (!contactIds && !providedContacts) {
        return reply.status(400).send({
          error: 'Either contactIds or contacts array is required',
        });
      }

      let contactList: ContactEmail[] = [];

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

      // Prepare emails with personalization
      const emails = contactList.map((contact) => {
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
        };
      });

      // Send emails in batches (Resend supports up to 100 per batch)
      const results = [];
      const batchSize = 100;

      for (let i = 0; i < emails.length; i += batchSize) {
        const batch = emails.slice(i, i + batchSize);
        try {
          const batchResult = await resend.batch.send(batch);
          results.push(batchResult);
        } catch (error) {
          results.push({ error, data: null });
        }
      }

      // Count successes and failures
      let successCount = 0;
      const errors: unknown[] = [];

      results.forEach((r) => {
        if (r.data) {
          successCount += Array.isArray(r.data) ? r.data.length : 1;
        }
        if (r.error) {
          errors.push(r.error);
        }
      });

      return reply.send({
        success: errors.length === 0,
        message: `Sent ${successCount} of ${contactList.length} emails successfully`,
        totalContacts: contactList.length,
        successCount,
        failedCount: contactList.length - successCount,
        errors: errors.length > 0 ? errors : undefined,
      });
    }
  );

  // POST /tenants/send-email - Send emails to tenant admins (sysadmin only)
  fastify.post<{ Body: SendTenantEmailBody }>(
    '/tenants/send-email',
    {
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
              errors: { type: 'array', items: { type: 'object' } },
            },
          },
        },
      },
    },
    async (request, reply) => {
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
          email: true,
          firstName: true,
          lastName: true,
          tenant: {
            select: {
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

      // Prepare emails with personalization
      const emails = tenantAdmins.map((admin: { email: string; firstName: string | null; lastName: string | null; tenant: { name: string } | null }) => {
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
        };
      });

      // Send emails in batches
      const results = [];
      const batchSize = 100;

      for (let i = 0; i < emails.length; i += batchSize) {
        const batch = emails.slice(i, i + batchSize);
        try {
          const batchResult = await resend.batch.send(batch);
          results.push(batchResult);
        } catch (error) {
          results.push({ error, data: null });
        }
      }

      // Count successes and failures
      let successCount = 0;
      const errors: unknown[] = [];

      results.forEach((r) => {
        if (r.data) {
          successCount += Array.isArray(r.data) ? r.data.length : 1;
        }
        if (r.error) {
          errors.push(r.error);
        }
      });

      return reply.send({
        success: errors.length === 0,
        message: `Sent ${successCount} of ${tenantAdmins.length} emails successfully`,
        totalTenants: tenantAdmins.length,
        successCount,
        failedCount: tenantAdmins.length - successCount,
        errors: errors.length > 0 ? errors : undefined,
      });
    }
  );

  // POST /emails/send - Send a single email
  fastify.post<{ Body: SendSingleEmailBody }>(
    '/emails/send',
    {
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
            },
          },
        },
      },
    },
    async (request, reply) => {
      const { to, subject, htmlContent, textContent, fromName } = request.body;

      const fromAddress = fromName
        ? `${fromName} <${FROM_EMAIL}>`
        : FROM_EMAIL;

      try {
        const result = await resend.emails.send({
          from: fromAddress,
          to,
          subject,
          html: htmlContent,
          text: textContent,
        });

        if (result.error) {
          return reply.status(400).send({
            success: false,
            error: result.error,
          });
        }

        return reply.send({
          success: true,
          id: result.data?.id,
        });
      } catch (error) {
        return reply.status(500).send({
          success: false,
          error: String(error),
        });
      }
    }
  );
}
