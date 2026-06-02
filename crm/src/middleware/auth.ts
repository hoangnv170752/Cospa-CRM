import { FastifyRequest, FastifyReply, FastifyInstance } from 'fastify';
import { JwtPayload, hasPermission } from '../services/auth.js';
import { UserRole } from '@prisma/client';

// Extend Fastify types
declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: JwtPayload;
    user: JwtPayload;
  }
}

// Authentication hook - validates JWT token
export async function authenticate(
  request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    await request.jwtVerify();
    request.user = request.user;
  } catch (err) {
    return reply.status(401).send({ error: 'Unauthorized', message: 'Invalid or missing token' });
  }
}

// Role-based access control
// sys_admin always has full access to all resources
export function requireRole(...allowedRoles: UserRole[]) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.user) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    // SysAdmin bypasses all role checks - they have full platform access
    if (request.user.role === 'sys_admin') {
      return;
    }

    if (!allowedRoles.includes(request.user.role)) {
      return reply.status(403).send({
        error: 'Forbidden',
        message: `Required roles: ${allowedRoles.join(', ')}`
      });
    }
  };
}

// Check if user is SysAdmin
export async function requireSysAdmin(
  request: FastifyRequest,
  reply: FastifyReply
) {
  if (!request.user || request.user.role !== 'sys_admin') {
    return reply.status(403).send({
      error: 'Forbidden',
      message: 'SysAdmin access required'
    });
  }
}

// Check if user is at least Tenant Admin
export async function requireTenantAdmin(
  request: FastifyRequest,
  reply: FastifyReply
) {
  if (!request.user) {
    return reply.status(401).send({ error: 'Unauthorized' });
  }

  if (!['sys_admin', 'tenant_admin'].includes(request.user.role)) {
    return reply.status(403).send({
      error: 'Forbidden',
      message: 'Tenant Admin access required'
    });
  }
}

// Resource-based permission check
export function requirePermission(resource: string, action: string) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.user) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    const allowed = await hasPermission(request.user.userId, resource, action);
    if (!allowed) {
      return reply.status(403).send({
        error: 'Forbidden',
        message: `Permission denied: ${action} on ${resource}`
      });
    }
  };
}

// Tenant scope filter - adds tenantId filter to queries
export function getTenantScope(request: FastifyRequest) {
  if (!request.user) {
    return null;
  }

  // SysAdmin can see all tenants
  if (request.user.role === 'sys_admin') {
    return null; // No filter
  }

  // Other users are scoped to their tenant
  return request.user.tenantId;
}

// Build Prisma where clause with tenant scope
export function withTenantScope(
  request: FastifyRequest,
  where: Record<string, unknown> = {}
): Record<string, unknown> {
  const tenantId = getTenantScope(request);

  if (tenantId) {
    return { ...where, tenantId };
  }

  return where;
}

// Company scope for customer users
export function getCompanyScope(request: FastifyRequest) {
  if (!request.user) {
    return null;
  }

  // Customer users are scoped to their company
  if (request.user.role === 'customer_user') {
    return request.user.companyId;
  }

  return null;
}

// Build Prisma where clause with company scope
export function withCompanyScope(
  request: FastifyRequest,
  where: Record<string, unknown> = {}
): Record<string, unknown> {
  const companyId = getCompanyScope(request);

  if (companyId) {
    return { ...where, companyId };
  }

  return where;
}

// Optional authentication - doesn't fail if no token, but sets user if valid
export async function optionalAuth(
  request: FastifyRequest,
  _reply: FastifyReply
) {
  try {
    await request.jwtVerify();
  } catch {
    // Token is invalid or missing, but we don't fail
  }
}

// Register JWT plugin with Fastify
export async function registerJwt(fastify: FastifyInstance) {
  const jwtSecret = process.env.JWT_SECRET;

  if (!jwtSecret) {
    throw new Error('JWT_SECRET environment variable is required');
  }

  await fastify.register(import('@fastify/jwt'), {
    secret: jwtSecret,
    sign: {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    },
  });

  // Note: @fastify/jwt already decorates request with 'user'
}
