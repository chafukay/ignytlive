import Twilio from "twilio";

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromNumber = process.env.TWILIO_PHONE_NUMBER;

let client: Twilio.Twilio | null = null;

function getClient() {
  if (!client && accountSid && authToken) {
    client = Twilio(accountSid, authToken);
  }
  return client;
}

export function isSmsConfigured(): boolean {
  return !!(accountSid && authToken && fromNumber);
}

export async function sendVerificationCode(phone: string, code: string): Promise<boolean> {
  const twilioClient = getClient();
  
  if (!twilioClient || !fromNumber) {
    console.log(`[SMS] Not configured. Code for ${phone}: ${code}`);
    return false;
  }

  try {
    await twilioClient.messages.create({
      body: `Your IgnytLIVE verification code is: ${code}. This code expires in 10 minutes.`,
      from: fromNumber,
      to: phone,
    });
    console.log(`[SMS] Sent verification code to ${phone}`);
    return true;
  } catch (error) {
    console.error("[SMS] Failed to send:", error);
    return false;
  }
}

export function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}
