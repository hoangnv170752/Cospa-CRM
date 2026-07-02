import { FastifyRequest } from 'fastify';
import { prisma } from './prisma.js';

interface AuditLogInput {
  action: string;
  resource: string;
  resourceId?: string;
  oldValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export async function createAuditLog(
  request: FastifyRequest,
  input: AuditLogInput & { userId?: string; tenantId?: string }
) {
  // Use provided userId/tenantId or fall back to request.user
  const userId = input.userId || request.user?.userId || null;
  const tenantId = input.tenantId || request.user?.tenantId || null;

  // Extract metadata from request
  const metadata = {
    ...input.metadata,
    ip: request.ip,
    userAgent: request.headers['user-agent'],
    method: request.method,
    url: request.url,
  };

  return prisma.auditLog.create({
    data: {
      userId,
      tenantId,
      action: input.action,
      resource: input.resource,
      resourceId: input.resourceId,
      oldValues: input.oldValues as any,
      newValues: input.newValues as any,
      metadata: metadata as any,
    },
  });
}

// Helper to create audit log without request context (for system actions)
export async function createSystemAuditLog(
  input: AuditLogInput & { userId?: string; tenantId?: string }
) {
  return prisma.auditLog.create({
    data: {
      userId: input.userId || null,
      tenantId: input.tenantId || null,
      action: input.action,
      resource: input.resource,
      resourceId: input.resourceId,
      oldValues: input.oldValues as any,
      newValues: input.newValues as any,
      metadata: input.metadata as any,
    },
  });
}

// Get audit logs with filters
export interface AuditLogQuery {
  page?: number;
  limit?: number;
  userId?: string;
  tenantId?: string;
  resource?: string;
  action?: string;
  resourceId?: string;
  startDate?: Date;
  endDate?: Date;
}

export async function getAuditLogs(query: AuditLogQuery) {
  const page = query.page || 1;
  const limit = query.limit || 50;
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {};

  if (query.userId) {
    where.userId = query.userId;
  }

  if (query.tenantId) {
    where.tenantId = query.tenantId;
  }

  if (query.resource) {
    where.resource = query.resource;
  }

  if (query.action) {
    where.action = query.action;
  }

  if (query.resourceId) {
    where.resourceId = query.resourceId;
  }

  if (query.startDate || query.endDate) {
    where.createdAt = {};
    if (query.startDate) {
      (where.createdAt as Record<string, Date>).gte = query.startDate;
    }
    if (query.endDate) {
      (where.createdAt as Record<string, Date>).lte = query.endDate;
    }
  }

  const [data, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true,
          },
        },
        tenant: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    }),
    prisma.auditLog.count({ where }),
  ]);

  return {
    data,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}
