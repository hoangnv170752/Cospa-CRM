import { User, UserRole, Tenant } from '@prisma/client';
export declare function hashPassword(password: string): Promise<string>;
export declare function verifyPassword(password: string, hash: string): Promise<boolean>;
interface ThingsBoardUser {
    id: {
        entityType: string;
        id: string;
    };
    email: string;
    firstName: string;
    lastName: string;
    authority: string;
    tenantId?: {
        entityType: string;
        id: string;
    };
    customerId?: {
        entityType: string;
        id: string;
    };
}
export declare function validateThingsBoardToken(token: string): Promise<ThingsBoardUser | null>;
export interface SyncUserResult {
    user: User;
    tenant: Tenant | null;
    isNewUser: boolean;
    isNewTenant: boolean;
}
export declare function syncThingsBoardUser(tbUser: ThingsBoardUser): Promise<SyncUserResult>;
export interface JwtPayload {
    userId: string;
    email: string;
    role: UserRole;
    tenantId: string | null;
    companyId: string | null;
}
export declare function createJwtPayload(user: User): JwtPayload;
export declare function validateSysAdminLogin(email: string, password: string): Promise<User | null>;
export interface LoginResult {
    user: User | null;
    error?: 'invalid_credentials' | 'user_inactive' | 'tenant_suspended' | 'tenant_cancelled';
}
export declare function validateUserLogin(email: string, password: string): Promise<LoginResult>;
export declare function createSysAdmin(email: string, password: string, firstName: string, lastName: string): Promise<User>;
export declare function getUserById(userId: string): Promise<({
    tenant: {
        name: string;
        id: string;
        slug: string;
        domain: string | null;
        thingsboardTenantId: string | null;
        logo: string | null;
        primaryColor: string | null;
        settings: import("@prisma/client/runtime/client").JsonValue | null;
        status: import("@prisma/client").$Enums.TenantStatus;
        stripeCustomerId: string | null;
        createdAt: Date;
        updatedAt: Date;
    } | null;
    company: {
        name: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        phone: string | null;
        tenantId: string | null;
        industry: string | null;
        website: string | null;
        address: string | null;
        size: import("@prisma/client").$Enums.CompanySize | null;
    } | null;
    permissions: {
        id: string;
        createdAt: Date;
        userId: string;
        action: string;
        resource: string;
        conditions: import("@prisma/client/runtime/client").JsonValue | null;
    }[];
} & {
    id: string;
    status: import("@prisma/client").$Enums.UserStatus;
    createdAt: Date;
    updatedAt: Date;
    email: string;
    passwordHash: string | null;
    firstName: string;
    lastName: string;
    phone: string | null;
    avatar: string | null;
    thingsboardUserId: string | null;
    role: import("@prisma/client").$Enums.UserRole;
    emailVerified: boolean;
    twoFactorEnabled: boolean;
    lastLoginAt: Date | null;
    tenantId: string | null;
    companyId: string | null;
}) | null>;
export declare function hasPermission(userId: string, resource: string, action: string): Promise<boolean>;
export {};
//# sourceMappingURL=auth.d.ts.map