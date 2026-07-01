import { Resend } from 'resend';
const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'noreply@crm.cospa.ai.vn';
const DEV_TEAM_EMAIL = process.env.DEV_TEAM_EMAIL || 'dev@cospa.ai.vn';
const APP_NAME = process.env.APP_NAME || 'Cospa CRM';
export async function contactFormRoutes(fastify) {
    // POST /contact-form - Public contact form (no auth required)
    fastify.post('/contact-form', {
        schema: {
            tags: ['Contact'],
            summary: 'Submit contact form from landing page',
            description: 'Public endpoint — sends an email to the dev team with the visitor message.',
            body: {
                type: 'object',
                properties: {
                    name: { type: 'string', minLength: 1 },
                    email: { type: 'string', format: 'email' },
                    message: { type: 'string', minLength: 1 },
                },
                required: ['name', 'email', 'message'],
            },
            response: {
                200: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean' },
                        message: { type: 'string' },
                    },
                },
            },
        },
    }, async (request, reply) => {
        const { name, email, message } = request.body;
        const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Contact Form Submission</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <tr>
            <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px 40px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600;">New Contact Form Message</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 30px 40px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding: 8px 0; color: #6c757d; font-size: 14px; width: 80px; vertical-align: top;">Name:</td>
                  <td style="padding: 8px 0; color: #333; font-size: 14px; font-weight: 600;">${name}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #6c757d; font-size: 14px; width: 80px; vertical-align: top;">Email:</td>
                  <td style="padding: 8px 0; color: #333; font-size: 14px;"><a href="mailto:${email}" style="color: #667eea;">${email}</a></td>
                </tr>
              </table>
              <hr style="border: none; border-top: 1px solid #e9ecef; margin: 20px 0;" />
              <p style="color: #6c757d; font-size: 13px; margin: 0 0 8px; text-transform: uppercase; letter-spacing: 0.5px;">Message:</p>
              <div style="background: #f8f9fa; border-radius: 6px; padding: 16px; color: #333; font-size: 15px; line-height: 1.6; white-space: pre-wrap;">${message}</div>
            </td>
          </tr>
          <tr>
            <td style="background-color: #f8f9fa; padding: 20px 40px; border-top: 1px solid #e9ecef; text-align: center;">
              <p style="color: #6c757d; font-size: 12px; margin: 0;">
                Sent from ${APP_NAME} Landing Page Contact Form
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`.trim();
        try {
            const result = await resend.emails.send({
                from: `${APP_NAME} Contact <${FROM_EMAIL}>`,
                to: DEV_TEAM_EMAIL,
                replyTo: email,
                subject: `[Contact] ${name} — ${message.substring(0, 60)}${message.length > 60 ? '...' : ''}`,
                html: htmlContent,
                text: `New contact form message\n\nName: ${name}\nEmail: ${email}\n\nMessage:\n${message}`,
            });
            if (result.error) {
                console.error('Failed to send contact form email:', result.error);
                return reply.status(500).send({
                    success: false,
                    error: 'Failed to send message. Please try again later.',
                });
            }
            console.log(`Contact form email sent from ${email}, resend id: ${result.data?.id}`);
            return reply.send({
                success: true,
                message: 'Message sent successfully',
            });
        }
        catch (error) {
            console.error('Contact form error:', error);
            return reply.status(500).send({
                success: false,
                error: 'Failed to send message. Please try again later.',
            });
        }
    });
}
//# sourceMappingURL=contact-form.js.map