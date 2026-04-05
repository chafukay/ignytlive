import webpush from "web-push";
import { storage } from "./storage";

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || "";
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || "";
const FCM_SERVER_KEY = process.env.FCM_SERVER_KEY || "";

let webPushConfigured = false;
let fcmConfigured = false;

export function initPushService() {
  if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
    webpush.setVapidDetails(
      "mailto:admin@ignytlive.com",
      VAPID_PUBLIC_KEY,
      VAPID_PRIVATE_KEY
    );
    webPushConfigured = true;
    console.log("[Push] Web Push service initialized");
  } else {
    console.log("[Push] VAPID keys not configured — web push notifications disabled");
  }

  if (FCM_SERVER_KEY) {
    fcmConfigured = true;
    console.log("[Push] FCM configured for native push delivery");
  } else {
    console.log("[Push] FCM_SERVER_KEY not set — native push delivery disabled. Set FCM_SERVER_KEY to enable.");
  }
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

async function sendFcmNotification(token: string, tokenId: string, payload: PushPayload): Promise<void> {
  if (!fcmConfigured) return;

  try {
    const response = await fetch('https://fcm.googleapis.com/fcm/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `key=${FCM_SERVER_KEY}`,
      },
      body: JSON.stringify({
        to: token,
        notification: {
          title: payload.title,
          body: payload.body,
          icon: payload.icon,
          badge: payload.badge,
          tag: payload.tag,
        },
        data: payload.data || {},
      }),
    });

    if (response.ok) {
      const result = await response.json();
      if (result.failure > 0 && result.results?.[0]?.error === 'NotRegistered') {
        await storage.removeNativePushToken(tokenId);
      }
    }
  } catch (err) {
    console.error(`[Push] FCM send failed for token ${token.substring(0, 20)}...`, err);
  }
}

export async function sendPushToUser(userId: string, payload: PushPayload): Promise<void> {
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

  if (webPushConfigured) {
    const subscriptions = await storage.getUserPushSubscriptions(userId);
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

  if (fcmConfigured) {
    const nativeTokens = await storage.getNativeTokensByUserId(userId);
    for (const nt of nativeTokens) {
      await sendFcmNotification(nt.token, nt.id, payload);
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
