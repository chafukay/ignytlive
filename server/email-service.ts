import nodemailer from "nodemailer";

const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = parseInt(process.env.SMTP_PORT || "587");
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const FROM_EMAIL = process.env.FROM_EMAIL || "noreply@ignytlive.com";

let transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter | null {
  if (transporter) return transporter;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    return null;
  }
  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
  });
  return transporter;
}

export function isEmailServiceConfigured(): boolean {
  return !!(SMTP_HOST && SMTP_USER && SMTP_PASS);
}

export async function sendVerificationEmail(toEmail: string, code: string, username: string): Promise<boolean> {
  const transport = getTransporter();
  if (!transport) {
    console.warn("[EMAIL] SMTP not configured - verification email not sent. Set SMTP_HOST, SMTP_USER, SMTP_PASS env vars.");
    return false;
  }

  try {
    await transport.sendMail({
      from: `"Ignyt Live" <${FROM_EMAIL}>`,
      to: toEmail,
      subject: "Verify Your Email - Ignyt Live",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
          <div style="text-align: center; margin-bottom: 24px;">
            <h1 style="color: #7c3aed; margin: 0;">Ignyt Live</h1>
          </div>
          <h2 style="color: #1f2937;">Verify Your Email</h2>
          <p style="color: #4b5563;">Hi ${username},</p>
          <p style="color: #4b5563;">Your verification code is:</p>
          <div style="background: #f3f4f6; border-radius: 8px; padding: 16px; text-align: center; margin: 24px 0;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #7c3aed;">${code}</span>
          </div>
          <p style="color: #4b5563;">Enter this code in the app to verify your email address. This code expires in 24 hours.</p>
          <p style="color: #9ca3af; font-size: 12px; margin-top: 32px;">If you didn't create an account on Ignyt Live, you can safely ignore this email.</p>
        </div>
      `,
      text: `Hi ${username}, your Ignyt Live verification code is: ${code}. This code expires in 24 hours.`,
    });
    return true;
  } catch (error) {
    console.error("[EMAIL] Failed to send verification email:", error instanceof Error ? error.message : "Unknown error");
    return false;
  }
}
