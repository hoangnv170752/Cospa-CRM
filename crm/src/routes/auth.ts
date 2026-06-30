import { FastifyInstance } from 'fastify';
import {
  validateSysAdminLogin,
  validateUserLogin,
  validateThingsBoardToken,
  syncThingsBoardUser,
  createJwtPayload,
  getUserById,
  hashPassword,
} from '../services/auth.js';
import { prisma } from '../services/prisma.js';
import { authenticate } from '../middleware/auth.js';
import { sendWelcomeEmail } from '../services/email.js';

interface AdminLoginBody {
  email: string;
  password: string;
}

interface SyncBody {
  thingsboardToken: string;
}

interface RefreshBody {
  refreshToken?: string;
}

export async function authRoutes(fastify: FastifyInstance) {
  // POST /auth/admin/login - SysAdmin login with email/password
  fastify.post<{ Body: AdminLoginBody }>(
    '/auth/admin/login',
    {
      schema: {
        tags: ['Auth'],
        summary: 'SysAdmin login',
        description: 'Login as SysAdmin with email and password. Returns JWT token.',
        body: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: { type: 'string', format: 'email', description: 'SysAdmin email' },
            password: { type: 'string', minLength: 8, description: 'Password' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              token: { type: 'string' },
              user: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  email: { type: 'string' },
                  firstName: { type: 'string' },
                  lastName: { type: 'string' },
                  role: { type: 'string' },
                },
              },
            },
          },
          401: {
            type: 'object',
            properties: {
              error: { type: 'string' },
              message: { type: 'string' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const { email, password } = request.body;

      const user = await validateSysAdminLogin(email, password);

      if (!user) {
        return reply.status(401).send({
          error: 'Unauthorized',
          message: 'Invalid email or password',
        });
      }

      const payload = createJwtPayload(user);
      const token = fastify.jwt.sign(payload);

      return reply.send({
        token,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
        },
      });
    }
  );

  fastify.post<{ Body: AdminLoginBody }>(
    '/auth/login',
    {
      schema: {
        tags: ['Auth'],
        summary: 'CRM user login',
        description: 'Login with email and password. Works for all CRM users (SysAdmin, Tenant Admin, Tenant User, Customer User).',
        body: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: { type: 'string', format: 'email', description: 'User email' },
            password: { type: 'string', minLength: 8, description: 'Password' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              token: { type: 'string' },
              user: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  email: { type: 'string' },
                  firstName: { type: 'string' },
                  lastName: { type: 'string' },
                  role: { type: 'string' },
                  tenantId: { type: 'string', nullable: true },
                },
              },
            },
          },
          401: {
            type: 'object',
            properties: {
              error: { type: 'string' },
              message: { type: 'string' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const { email, password } = request.body;

      const result = await validateUserLogin(email, password);

      if (!result.user) {
        const errorMessages: Record<string, string> = {
          invalid_credentials: 'Invalid email or password',
          user_inactive: 'Your account is inactive. Please contact support.',
          tenant_suspended: 'Your organization account has been suspended. Please contact support.',
          tenant_cancelled: 'Your organization account has been cancelled.',
        };

        return reply.status(401).send({
          error: 'Unauthorized',
          code: result.error,
          message: errorMessages[result.error || 'invalid_credentials'],
        });
      }

      const payload = createJwtPayload(result.user);
      const token = fastify.jwt.sign(payload);

      return reply.send({
        token,
        user: {
          id: result.user.id,
          email: result.user.email,
          firstName: result.user.firstName,
          lastName: result.user.lastName,
          role: result.user.role,
          tenantId: result.user.tenantId,
        },
      });
    }
  );

  // POST /auth/register - Register a new tenant organization
  fastify.post<{
    Body: {
      organizationName: string;
      firstName: string;
      lastName: string;
      email: string;
      password: string;
    };
  }>(
    '/auth/register',
    {
      schema: {
        tags: ['Auth'],
        summary: 'Register new organization',
        description: 'Register a new tenant organization with an admin user. The tenant starts in pending status until approved by a SysAdmin.',
        body: {
          type: 'object',
          required: ['organizationName', 'firstName', 'lastName', 'email', 'password'],
          properties: {
            organizationName: { type: 'string', minLength: 2, description: 'Organization name' },
            firstName: { type: 'string', minLength: 1, description: 'Admin first name' },
            lastName: { type: 'string', minLength: 1, description: 'Admin last name' },
            email: { type: 'string', format: 'email', description: 'Admin email' },
            password: { type: 'string', minLength: 8, description: 'Password (min 8 chars)' },
          },
        },
        response: {
          201: {
            type: 'object',
            properties: {
              message: { type: 'string' },
              token: { type: 'string' },
              user: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  email: { type: 'string' },
                  firstName: { type: 'string' },
                  lastName: { type: 'string' },
                  role: { type: 'string' },
                  tenantId: { type: 'string' },
                },
              },
              tenant: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  name: { type: 'string' },
                  slug: { type: 'string' },
                },
              },
            },
          },
          409: {
            type: 'object',
            properties: {
              error: { type: 'string' },
              message: { type: 'string' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const { organizationName, firstName, lastName, email, password } = request.body;

      // Check if email is already taken
      const existingUser = await prisma.user.findUnique({ where: { email } });
      if (existingUser) {
        return reply.status(409).send({
          error: 'Conflict',
          message: 'An account with this email already exists',
        });
      }

      // Create slug from organization name
      const slug = organizationName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');

      // Check if slug is taken
      const existingTenant = await prisma.tenant.findUnique({ where: { slug } });
      if (existingTenant) {
        return reply.status(409).send({
          error: 'Conflict',
          message: 'An organization with a similar name already exists',
        });
      }

      // Create tenant
      const tenant = await prisma.tenant.create({
        data: {
          name: organizationName,
          slug,
          status: 'active',
        },
      });

      // Create admin user
      const passwordHash = await hashPassword(password);
      const user = await prisma.user.create({
        data: {
          email,
          passwordHash,
          firstName,
          lastName,
          role: 'tenant_admin',
          tenantId: tenant.id,
          status: 'active',
          emailVerified: true,
        },
      });

      // Generate token so user is logged in immediately
      const payload = createJwtPayload(user);
      const token = fastify.jwt.sign(payload);

      // Send welcome email (non-blocking)
      sendWelcomeEmail({
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        organizationName: tenant.name,
      }).catch((err) => {
        console.error('Failed to send welcome email:', err);
      });

      return reply.status(201).send({
        message: 'Organization registered successfully',
        token,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          tenantId: user.tenantId,
        },
        tenant: {
          id: tenant.id,
          name: tenant.name,
          slug: tenant.slug,
        },
      });
    }
  );

  // POST /auth/sync - Sync ThingsBoard user to CRM
  fastify.post<{ Body: SyncBody }>(
    '/auth/sync',
    {
      schema: {
        tags: ['Auth'],
        summary: 'Sync ThingsBoard user',
        description: 'Validates ThingsBoard token, syncs user to CRM, and returns CRM JWT token.',
        body: {
          type: 'object',
          required: ['thingsboardToken'],
          properties: {
            thingsboardToken: {
              type: 'string',
              description: 'ThingsBoard JWT token',
            },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              token: { type: 'string', description: 'CRM JWT token' },
              user: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  email: { type: 'string' },
                  firstName: { type: 'string' },
                  lastName: { type: 'string' },
                  role: { type: 'string' },
                  tenantId: { type: 'string', nullable: true },
                },
              },
              tenant: {
                type: 'object',
                nullable: true,
                properties: {
                  id: { type: 'string' },
                  name: { type: 'string' },
                  slug: { type: 'string' },
                },
              },
              isNewUser: { type: 'boolean' },
              isNewTenant: { type: 'boolean' },
            },
          },
          401: {
            type: 'object',
            properties: {
              error: { type: 'string' },
              message: { type: 'string' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const { thingsboardToken } = request.body;

      // Validate ThingsBoard token
      const tbUser = await validateThingsBoardToken(thingsboardToken);

      if (!tbUser) {
        return reply.status(401).send({
          error: 'Unauthorized',
          message: 'Invalid ThingsBoard token',
        });
      }

      // Sync user to CRM
      const { user, tenant, isNewUser, isNewTenant } = await syncThingsBoardUser(tbUser);

      // Check tenant status
      if (tenant) {
        if (tenant.status === 'suspended') {
          return reply.status(401).send({
            error: 'Unauthorized',
            code: 'tenant_suspended',
            message: 'Your organization account has been suspended. Please contact support.',
          });
        }
        if (tenant.status === 'cancelled') {
          return reply.status(401).send({
            error: 'Unauthorized',
            code: 'tenant_cancelled',
            message: 'Your organization account has been cancelled.',
          });
        }
      }

      // Check user status
      if (user.status !== 'active') {
        return reply.status(401).send({
          error: 'Unauthorized',
          code: 'user_inactive',
          message: 'Your account is inactive. Please contact support.',
        });
      }

      // Generate CRM JWT token
      const payload = createJwtPayload(user);
      const token = fastify.jwt.sign(payload);

      return reply.send({
        token,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          tenantId: user.tenantId,
        },
        tenant: tenant
          ? {
              id: tenant.id,
              name: tenant.name,
              slug: tenant.slug,
            }
          : null,
        isNewUser,
        isNewTenant,
      });
    }
  );

  // POST /auth/refresh - Refresh JWT token
  fastify.post<{ Body: RefreshBody }>(
    '/auth/refresh',
    {
      preHandler: [authenticate],
      schema: {
        tags: ['Auth'],
        summary: 'Refresh JWT token',
        description: 'Get a new JWT token using the current valid token.',
        security: [{ bearerAuth: [] }],
        response: {
          200: {
            type: 'object',
            properties: {
              token: { type: 'string' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      if (!request.user) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      // Get fresh user data
      const user = await getUserById(request.user.userId);

      if (!user) {
        return reply.status(401).send({
          error: 'Unauthorized',
          message: 'User not found',
        });
      }

      // Generate new token
      const payload = createJwtPayload(user);
      const token = fastify.jwt.sign(payload);

      return reply.send({ token });
    }
  );

  // GET /auth/me - Get current user profile with subscription
  fastify.get(
    '/auth/me',
    {
      preHandler: [authenticate],
      schema: {
        tags: ['Auth'],
        summary: 'Get current user',
        description: 'Get the current authenticated user profile with tenant, permissions, and subscription info.',
        security: [{ bearerAuth: [] }],
        response: {
          200: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              email: { type: 'string' },
              firstName: { type: 'string' },
              lastName: { type: 'string' },
              phone: { type: 'string', nullable: true },
              avatar: { type: 'string', nullable: true },
              role: { type: 'string' },
              status: { type: 'string' },
              tenant: {
                type: 'object',
                nullable: true,
                properties: {
                  id: { type: 'string' },
                  name: { type: 'string' },
                  slug: { type: 'string' },
                  logo: { type: 'string', nullable: true },
                  primaryColor: { type: 'string', nullable: true },
                },
              },
              company: {
                type: 'object',
                nullable: true,
                properties: {
                  id: { type: 'string' },
                  name: { type: 'string' },
                },
              },
              permissions: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    resource: { type: 'string' },
                    action: { type: 'string' },
                  },
                },
              },
              subscription: {
                type: 'object',
                nullable: true,
                properties: {
                  id: { type: 'string' },
                  status: { type: 'string' },
                  billingCycle: { type: 'string' },
                  currentPeriodEnd: { type: 'string', nullable: true },
                  plan: {
                    type: 'object',
                    properties: {
                      id: { type: 'string' },
                      name: { type: 'string' },
                      code: { type: 'string' },
                      description: { type: 'string', nullable: true },
                      monthlyPrice: { type: 'number' },
                      yearlyPrice: { type: 'number' },
                      maxUsers: { type: 'integer', nullable: true },
                      maxDevices: { type: 'integer', nullable: true },
                      maxAssets: { type: 'integer', nullable: true },
                      maxStorageGb: { type: 'number', nullable: true },
                      features: { type: 'array', items: { type: 'string' } },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    async (request, reply) => {
      if (!request.user) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const user = await getUserById(request.user.userId);

      if (!user) {
        return reply.status(404).send({ error: 'User not found' });
      }

      // Get subscription info if user belongs to a tenant
      let subscription = null;
      if (user.tenantId) {
        const sub = await prisma.subscription.findUnique({
          where: { tenantId: user.tenantId },
          include: { plan: true },
        });

        if (sub) {
          subscription = {
            id: sub.id,
            status: sub.status,
            billingCycle: sub.billingCycle,
            currentPeriodEnd: sub.currentPeriodEnd?.toISOString() || null,
            plan: {
              id: sub.plan.id,
              name: sub.plan.name,
              code: sub.plan.code,
              description: sub.plan.description,
              monthlyPrice: sub.plan.monthlyPrice,
              yearlyPrice: sub.plan.yearlyPrice,
              maxUsers: sub.plan.maxUsers,
              maxDevices: sub.plan.maxDevices,
              maxAssets: sub.plan.maxAssets,
              maxStorageGb: sub.plan.maxStorageGb,
              features: sub.plan.features,
            },
          };
        }
      }

      return reply.send({
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        avatar: user.avatar,
        role: user.role,
        status: user.status,
        tenant: user.tenant
          ? {
              id: user.tenant.id,
              name: user.tenant.name,
              slug: user.tenant.slug,
              logo: user.tenant.logo,
              primaryColor: user.tenant.primaryColor,
            }
          : null,
        company: user.company
          ? {
              id: user.company.id,
              name: user.company.name,
            }
          : null,
        permissions: user.permissions.map((p) => ({
          resource: p.resource,
          action: p.action,
        })),
        subscription,
      });
    }
  );

  // PUT /auth/me - Update current user profile
  fastify.put<{
    Body: {
      firstName?: string;
      lastName?: string;
      phone?: string;
      avatar?: string;
      currentPassword?: string;
      newPassword?: string;
    };
  }>(
    '/auth/me',
    {
      preHandler: [authenticate],
      schema: {
        tags: ['Auth'],
        summary: 'Update current user profile',
        description: 'Update the authenticated user profile information. Password change requires current password.',
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          properties: {
            firstName: { type: 'string', minLength: 1 },
            lastName: { type: 'string', minLength: 1 },
            phone: { type: 'string' },
            avatar: { type: 'string' },
            currentPassword: { type: 'string', minLength: 8 },
            newPassword: { type: 'string', minLength: 8 },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              email: { type: 'string' },
              firstName: { type: 'string' },
              lastName: { type: 'string' },
              phone: { type: 'string', nullable: true },
              avatar: { type: 'string', nullable: true },
              role: { type: 'string' },
              updatedAt: { type: 'string' },
            },
          },
          400: {
            type: 'object',
            properties: {
              error: { type: 'string' },
              message: { type: 'string' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      if (!request.user) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const { firstName, lastName, phone, avatar, currentPassword, newPassword } = request.body;

      // Get current user
      const user = await prisma.user.findUnique({
        where: { id: request.user.userId },
      });

      if (!user) {
        return reply.status(404).send({ error: 'User not found' });
      }

      const updateData: Record<string, unknown> = {};

      // Update basic fields if provided
      if (firstName !== undefined) updateData.firstName = firstName;
      if (lastName !== undefined) updateData.lastName = lastName;
      if (phone !== undefined) updateData.phone = phone || null;
      if (avatar !== undefined) updateData.avatar = avatar || null;

      // Handle password change
      if (newPassword) {
        if (!currentPassword) {
          return reply.status(400).send({
            error: 'Bad Request',
            message: 'Current password is required to change password',
          });
        }

        if (!user.passwordHash) {
          return reply.status(400).send({
            error: 'Bad Request',
            message: 'Cannot change password for SSO users',
          });
        }

        // Verify current password
        const { verifyPassword } = await import('../services/auth.js');
        const isValid = await verifyPassword(currentPassword, user.passwordHash);

        if (!isValid) {
          return reply.status(400).send({
            error: 'Bad Request',
            message: 'Current password is incorrect',
          });
        }

        updateData.passwordHash = await hashPassword(newPassword);
      }

      // Update user
      const updatedUser = await prisma.user.update({
        where: { id: request.user.userId },
        data: updateData,
      });

      return reply.send({
        id: updatedUser.id,
        email: updatedUser.email,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        phone: updatedUser.phone,
        avatar: updatedUser.avatar,
        role: updatedUser.role,
        updatedAt: updatedUser.updatedAt.toISOString(),
      });
    }
  );
}
