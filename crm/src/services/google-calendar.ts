import { google, calendar_v3 } from 'googleapis';
import type { Credentials } from 'google-auth-library';
import { Prisma } from '@prisma/client';
import { prisma } from './prisma.js';

// Google OAuth2 configuration
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_CALENDAR_REDIRECT_URI
);

// Scopes required for Google Calendar access
const SCOPES = [
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/calendar.events',
];

/**
 * Generate Google OAuth authorization URL
 */
export function getAuthUrl(state?: string): string {
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent', // Force consent to always get refresh token
    state,
  });
}

/**
 * Exchange authorization code for tokens
 */
export async function exchangeCodeForTokens(code: string): Promise<Credentials> {
  const { tokens } = await oauth2Client.getToken(code);
  return tokens;
}

/**
 * Save or update Google Calendar tokens for a user
 */
export async function saveTokens(
  userId: string,
  tokens: {
    access_token?: string | null;
    refresh_token?: string | null;
    token_type?: string | null;
    scope?: string | null;
    expiry_date?: number | null;
  }
) {
  if (!tokens.access_token || !tokens.refresh_token) {
    throw new Error('Missing required tokens');
  }

  const expiresAt = tokens.expiry_date
    ? new Date(tokens.expiry_date)
    : new Date(Date.now() + 3600 * 1000); // Default 1 hour

  return prisma.googleCalendarToken.upsert({
    where: { userId },
    create: {
      userId,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      tokenType: tokens.token_type || 'Bearer',
      scope: tokens.scope,
      expiresAt,
    },
    update: {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      tokenType: tokens.token_type || 'Bearer',
      scope: tokens.scope,
      expiresAt,
    },
  });
}

/**
 * Get authenticated OAuth2 client for a user
 */
export async function getAuthenticatedClient(userId: string) {
  const tokenRecord = await prisma.googleCalendarToken.findUnique({
    where: { userId },
  });

  if (!tokenRecord) {
    throw new Error('User has not connected Google Calendar');
  }

  const client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_CALENDAR_REDIRECT_URI
  );

  client.setCredentials({
    access_token: tokenRecord.accessToken,
    refresh_token: tokenRecord.refreshToken,
    token_type: tokenRecord.tokenType,
    expiry_date: tokenRecord.expiresAt.getTime(),
  });

  // Check if token is expired and refresh if needed
  if (tokenRecord.expiresAt < new Date()) {
    const { credentials } = await client.refreshAccessToken();

    // Update stored tokens
    await prisma.googleCalendarToken.update({
      where: { userId },
      data: {
        accessToken: credentials.access_token!,
        expiresAt: new Date(credentials.expiry_date!),
      },
    });

    client.setCredentials(credentials);
  }

  return client;
}

/**
 * Get Google Calendar API instance for a user
 */
export async function getCalendarApi(userId: string): Promise<calendar_v3.Calendar> {
  const auth = await getAuthenticatedClient(userId);
  return google.calendar({ version: 'v3', auth });
}

/**
 * Check if user has connected Google Calendar
 */
export async function isCalendarConnected(userId: string): Promise<boolean> {
  const token = await prisma.googleCalendarToken.findUnique({
    where: { userId },
  });
  return !!token;
}

/**
 * Disconnect Google Calendar for a user
 */
export async function disconnectCalendar(userId: string): Promise<void> {
  // Revoke tokens if possible
  const tokenRecord = await prisma.googleCalendarToken.findUnique({
    where: { userId },
  });

  if (tokenRecord) {
    try {
      await oauth2Client.revokeToken(tokenRecord.accessToken);
    } catch {
      // Ignore revoke errors
    }

    await prisma.googleCalendarToken.delete({
      where: { userId },
    });
  }

  // Also delete all synced events for this user
  await prisma.calendarEvent.deleteMany({
    where: { userId, googleEventId: { not: null } },
  });
}

/**
 * Fetch events from Google Calendar and sync to database
 */
export async function syncEventsFromGoogle(
  userId: string,
  tenantId: string | null,
  options: {
    timeMin?: Date;
    timeMax?: Date;
    maxResults?: number;
  } = {}
): Promise<number> {
  const calendar = await getCalendarApi(userId);

  const timeMin = options.timeMin || new Date();
  const timeMax = options.timeMax || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

  const response = await calendar.events.list({
    calendarId: 'primary',
    timeMin: timeMin.toISOString(),
    timeMax: timeMax.toISOString(),
    maxResults: options.maxResults || 250,
    singleEvents: true,
    orderBy: 'startTime',
  });

  const events = response.data.items || [];
  let syncedCount = 0;

  for (const event of events) {
    if (!event.id || !event.summary) continue;

    const startTime = event.start?.dateTime
      ? new Date(event.start.dateTime)
      : event.start?.date
      ? new Date(event.start.date)
      : null;

    const endTime = event.end?.dateTime
      ? new Date(event.end.dateTime)
      : event.end?.date
      ? new Date(event.end.date)
      : null;

    if (!startTime || !endTime) continue;

    const allDay = !event.start?.dateTime;

    await prisma.calendarEvent.upsert({
      where: {
        userId_googleEventId: {
          userId,
          googleEventId: event.id,
        },
      },
      create: {
        userId,
        tenantId,
        googleEventId: event.id,
        title: event.summary,
        description: event.description || null,
        location: event.location || null,
        startTime,
        endTime,
        allDay,
        timezone: event.start?.timeZone || 'UTC',
        status: mapGoogleStatus(event.status),
        visibility: mapGoogleVisibility(event.visibility),
        meetLink: event.hangoutLink || null,
        attendees: event.attendees
          ? JSON.stringify(event.attendees.map((a) => ({ email: a.email, name: a.displayName })))
          : Prisma.JsonNull,
        syncedAt: new Date(),
      },
      update: {
        title: event.summary,
        description: event.description || null,
        location: event.location || null,
        startTime,
        endTime,
        allDay,
        timezone: event.start?.timeZone || 'UTC',
        status: mapGoogleStatus(event.status),
        visibility: mapGoogleVisibility(event.visibility),
        meetLink: event.hangoutLink || null,
        attendees: event.attendees
          ? JSON.stringify(event.attendees.map((a) => ({ email: a.email, name: a.displayName })))
          : Prisma.JsonNull,
        syncedAt: new Date(),
      },
    });

    syncedCount++;
  }

  return syncedCount;
}

/**
 * Create event in Google Calendar and save to database
 */
export async function createEvent(
  userId: string,
  tenantId: string | null,
  eventData: {
    title: string;
    description?: string;
    location?: string;
    startTime: Date;
    endTime: Date;
    allDay?: boolean;
    timezone?: string;
    attendees?: { email: string; name?: string }[];
    createMeet?: boolean;
  }
): Promise<{ localEvent: unknown; googleEvent?: calendar_v3.Schema$Event }> {
  const isConnected = await isCalendarConnected(userId);

  // Create local event first
  const localEvent = await prisma.calendarEvent.create({
    data: {
      userId,
      tenantId,
      title: eventData.title,
      description: eventData.description,
      location: eventData.location,
      startTime: eventData.startTime,
      endTime: eventData.endTime,
      allDay: eventData.allDay || false,
      timezone: eventData.timezone || 'UTC',
      attendees: eventData.attendees ? JSON.stringify(eventData.attendees) : Prisma.JsonNull,
    },
  });

  // If connected to Google Calendar, create there too
  if (isConnected) {
    try {
      const calendar = await getCalendarApi(userId);

      const googleEvent: calendar_v3.Schema$Event = {
        summary: eventData.title,
        description: eventData.description,
        location: eventData.location,
        start: eventData.allDay
          ? { date: eventData.startTime.toISOString().split('T')[0] }
          : { dateTime: eventData.startTime.toISOString(), timeZone: eventData.timezone },
        end: eventData.allDay
          ? { date: eventData.endTime.toISOString().split('T')[0] }
          : { dateTime: eventData.endTime.toISOString(), timeZone: eventData.timezone },
        attendees: eventData.attendees?.map((a) => ({ email: a.email, displayName: a.name })),
      };

      // Add Google Meet if requested
      if (eventData.createMeet) {
        googleEvent.conferenceData = {
          createRequest: {
            requestId: localEvent.id,
            conferenceSolutionKey: { type: 'hangoutsMeet' },
          },
        };
      }

      const response = await calendar.events.insert({
        calendarId: 'primary',
        requestBody: googleEvent,
        conferenceDataVersion: eventData.createMeet ? 1 : 0,
      });

      // Update local event with Google Event ID
      await prisma.calendarEvent.update({
        where: { id: localEvent.id },
        data: {
          googleEventId: response.data.id,
          meetLink: response.data.hangoutLink,
          syncedAt: new Date(),
        },
      });

      return { localEvent, googleEvent: response.data };
    } catch (error) {
      console.error('Failed to create Google Calendar event:', error);
      // Return local event even if Google sync fails
      return { localEvent };
    }
  }

  return { localEvent };
}

/**
 * Update event in both local database and Google Calendar
 */
export async function updateEvent(
  userId: string,
  eventId: string,
  eventData: {
    title?: string;
    description?: string;
    location?: string;
    startTime?: Date;
    endTime?: Date;
    allDay?: boolean;
    timezone?: string;
    attendees?: { email: string; name?: string }[];
  }
): Promise<{ localEvent: unknown; googleEvent?: calendar_v3.Schema$Event }> {
  // Get existing event
  const existingEvent = await prisma.calendarEvent.findFirst({
    where: { id: eventId, userId },
  });

  if (!existingEvent) {
    throw new Error('Event not found');
  }

  // Update local event
  const localEvent = await prisma.calendarEvent.update({
    where: { id: eventId },
    data: {
      title: eventData.title,
      description: eventData.description,
      location: eventData.location,
      startTime: eventData.startTime,
      endTime: eventData.endTime,
      allDay: eventData.allDay,
      timezone: eventData.timezone,
      attendees: eventData.attendees ? JSON.stringify(eventData.attendees) : undefined,
    },
  });

  // If synced with Google, update there too
  if (existingEvent.googleEventId) {
    try {
      const calendar = await getCalendarApi(userId);

      const googleEvent: calendar_v3.Schema$Event = {};

      if (eventData.title) googleEvent.summary = eventData.title;
      if (eventData.description !== undefined) googleEvent.description = eventData.description;
      if (eventData.location !== undefined) googleEvent.location = eventData.location;

      if (eventData.startTime) {
        googleEvent.start = eventData.allDay
          ? { date: eventData.startTime.toISOString().split('T')[0] }
          : { dateTime: eventData.startTime.toISOString(), timeZone: eventData.timezone };
      }

      if (eventData.endTime) {
        googleEvent.end = eventData.allDay
          ? { date: eventData.endTime.toISOString().split('T')[0] }
          : { dateTime: eventData.endTime.toISOString(), timeZone: eventData.timezone };
      }

      if (eventData.attendees) {
        googleEvent.attendees = eventData.attendees.map((a) => ({
          email: a.email,
          displayName: a.name,
        }));
      }

      const response = await calendar.events.patch({
        calendarId: 'primary',
        eventId: existingEvent.googleEventId,
        requestBody: googleEvent,
      });

      // Update sync timestamp
      await prisma.calendarEvent.update({
        where: { id: eventId },
        data: { syncedAt: new Date() },
      });

      return { localEvent, googleEvent: response.data };
    } catch (error) {
      console.error('Failed to update Google Calendar event:', error);
    }
  }

  return { localEvent };
}

/**
 * Delete event from both local database and Google Calendar
 */
export async function deleteEvent(userId: string, eventId: string): Promise<void> {
  const event = await prisma.calendarEvent.findFirst({
    where: { id: eventId, userId },
  });

  if (!event) {
    throw new Error('Event not found');
  }

  // Delete from Google Calendar if synced
  if (event.googleEventId) {
    try {
      const calendar = await getCalendarApi(userId);
      await calendar.events.delete({
        calendarId: 'primary',
        eventId: event.googleEventId,
      });
    } catch (error) {
      console.error('Failed to delete Google Calendar event:', error);
    }
  }

  // Delete from local database
  await prisma.calendarEvent.delete({
    where: { id: eventId },
  });
}

/**
 * Get events for a user
 */
export async function getEvents(
  userId: string,
  options: {
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    page?: number;
  } = {}
) {
  const { startDate, endDate, limit = 50, page = 1 } = options;
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = { userId };

  if (startDate || endDate) {
    where.startTime = {};
    if (startDate) (where.startTime as Record<string, Date>).gte = startDate;
    if (endDate) (where.startTime as Record<string, Date>).lte = endDate;
  }

  const [data, total] = await Promise.all([
    prisma.calendarEvent.findMany({
      where,
      skip,
      take: limit,
      orderBy: { startTime: 'asc' },
    }),
    prisma.calendarEvent.count({ where }),
  ]);

  return {
    data,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

// Helper functions to map Google Calendar statuses
function mapGoogleStatus(status?: string | null): 'confirmed' | 'tentative' | 'cancelled' {
  switch (status) {
    case 'tentative':
      return 'tentative';
    case 'cancelled':
      return 'cancelled';
    default:
      return 'confirmed';
  }
}

function mapGoogleVisibility(visibility?: string | null): 'default' | 'public' | 'private' | 'confidential' {
  switch (visibility) {
    case 'public':
      return 'public';
    case 'private':
      return 'private';
    case 'confidential':
      return 'confidential';
    default:
      return 'default';
  }
}
