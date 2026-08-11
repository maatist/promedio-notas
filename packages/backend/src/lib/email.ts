import { BrevoClient } from '@getbrevo/brevo';

/**
 * Email service using Brevo (formerly Sendinblue).
 * Handles missing BREVO_API_KEY gracefully by logging a warning at module load time.
 */

let brevo: BrevoClient | null = null;

if (!process.env.BREVO_API_KEY) {
  console.warn(
    '[email] WARNING: BREVO_API_KEY is not set. Email sending will fail at runtime.'
  );
} else {
  brevo = new BrevoClient({ apiKey: process.env.BREVO_API_KEY });
}

function getResetEmailHtml(resetUrl: string): string {
  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Recupera tu contrase\u00f1a</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f4f4f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" style="max-width: 480px; background-color: #ffffff; border-radius: 8px; padding: 40px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
          <tr>
            <td align="center" style="padding-bottom: 24px;">
              <h1 style="margin: 0; font-size: 24px; color: #6366f1;">Promedio Notas</h1>
            </td>
          </tr>
          <tr>
            <td style="padding-bottom: 16px;">
              <p style="margin: 0; font-size: 16px; color: #374151;">Hola,</p>
            </td>
          </tr>
          <tr>
            <td style="padding-bottom: 24px;">
              <p style="margin: 0; font-size: 14px; color: #6b7280; line-height: 1.5;">
                Recibimos una solicitud para restablecer la contrase\u00f1a de tu cuenta. Haz clic en el bot\u00f3n de abajo para crear una nueva contrase\u00f1a.
              </p>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding-bottom: 24px;">
              <a href="${resetUrl}" style="display: inline-block; padding: 12px 32px; background-color: #6366f1; color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 14px; font-weight: 600;">
                Restablecer contrase\u00f1a
              </a>
            </td>
          </tr>
          <tr>
            <td style="padding-bottom: 24px;">
              <p style="margin: 0; font-size: 12px; color: #9ca3af; line-height: 1.5;">
                Este enlace expira en <strong>1 hora</strong>. Si no solicitaste un cambio de contrase\u00f1a, puedes ignorar este correo de forma segura.
              </p>
            </td>
          </tr>
          <tr>
            <td style="border-top: 1px solid #e5e7eb; padding-top: 16px;">
              <p style="margin: 0; font-size: 12px; color: #9ca3af; text-align: center;">
                &copy; Promedio Notas
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`.trim();
}

function getResetEmailText(resetUrl: string): string {
  return [
    'Promedio Notas',
    '',
    'Hola,',
    '',
    'Recibimos una solicitud para restablecer la contrase\u00f1a de tu cuenta.',
    'Usa el siguiente enlace para crear una nueva contrase\u00f1a:',
    '',
    resetUrl,
    '',
    'Este enlace expira en 1 hora.',
    '',
    'Si no solicitaste un cambio de contrase\u00f1a, puedes ignorar este correo de forma segura.',
    '',
    '---',
    'Promedio Notas',
  ].join('\n');
}

export async function sendPasswordResetEmail(
  to: string,
  resetUrl: string
): Promise<void> {
  if (!brevo) {
    throw new Error(
      'Email service is not configured. BREVO_API_KEY is missing.'
    );
  }

  const senderEmail = process.env.BREVO_SENDER_EMAIL || 'noreply@promedionotas.com';
  const senderName = process.env.BREVO_SENDER_NAME || 'Promedio Notas';

  console.log(`[email] Sending password reset email to: ${to}, sender: ${senderEmail}`);

  try {
    const result = await brevo.transactionalEmails.sendTransacEmail({
      sender: { name: senderName, email: senderEmail },
      to: [{ email: to }],
      subject: 'Recupera tu contrase\u00f1a - Promedio Notas',
      htmlContent: getResetEmailHtml(resetUrl),
      textContent: getResetEmailText(resetUrl),
    });
    console.log('[email] Email sent successfully:', JSON.stringify(result));
  } catch (error) {
    console.error('[email] Brevo API error:', error);
    throw error;
  }
}
