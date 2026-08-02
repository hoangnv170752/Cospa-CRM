import { FastifyInstance } from 'fastify';
import { prisma } from '../services/prisma.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import * as googleCalendar from '../services/google-calendar.js';

interface CalendarEventBody {
  title: string;
  description?: string;
  location?: string;
  startTime: string;
  endTime: string;
  allDay?: boolean;
  timezone?: string;
  attendees?: { email: string; name?: string }[];
  createMeet?: boolean;
}

interface CalendarEventParams {
  id: string;
}

interface CalendarQuery {
  page?: number;
  limit?: number;
  startDate?: string;
  endDate?: string;
}

interface OAuthCallbackQuery {
  code?: string;
  error?: string;
  state?: string;
}

export async function calendarRoutes(fastify: FastifyInstance) {
  // =====================
  // Google OAuth Routes
  // =====================

  // GET /calendar/google/auth - Start Google OAuth flow
  fastify.get(
    '/calendar/google/auth',
    {
      preHandler: [authenticate, requireRole('tenant_user', 'tenant_admin')],
      schema: {
        tags: ['Calendar'],
        summary: 'Get Google Calendar authorization URL',
        description: 'Returns the URL to redirect users to for Google Calendar authorization. Admin users cannot use this feature.',
        security: [{ bearerAuth: [] }],
        response: {
          200: {
            type: 'object',
            properties: {
              authUrl: { type: 'string' },
            },
          },
          403: {
            type: 'object',
            properties: {
              error: { type: 'string' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      // Block admin users
      if (request.user?.role === 'sys_admin') {
        return reply.status(403).send({ error: 'Admin users cannot connect Google Calendar' });
      }

      const state = request.user?.userId;
      const authUrl = googleCalendar.getAuthUrl(state);

      return reply.send({ authUrl });
    }
  );

  // GET /calendar/google/callback - OAuth callback
  fastify.get<{ Querystring: OAuthCallbackQuery }>(
    '/calendar/google/callback',
    {
      schema: {
        tags: ['Calendar'],
        summary: 'Google Calendar OAuth callback',
        description: 'Handles the OAuth callback from Google. Redirects to frontend with success/error status.',
        querystring: {
          type: 'object',
          properties: {
            code: { type: 'string' },
            error: { type: 'string' },
            state: { type: 'string' },
          },
        },
      },
    },
    async (request, reply) => {
      const { code, error, state } = request.query;
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

      if (error) {
        return reply.redirect(`${frontendUrl}/crm/settings?calendar_error=${encodeURIComponent(error)}`);
      }

      if (!code || !state) {
        return reply.redirect(`${frontendUrl}/crm/settings?calendar_error=missing_code_or_state`);
      }

      try {
        // state contains the userId
        const userId = state;

        // Verify user exists and is not admin
        const user = await prisma.user.findUnique({
          where: { id: userId },
        });

        if (!user) {
          return reply.redirect(`${frontendUrl}/crm/settings?calendar_error=user_not_found`);
        }

        if (user.role === 'sys_admin') {
          return reply.redirect(`${frontendUrl}/crm/settings?calendar_error=admin_not_allowed`);
        }

        // Exchange code for tokens
        const tokens = await googleCalendar.exchangeCodeForTokens(code);

        // Save tokens
        await googleCalendar.saveTokens(userId, tokens);

        // Sync initial events
        await googleCalendar.syncEventsFromGoogle(userId, user.tenantId);

        return reply.redirect(`${frontendUrl}/crm/settings?calendar_connected=true`);
      } catch (err) {
        console.error('Google Calendar OAuth error:', err);
        return reply.redirect(`${frontendUrl}/crm/settings?calendar_error=oauth_failed`);
      }
    }
  );

  // GET /calendar/status - Check Google Calendar connection status
  fastify.get(
    '/calendar/status',
    {
      preHandler: [authenticate, requireRole('tenant_user', 'tenant_admin')],
      schema: {
        tags: ['Calendar'],
        summary: 'Check Google Calendar connection status',
        security: [{ bearerAuth: [] }],
        response: {
          200: {
            type: 'object',
            properties: {
              connected: { type: 'boolean' },
              lastSyncedAt: { type: 'string', format: 'date-time', nullable: true },
            },
          },
        },
      },
    },
    async (request, reply) => {
      if (!request.user?.userId) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const connected = await googleCalendar.isCalendarConnected(request.user.userId);

      let lastSyncedAt = null;
      if (connected) {
        const lastEvent = await prisma.calendarEvent.findFirst({
          where: { userId: request.user.userId, syncedAt: { not: null } },
          orderBy: { syncedAt: 'desc' },
          select: { syncedAt: true },
        });
        lastSyncedAt = lastEvent?.syncedAt;
      }

      return reply.send({ connected, lastSyncedAt });
    }
  );

  // POST /calendar/google/disconnect - Disconnect Google Calendar
  fastify.post(
    '/calendar/google/disconnect',
    {
      preHandler: [authenticate, requireRole('tenant_user', 'tenant_admin')],
      schema: {
        tags: ['Calendar'],
        summary: 'Disconnect Google Calendar',
        security: [{ bearerAuth: [] }],
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      if (!request.user?.userId) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      await googleCalendar.disconnectCalendar(request.user.userId);

      return reply.send({ success: true, message: 'Google Calendar disconnected' });
    }
  );

  // POST /calendar/sync - Sync events from Google Calendar
  fastify.post(
    '/calendar/sync',
    {
      preHandler: [authenticate, requireRole('tenant_user', 'tenant_admin')],
      schema: {
        tags: ['Calendar'],
        summary: 'Sync events from Google Calendar',
        security: [{ bearerAuth: [] }],
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              syncedCount: { type: 'integer' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      if (!request.user?.userId) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const connected = await googleCalendar.isCalendarConnected(request.user.userId);
      if (!connected) {
        return reply.status(400).send({ error: 'Google Calendar not connected' });
      }

      const syncedCount = await googleCalendar.syncEventsFromGoogle(
        request.user.userId,
        request.user.tenantId || null
      );

      return reply.send({ success: true, syncedCount });
    }
  );

  // =====================
  // Calendar Event CRUD Routes
  // =====================

  // GET /calendar/events - List events
  fastify.get<{ Querystring: CalendarQuery }>(
    '/calendar/events',
    {
      preHandler: [authenticate, requireRole('tenant_user', 'tenant_admin')],
      schema: {
        tags: ['Calendar'],
        summary: 'List calendar events',
        security: [{ bearerAuth: [] }],
        querystring: {
          type: 'object',
          properties: {
            page: { type: 'integer', default: 1 },
            limit: { type: 'integer', default: 50 },
            startDate: { type: 'string', format: 'date-time' },
            endDate: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
    async (request, reply) => {
      if (!request.user?.userId) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const { page, limit, startDate, endDate } = request.query;

      const result = await googleCalendar.getEvents(request.user.userId, {
        page: Number(page) || 1,
        limit: Number(limit) || 50,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
      });

      return reply.send(result);
    }
  );

  // GET /calendar/events/:id - Get single event
  fastify.get<{ Params: CalendarEventParams }>(
    '/calendar/events/:id',
    {
      preHandler: [authenticate, requireRole('tenant_user', 'tenant_admin')],
      schema: {
        tags: ['Calendar'],
        summary: 'Get calendar event by ID',
        security: [{ bearerAuth: [] }],
      },
    },
    async (request, reply) => {
      if (!request.user?.userId) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const event = await prisma.calendarEvent.findFirst({
        where: { id: request.params.id, userId: request.user.userId },
      });

      if (!event) {
        return reply.status(404).send({ error: 'Event not found' });
      }

      return reply.send(event);
    }
  );

  // POST /calendar/events - Create event
  fastify.post<{ Body: CalendarEventBody }>(
    '/calendar/events',
    {
      preHandler: [authenticate, requireRole('tenant_user', 'tenant_admin')],
      schema: {
        tags: ['Calendar'],
        summary: 'Create calendar event',
        description: 'Creates an event locally and syncs to Google Calendar if connected.',
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          required: ['title', 'startTime', 'endTime'],
          properties: {
            title: { type: 'string' },
            description: { type: 'string' },
            location: { type: 'string' },
            startTime: { type: 'string', format: 'date-time' },
            endTime: { type: 'string', format: 'date-time' },
            allDay: { type: 'boolean', default: false },
            timezone: { type: 'string', default: 'UTC' },
            attendees: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  email: { type: 'string' },
                  name: { type: 'string' },
                },
              },
            },
            createMeet: { type: 'boolean', default: false },
          },
        },
      },
    },
    async (request, reply) => {
      if (!request.user?.userId) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const { title, description, location, startTime, endTime, allDay, timezone, attendees, createMeet } =
        request.body;

      if (!title || !startTime || !endTime) {
        return reply.status(400).send({ error: 'title, startTime, and endTime are required' });
      }

      const result = await googleCalendar.createEvent(
        request.user.userId,
        request.user.tenantId || null,
        {
          title,
          description,
          location,
          startTime: new Date(startTime),
          endTime: new Date(endTime),
          allDay,
          timezone,
          attendees,
          createMeet,
        }
      );

      return reply.status(201).send(result);
    }
  );

  // PUT /calendar/events/:id - Update event
  fastify.put<{ Params: CalendarEventParams; Body: Partial<CalendarEventBody> }>(
    '/calendar/events/:id',
    {
      preHandler: [authenticate, requireRole('tenant_user', 'tenant_admin')],
      schema: {
        tags: ['Calendar'],
        summary: 'Update calendar event',
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            description: { type: 'string' },
            location: { type: 'string' },
            startTime: { type: 'string', format: 'date-time' },
            endTime: { type: 'string', format: 'date-time' },
            allDay: { type: 'boolean' },
            timezone: { type: 'string' },
            attendees: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  email: { type: 'string' },
                  name: { type: 'string' },
                },
              },
            },
          },
        },
      },
    },
    async (request, reply) => {
      if (!request.user?.userId) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const { title, description, location, startTime, endTime, allDay, timezone, attendees } = request.body;

      try {
        const result = await googleCalendar.updateEvent(request.user.userId, request.params.id, {
          title,
          description,
          location,
          startTime: startTime ? new Date(startTime) : undefined,
          endTime: endTime ? new Date(endTime) : undefined,
          allDay,
          timezone,
          attendees,
        });

        return reply.send(result);
      } catch (error) {
        if (error instanceof Error && error.message === 'Event not found') {
          return reply.status(404).send({ error: 'Event not found' });
        }
        throw error;
      }
    }
  );

  // DELETE /calendar/events/:id - Delete event
  fastify.delete<{ Params: CalendarEventParams }>(
    '/calendar/events/:id',
    {
      preHandler: [authenticate, requireRole('tenant_user', 'tenant_admin')],
      schema: {
        tags: ['Calendar'],
        summary: 'Delete calendar event',
        security: [{ bearerAuth: [] }],
      },
    },
    async (request, reply) => {
      if (!request.user?.userId) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      try {
        await googleCalendar.deleteEvent(request.user.userId, request.params.id);
        return reply.status(204).send();
      } catch (error) {
        if (error instanceof Error && error.message === 'Event not found') {
          return reply.status(404).send({ error: 'Event not found' });
        }
        throw error;
      }
    }
  );
}
