import { OtpType } from '@prisma/client';
/**
 * Generate a random 6-digit OTP code
 */
export declare function generateOtp(): string;
/**
 * Hash an OTP code before storing in database
 */
export declare function hashOtp(otp: string): Promise<string>;
/**
 * Verify an OTP code against a hash
 */
export declare function verifyOtpHash(otp: string, hash: string): Promise<boolean>;
/**
 * Create a new OTP code for a user
 * Deletes any existing OTP of the same type for this user
 */
export declare function createOtpCode(userId: string, type: OtpType): Promise<string>;
interface VerifyOtpResult {
    success: boolean;
    error?: 'invalid' | 'expired' | 'max_attempts' | 'already_used';
    userId?: string;
}
/**
 * Verify an OTP code
 * Returns success if valid, otherwise returns error type
 */
export declare function verifyOtp(userId: string, code: string, type: OtpType): Promise<VerifyOtpResult>;
/**
 * Clean up expired OTP codes
 * Should be called periodically (e.g., via cron job)
 */
export declare function cleanupExpiredOtps(): Promise<number>;
/**
 * Check rate limiting for OTP requests
 * Returns true if rate limit exceeded
 */
export declare function isOtpRateLimited(userId: string): Promise<boolean>;
/**
 * Get remaining OTP attempts
 */
export declare function getRemainingAttempts(userId: string, type: OtpType): Promise<number>;
export {};
//# sourceMappingURL=otp.d.ts.map