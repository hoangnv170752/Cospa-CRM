interface WelcomeEmailParams {
    email: string;
    firstName: string;
    lastName: string;
    organizationName: string;
}
interface EmailResult {
    success: boolean;
    id?: string;
    error?: string;
}
/**
 * Send a welcome email to newly registered users
 */
export declare function sendWelcomeEmail(params: WelcomeEmailParams): Promise<EmailResult>;
/**
 * Send a password reset email
 */
export declare function sendPasswordResetEmail(params: {
    email: string;
    firstName: string;
    resetToken: string;
}): Promise<EmailResult>;
/**
 * Send an OTP verification email
 */
export declare function sendOtpEmail(params: {
    email: string;
    firstName: string;
    otp: string;
    type: 'login' | 'two_factor';
}): Promise<EmailResult>;
/**
 * Send a generic notification email
 */
export declare function sendNotificationEmail(params: {
    email: string;
    firstName: string;
    subject: string;
    title: string;
    message: string;
    actionUrl?: string;
    actionText?: string;
}): Promise<EmailResult>;
export {};
//# sourceMappingURL=email.d.ts.map