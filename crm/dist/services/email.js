import { Resend } from 'resend';
const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'noreply@crm.cospa.ai.vn';
const APP_NAME = process.env.APP_NAME || 'Cospa CRM';
const APP_URL = process.env.APP_URL || 'https://crm.cospa.ai.vn';
/**
 * Send a welcome email to newly registered users
 */
export async function sendWelcomeEmail(params) {
    const { email, firstName, lastName, organizationName } = params;
    const fullName = `${firstName} ${lastName}`.trim();
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to ${APP_NAME}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 40px 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 600;">Welcome to ${APP_NAME}!</h1>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
                Hi <strong>${fullName}</strong>,
              </p>

              <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
                Thank you for registering <strong>${organizationName}</strong> with ${APP_NAME}! We're excited to have you on board.
              </p>

              <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
                Your account is now active and ready to use. Here's what you can do next:
              </p>

              <ul style="color: #555555; font-size: 15px; line-height: 1.8; margin: 0 0 25px; padding-left: 20px;">
                <li>Set up your company profile and branding</li>
                <li>Add your team members to collaborate</li>
                <li>Import your contacts and companies</li>
                <li>Create deals and track your sales pipeline</li>
                <li>Manage vendors and contracts</li>
              </ul>

              <div style="text-align: center; margin: 30px 0;">
                <a href="${APP_URL}/crm/dashboard" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; padding: 14px 40px; border-radius: 6px; font-size: 16px; font-weight: 600;">
                  Go to Dashboard
                </a>
              </div>

              <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
                If you have any questions or need assistance, don't hesitate to reach out through our in-app support chat or reply to this email.
              </p>

              <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0;">
                Best regards,<br>
                <strong>The ${APP_NAME} Team</strong>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8f9fa; padding: 25px 40px; border-top: 1px solid #e9ecef;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="text-align: center;">
                    <p style="color: #6c757d; font-size: 13px; margin: 0 0 10px;">
                      You received this email because you signed up for ${APP_NAME}.
                    </p>
                    <p style="color: #6c757d; font-size: 13px; margin: 0;">
                      &copy; ${new Date().getFullYear()} ${APP_NAME}. All rights reserved.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
    const textContent = `
Welcome to ${APP_NAME}!

Hi ${fullName},

Thank you for registering ${organizationName} with ${APP_NAME}! We're excited to have you on board.

Your account is now active and ready to use. Here's what you can do next:

- Set up your company profile and branding
- Add your team members to collaborate
- Import your contacts and companies
- Create deals and track your sales pipeline
- Manage vendors and contracts

Get started: ${APP_URL}/crm/dashboard

If you have any questions or need assistance, don't hesitate to reach out through our in-app support chat or reply to this email.

Best regards,
The ${APP_NAME} Team

---
You received this email because you signed up for ${APP_NAME}.
© ${new Date().getFullYear()} ${APP_NAME}. All rights reserved.
  `.trim();
    try {
        const result = await resend.emails.send({
            from: `${APP_NAME} <${FROM_EMAIL}>`,
            to: email,
            subject: `Welcome to ${APP_NAME}! 🎉`,
            html: htmlContent,
            text: textContent,
        });
        if (result.error) {
            console.error('Failed to send welcome email:', result.error);
            return {
                success: false,
                error: String(result.error),
            };
        }
        console.log(`Welcome email sent to ${email}, id: ${result.data?.id}`);
        return {
            success: true,
            id: result.data?.id,
        };
    }
    catch (error) {
        console.error('Error sending welcome email:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : String(error),
        };
    }
}
/**
 * Send a password reset email
 */
export async function sendPasswordResetEmail(params) {
    const { email, firstName, resetToken } = params;
    const resetUrl = `${APP_URL}/reset-password?token=${resetToken}`;
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Your Password</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 40px 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 600;">Reset Your Password</h1>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
                Hi <strong>${firstName}</strong>,
              </p>

              <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
                We received a request to reset your password. Click the button below to create a new password:
              </p>

              <div style="text-align: center; margin: 30px 0;">
                <a href="${resetUrl}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; padding: 14px 40px; border-radius: 6px; font-size: 16px; font-weight: 600;">
                  Reset Password
                </a>
              </div>

              <p style="color: #666666; font-size: 14px; line-height: 1.6; margin: 0 0 20px;">
                This link will expire in 1 hour. If you didn't request a password reset, you can safely ignore this email.
              </p>

              <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0;">
                Best regards,<br>
                <strong>The ${APP_NAME} Team</strong>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8f9fa; padding: 25px 40px; border-top: 1px solid #e9ecef;">
              <p style="color: #6c757d; font-size: 13px; margin: 0; text-align: center;">
                &copy; ${new Date().getFullYear()} ${APP_NAME}. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
    try {
        const result = await resend.emails.send({
            from: `${APP_NAME} <${FROM_EMAIL}>`,
            to: email,
            subject: `Reset Your ${APP_NAME} Password`,
            html: htmlContent,
        });
        if (result.error) {
            return { success: false, error: String(result.error) };
        }
        return { success: true, id: result.data?.id };
    }
    catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : String(error),
        };
    }
}
/**
 * Send a generic notification email
 */
export async function sendNotificationEmail(params) {
    const { email, firstName, subject, title, message, actionUrl, actionText } = params;
    const actionButton = actionUrl && actionText ? `
    <div style="text-align: center; margin: 30px 0;">
      <a href="${actionUrl}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; padding: 14px 40px; border-radius: 6px; font-size: 16px; font-weight: 600;">
        ${actionText}
      </a>
    </div>
  ` : '';
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 40px 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 600;">${title}</h1>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
                Hi <strong>${firstName}</strong>,
              </p>

              <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
                ${message}
              </p>

              ${actionButton}

              <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0;">
                Best regards,<br>
                <strong>The ${APP_NAME} Team</strong>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8f9fa; padding: 25px 40px; border-top: 1px solid #e9ecef;">
              <p style="color: #6c757d; font-size: 13px; margin: 0; text-align: center;">
                &copy; ${new Date().getFullYear()} ${APP_NAME}. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
    try {
        const result = await resend.emails.send({
            from: `${APP_NAME} <${FROM_EMAIL}>`,
            to: email,
            subject,
            html: htmlContent,
        });
        if (result.error) {
            return { success: false, error: String(result.error) };
        }
        return { success: true, id: result.data?.id };
    }
    catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : String(error),
        };
    }
}
//# sourceMappingURL=email.js.map