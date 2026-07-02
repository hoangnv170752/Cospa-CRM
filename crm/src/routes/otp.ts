import { FastifyInstance } from 'fastify';
import { prisma } from '../services/prisma.js';
import { createOtpCode, verifyOtp, isOtpRateLimited } from '../services/otp.js';
import { sendOtpEmail } from '../services/email.js';
import { createJwtPayload } from '../services/auth.js';
import { createAuditLog } from '../services/audit.js';
import { OtpType } from '@prisma/client';

interface RequestOtpBody {
  email: string;
  type: 'login' | 'two_factor';
}

interface VerifyOtpBody {
  email: string;
  code: string;
  type: 'login' | 'two_factor';
}

export async function otpRoutes(fastify: FastifyInstance) {
  // POST /auth/otp/request - Request OTP code
  fastify.post<{ Body: RequestOtpBody }>(
    '/auth/otp/request',
    {
      schema: {
        tags: ['Auth'],
        summary: 'Request OTP code',
        description: 'Request a one-time password code to be sent via email. Used for passwordless login or two-factor authentication.',
        body: {
          type: 'object',
          required: ['email', 'type'],
          properties: {
            email: { type: 'string', format: 'email', description: 'User email address' },
            type: {
              type: 'string',
              enum: ['login', 'two_factor'],
              description: 'OTP type: login for passwordless login, two_factor for 2FA',
            },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              message: { type: 'string' },
              expiresIn: { type: 'integer', description: 'OTP expiration time in seconds' },
            },
          },
          400: {
            type: 'object',
            properties: {
              error: { type: 'string' },
              message: { type: 'string' },
            },
          },
          404: {
            type: 'object',
            properties: {
              error: { type: 'string' },
              message: { type: 'string' },
            },
          },
          429: {
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
      const { email, type } = request.body;

      // Find user by email
      const user = await prisma.user.findUnique({
        where: { email },
        include: { tenant: true },
      });

      if (!user) {
        return reply.status(404).send({
          error: 'Not Found',
          message: 'No account found with this email address',
        });
      }

      // Check user status
      if (user.status !== 'active') {
        return reply.status(400).send({
          error: 'Bad Request',
          message: 'Your account is not active. Please contact support.',
        });
      }

      // Check tenant status if applicable
      if (user.tenant) {
        if (user.tenant.status === 'suspended') {
          return reply.status(400).send({
            error: 'Bad Request',
            message: 'Your organization account has been suspended.',
          });
        }
        if (user.tenant.status === 'cancelled') {
          return reply.status(400).send({
            error: 'Bad Request',
            message: 'Your organization account has been cancelled.',
          });
        }
      }

      // Check rate limiting
      const isLimited = await isOtpRateLimited(user.id);
      if (isLimited) {
        return reply.status(429).send({
          error: 'Too Many Requests',
          message: 'Too many OTP requests. Please wait a minute before trying again.',
        });
      }

      // Map type to OtpType enum
      const otpType: OtpType = type === 'login' ? 'login' : 'two_factor';

      // Create OTP
      const otp = await createOtpCode(user.id, otpType);

      // Send OTP email
      const emailResult = await sendOtpEmail({
        email: user.email,
        firstName: user.firstName,
        otp,
        type,
      });

      if (!emailResult.success) {
        console.error('Failed to send OTP email:', emailResult.error);
        return reply.status(500).send({
          error: 'Internal Server Error',
          message: 'Failed to send verification code. Please try again.',
        });
      }

      return reply.send({
        message: 'Verification code sent to your email',
        expiresIn: 300, // 5 minutes
      });
    }
  );

  // POST /auth/otp/verify - Verify OTP and login
  fastify.post<{ Body: VerifyOtpBody }>(
    '/auth/otp/verify',
    {
      schema: {
        tags: ['Auth'],
        summary: 'Verify OTP code',
        description: 'Verify a one-time password code and complete authentication. Returns JWT token on success.',
        body: {
          type: 'object',
          required: ['email', 'code', 'type'],
          properties: {
            email: { type: 'string', format: 'email', description: 'User email address' },
            code: { type: 'string', minLength: 6, maxLength: 6, description: '6-digit OTP code' },
            type: {
              type: 'string',
              enum: ['login', 'two_factor'],
              description: 'OTP type that was requested',
            },
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
          400: {
            type: 'object',
            properties: {
              error: { type: 'string' },
              message: { type: 'string' },
              code: { type: 'string' },
            },
          },
          404: {
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
      const { email, code, type } = request.body;

      // Find user by email
      const user = await prisma.user.findUnique({
        where: { email },
        include: { tenant: true },
      });

      if (!user) {
        return reply.status(404).send({
          error: 'Not Found',
          message: 'No account found with this email address',
        });
      }

      // Map type to OtpType enum
      const otpType: OtpType = type === 'login' ? 'login' : 'two_factor';

      // Verify OTP
      const result = await verifyOtp(user.id, code, otpType);

      if (!result.success) {
        const errorMessages: Record<string, string> = {
          invalid: 'Invalid verification code',
          expired: 'Verification code has expired. Please request a new one.',
          max_attempts: 'Too many failed attempts. Please request a new code.',
          already_used: 'This code has already been used',
        };

        return reply.status(400).send({
          error: 'Bad Request',
          code: result.error,
          message: errorMessages[result.error || 'invalid'],
        });
      }

      // Update last login
      await prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      });

      // Create JWT token
      const payload = createJwtPayload(user);
      const token = fastify.jwt.sign(payload);

      // Audit log - OTP login
      createAuditLog(request, {
        action: type === 'login' ? 'otp_login' : 'otp_2fa',
        resource: 'auth',
        resourceId: user.id,
        userId: user.id,
        tenantId: user.tenantId || undefined,
        newValues: { email: user.email, role: user.role, method: type },
      }).catch((err) => console.error('Audit log error:', err));

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
      });
    }
  );
}
