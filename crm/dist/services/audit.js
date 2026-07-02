import { prisma } from './prisma.js';
export async function createAuditLog(request, input) {
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
            oldValues: input.oldValues,
            newValues: input.newValues,
            metadata: metadata,
        },
    });
}
// Helper to create audit log without request context (for system actions)
export async function createSystemAuditLog(input) {
    return prisma.auditLog.create({
        data: {
            userId: input.userId || null,
            tenantId: input.tenantId || null,
            action: input.action,
            resource: input.resource,
            resourceId: input.resourceId,
            oldValues: input.oldValues,
            newValues: input.newValues,
            metadata: input.metadata,
        },
    });
}
export async function getAuditLogs(query) {
    const page = query.page || 1;
    const limit = query.limit || 50;
    const skip = (page - 1) * limit;
    const where = {};
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
            where.createdAt.gte = query.startDate;
        }
        if (query.endDate) {
            where.createdAt.lte = query.endDate;
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
//# sourceMappingURL=audit.js.map