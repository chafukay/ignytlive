import webpush from "web-push";
import { storage } from "./storage";

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || "";
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || "";

let configured = false;

export function initPushService() {
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    console.log("[Push] VAPID keys not configured — push notifications disabled");
    return;
  }
  webpush.setVapidDetails(
    "mailto:admin@ignytlive.com",
    VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY
  );
  configured = true;
  console.log("[Push] Web Push service initialized");
}

export function getVapidPublicKey(): string {
  return VAPID_PUBLIC_KEY;
}

interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: Record<string, unknown>;
}

export async function sendPushToUser(userId: string, payload: PushPayload): Promise<void> {
  if (!configured) return;

  const user = await storage.getUser(userId);
  if (!user) return;

  if (user.notificationSettings) {
    try {
      const settings = typeof user.notificationSettings === "string"
        ? JSON.parse(user.notificationSettings)
        : user.notificationSettings;
      if (settings.pushEnabled === false) return;
    } catch {}
  }

  const subscriptions = await storage.getUserPushSubscriptions(userId);
  if (subscriptions.length === 0) return;

  const payloadStr = JSON.stringify(payload);

  for (const sub of subscriptions) {
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        },
        payloadStr
      );
    } catch (err: any) {
      if (err.statusCode === 410 || err.statusCode === 404) {
        await storage.removePushSubscription(sub.endpoint);
      }
    }
  }
}

export function shouldSendAlert(
  notificationSettings: string | null | undefined,
  alertType: "streamAlerts" | "messageAlerts" | "giftAlerts" | "followerAlerts"
): boolean {
  if (!notificationSettings) return true;
  try {
    const settings = typeof notificationSettings === "string"
      ? JSON.parse(notificationSettings)
      : notificationSettings;
    if (settings.pushEnabled === false) return false;
    if (settings[alertType] === false) return false;
    return true;
  } catch {
    return true;
  }
}
