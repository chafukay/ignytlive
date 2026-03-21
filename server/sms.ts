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

export interface SmsResult {
  sent: boolean;
  error?: string;
  errorCode?: string;
  httpStatus?: number;
}

function getTwilioErrorCode(error: unknown): number | undefined {
  if (error && typeof error === "object" && "code" in error) {
    return (error as { code: number }).code;
  }
  return undefined;
}

function getTwilioStatus(error: unknown): number | undefined {
  if (error && typeof error === "object" && "status" in error) {
    return (error as { status: number }).status;
  }
  return undefined;
}

function getTwilioMessage(error: unknown): string {
  if (error && typeof error === "object" && "message" in error) {
    return String((error as { message: string }).message);
  }
  return "Unknown error";
}

export async function sendVerificationCode(phone: string, code: string): Promise<SmsResult> {
  const twilioClient = getClient();
  
  if (!twilioClient || !fromNumber) {
    if (process.env.NODE_ENV === "development") {
      console.log(`[SMS] Dev mode - code for ${phone.slice(-4)}: ${code}`);
    } else {
      console.warn(`[SMS] Not configured - cannot send to ${phone.slice(-4)}`);
    }
    return { sent: false, error: "SMS service not configured", errorCode: "NOT_CONFIGURED", httpStatus: 503 };
  }

  try {
    await twilioClient.messages.create({
      body: `Your IgnytLIVE verification code is: ${code}. This code expires in 10 minutes.`,
      from: fromNumber,
      to: phone,
    });
    console.log(`[SMS] Sent verification code to ***${phone.slice(-4)}`);
    return { sent: true };
  } catch (error: unknown) {
    const twilioCode = getTwilioErrorCode(error);
    const twilioStatus = getTwilioStatus(error);
    console.error(`[SMS] Failed to send to ***${phone.slice(-4)}: code=${twilioCode} status=${twilioStatus}`, getTwilioMessage(error));

    if (twilioCode === 21211 || twilioCode === 21614 || twilioCode === 21217) {
      return { sent: false, error: "Invalid phone number. Please check the number and try again.", errorCode: "INVALID_NUMBER", httpStatus: 400 };
    }
    if (twilioCode === 21608 || twilioCode === 21610 || twilioCode === 21612) {
      return { sent: false, error: "This phone number cannot receive SMS messages.", errorCode: "UNDELIVERABLE", httpStatus: 400 };
    }
    if (twilioCode === 21408) {
      return { sent: false, error: "SMS cannot be sent to this region. Please use a different phone number.", errorCode: "REGION_NOT_SUPPORTED", httpStatus: 400 };
    }
    if (twilioCode === 20003 || twilioStatus === 401) {
      console.error("[SMS] Authentication failed - check TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN");
      return { sent: false, error: "SMS service temporarily unavailable. Please try again later.", errorCode: "AUTH_FAILED", httpStatus: 503 };
    }
    if (twilioCode === 20429 || twilioStatus === 429) {
      return { sent: false, error: "Too many requests. Please wait a moment and try again.", errorCode: "RATE_LIMITED", httpStatus: 429 };
    }
    if (twilioCode === 21606) {
      console.error("[SMS] From number not verified - check TWILIO_PHONE_NUMBER");
      return { sent: false, error: "SMS service temporarily unavailable. Please try again later.", errorCode: "SENDER_NOT_VERIFIED", httpStatus: 503 };
    }

    return { sent: false, error: "Failed to send verification code. Please try again.", errorCode: "UNKNOWN", httpStatus: 500 };
  }
}

export function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}
