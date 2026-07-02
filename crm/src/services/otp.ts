import bcrypt from 'bcrypt';
import { prisma } from './prisma.js';
import { OtpType } from '@prisma/client';

const OTP_LENGTH = 6;
const OTP_EXPIRY_MINUTES = 5;
const MAX_OTP_ATTEMPTS = 5;
const SALT_ROUNDS = 10;

/**
 * Generate a random 6-digit OTP code
 */
export function generateOtp(): string {
  const min = Math.pow(10, OTP_LENGTH - 1);
  const max = Math.pow(10, OTP_LENGTH) - 1;
  return Math.floor(min + Math.random() * (max - min + 1)).toString();
}

/**
 * Hash an OTP code before storing in database
 */
export async function hashOtp(otp: string): Promise<string> {
  return bcrypt.hash(otp, SALT_ROUNDS);
}

/**
 * Verify an OTP code against a hash
 */
export async function verifyOtpHash(otp: string, hash: string): Promise<boolean> {
  return bcrypt.compare(otp, hash);
}

/**
 * Create a new OTP code for a user
 * Deletes any existing OTP of the same type for this user
 */
export async function createOtpCode(userId: string, type: OtpType): Promise<string> {
  // Delete existing OTPs of the same type for this user
  await prisma.otpCode.deleteMany({
    where: {
      userId,
      type,
    },
  });

  // Generate new OTP
  const otp = generateOtp();
  const hashedOtp = await hashOtp(otp);
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

  // Create OTP record
  await prisma.otpCode.create({
    data: {
      code: hashedOtp,
      type,
      userId,
      expiresAt,
    },
  });

  return otp;
}

interface VerifyOtpResult {
  success: boolean;
  error?: 'invalid' | 'expired' | 'max_attempts' | 'already_used';
  userId?: string;
}

/**
 * Verify an OTP code
 * Returns success if valid, otherwise returns error type
 */
export async function verifyOtp(
  userId: string,
  code: string,
  type: OtpType
): Promise<VerifyOtpResult> {
  // Find the OTP record
  const otpRecord = await prisma.otpCode.findFirst({
    where: {
      userId,
      type,
      usedAt: null, // Not yet used
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  if (!otpRecord) {
    return { success: false, error: 'invalid' };
  }

  // Check if expired
  if (new Date() > otpRecord.expiresAt) {
    return { success: false, error: 'expired' };
  }

  // Check if max attempts exceeded
  if (otpRecord.attempts >= MAX_OTP_ATTEMPTS) {
    return { success: false, error: 'max_attempts' };
  }

  // Verify the OTP
  const isValid = await verifyOtpHash(code, otpRecord.code);

  if (!isValid) {
    // Increment attempts
    await prisma.otpCode.update({
      where: { id: otpRecord.id },
      data: { attempts: otpRecord.attempts + 1 },
    });
    return { success: false, error: 'invalid' };
  }

  // Mark as used
  await prisma.otpCode.update({
    where: { id: otpRecord.id },
    data: { usedAt: new Date() },
  });

  return { success: true, userId };
}

/**
 * Clean up expired OTP codes
 * Should be called periodically (e.g., via cron job)
 */
export async function cleanupExpiredOtps(): Promise<number> {
  const result = await prisma.otpCode.deleteMany({
    where: {
      OR: [
        { expiresAt: { lt: new Date() } },
        { usedAt: { not: null } },
      ],
    },
  });
  return result.count;
}

/**
 * Check rate limiting for OTP requests
 * Returns true if rate limit exceeded
 */
export async function isOtpRateLimited(userId: string): Promise<boolean> {
  const oneMinuteAgo = new Date(Date.now() - 60 * 1000);

  const recentOtps = await prisma.otpCode.count({
    where: {
      userId,
      createdAt: { gte: oneMinuteAgo },
    },
  });

  // Max 3 OTP requests per minute
  return recentOtps >= 3;
}

/**
 * Get remaining OTP attempts
 */
export async function getRemainingAttempts(
  userId: string,
  type: OtpType
): Promise<number> {
  const otpRecord = await prisma.otpCode.findFirst({
    where: {
      userId,
      type,
      usedAt: null,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  if (!otpRecord) {
    return 0;
  }

  return Math.max(0, MAX_OTP_ATTEMPTS - otpRecord.attempts);
}
