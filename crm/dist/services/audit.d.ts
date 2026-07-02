import { FastifyRequest } from 'fastify';
interface AuditLogInput {
    action: string;
    resource: string;
    resourceId?: string;
    oldValues?: Record<string, unknown>;
    newValues?: Record<string, unknown>;
    metadata?: Record<string, unknown>;
}
export declare function createAuditLog(request: FastifyRequest, input: AuditLogInput & {
    userId?: string;
    tenantId?: string;
}): Promise<{
    id: string;
    createdAt: Date;
    tenantId: string | null;
    userId: string | null;
    action: string;
    resource: string;
    resourceId: string | null;
    oldValues: import("@prisma/client/runtime/client").JsonValue | null;
    newValues: import("@prisma/client/runtime/client").JsonValue | null;
    metadata: import("@prisma/client/runtime/client").JsonValue | null;
}>;
export declare function createSystemAuditLog(input: AuditLogInput & {
    userId?: string;
    tenantId?: string;
}): Promise<{
    id: string;
    createdAt: Date;
    tenantId: string | null;
    userId: string | null;
    action: string;
    resource: string;
    resourceId: string | null;
    oldValues: import("@prisma/client/runtime/client").JsonValue | null;
    newValues: import("@prisma/client/runtime/client").JsonValue | null;
    metadata: import("@prisma/client/runtime/client").JsonValue | null;
}>;
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
export declare function getAuditLogs(query: AuditLogQuery): Promise<{
    data: ({
        tenant: {
            name: string;
            id: string;
            slug: string;
        } | null;
        user: {
            id: string;
            email: string;
            firstName: string;
            lastName: string;
            role: import("@prisma/client").$Enums.UserRole;
        } | null;
    } & {
        id: string;
        createdAt: Date;
        tenantId: string | null;
        userId: string | null;
        action: string;
        resource: string;
        resourceId: string | null;
        oldValues: import("@prisma/client/runtime/client").JsonValue | null;
        newValues: import("@prisma/client/runtime/client").JsonValue | null;
        metadata: import("@prisma/client/runtime/client").JsonValue | null;
    })[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}>;
export {};
//# sourceMappingURL=audit.d.ts.map