import nodemailer from "nodemailer";

let transporter: nodemailer.Transporter | null = null;
let lastConfig = "";

function getTransporter(): nodemailer.Transporter | null {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || "587");
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    return null;
  }

  const configKey = `${host}:${port}:${user}:${pass}`;
  if (transporter && lastConfig === configKey) {
    return transporter;
  }

  transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
  lastConfig = configKey;
  console.log(`[EMAIL] SMTP configured: ${host}:${port} (user: ${user})`);
  return transporter;
}

export function isEmailServiceConfigured(): boolean {
  return !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

export async function sendVerificationEmail(toEmail: string, code: string, username: string): Promise<boolean> {
  const transport = getTransporter();
  if (!transport) {
    console.warn("[EMAIL] SMTP not configured - verification email not sent. Set SMTP_HOST, SMTP_USER, SMTP_PASS env vars.");
    return false;
  }

  const fromEmail = process.env.FROM_EMAIL || "noreply@ignytlive.com";

  try {
    await transport.sendMail({
      from: `"IgnytLIVE" <${fromEmail}>`,
      to: toEmail,
      subject: "Verify Your Email - IgnytLIVE",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; background: #0d0618; color: #ffffff;">
          <div style="text-align: center; margin-bottom: 24px;">
            <img src="https://ignyt.replit.app/logo-ignyt.png" alt="IgnytLIVE" style="width: 80px; height: 80px; margin: 0 auto 12px auto; display: block; border-radius: 16px;" />
            <h1 style="color: #a855f7; margin: 0;">IgnytLIVE</h1>
          </div>
          <h2 style="color: #ffffff;">Verify Your Email</h2>
          <p style="color: #d1d5db;">Hi ${username},</p>
          <p style="color: #d1d5db;">Your verification code is:</p>
          <div style="background: #1a0a2e; border: 1px solid #a855f7; border-radius: 12px; padding: 20px; text-align: center; margin: 24px 0;">
            <span style="font-size: 36px; font-weight: bold; letter-spacing: 10px; color: #a855f7;">${code}</span>
          </div>
          <p style="color: #d1d5db;">Enter this code in the app to verify your email address. This code expires in 24 hours.</p>
          <hr style="border: none; border-top: 1px solid #374151; margin: 32px 0;" />
          <p style="color: #6b7280; font-size: 12px;">If you didn't create an account on IgnytLIVE, you can safely ignore this email.</p>
          <p style="color: #6b7280; font-size: 12px;">Need help? Contact us at support@ignytlive.com</p>
        </div>
      `,
      text: `Hi ${username}, your IgnytLIVE verification code is: ${code}. This code expires in 24 hours.`,
    });
    console.log(`[EMAIL] Verification email sent to ${toEmail}`);
    return true;
  } catch (error) {
    console.error("[EMAIL] Failed to send verification email:", error instanceof Error ? error.message : "Unknown error");
    transporter = null;
    lastConfig = "";
    return false;
  }
}

export async function sendGenericEmail(toEmail: string, subject: string, html: string, text: string): Promise<boolean> {
  const transport = getTransporter();
  if (!transport) {
    console.warn("[EMAIL] SMTP not configured - email not sent.");
    return false;
  }

  const fromEmail = process.env.FROM_EMAIL || "noreply@ignytlive.com";

  try {
    await transport.sendMail({
      from: `"IgnytLIVE" <${fromEmail}>`,
      to: toEmail,
      subject,
      html,
      text,
    });
    return true;
  } catch (error) {
    console.error("[EMAIL] Failed to send email:", error instanceof Error ? error.message : "Unknown error");
    transporter = null;
    lastConfig = "";
    return false;
  }
}
