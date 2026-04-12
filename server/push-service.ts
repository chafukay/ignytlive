import webpush from "web-push";
import admin from "firebase-admin";
import { storage } from "./storage";

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || "";
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || "";

let webPushConfigured = false;
let firebaseConfigured = false;

export function initPushService() {
  if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
    webpush.setVapidDetails(
      "mailto:admin@ignytlive.com",
      VAPID_PUBLIC_KEY,
      VAPID_PRIVATE_KEY
    );
    webPushConfigured = true;
    console.log("[Push] Web Push (VAPID) service initialized");
  }

  try {
    const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    if (serviceAccount) {
      const parsed = JSON.parse(serviceAccount);
      admin.initializeApp({
        credential: admin.credential.cert(parsed),
      });
      firebaseConfigured = true;
      console.log("[Push] Firebase Admin SDK initialized");
    } else {
      admin.initializeApp({
        projectId: process.env.VITE_FIREBASE_PROJECT_ID || "ignytlive",
      });
      firebaseConfigured = true;
      console.log("[Push] Firebase Admin SDK initialized (default credentials)");
    }
  } catch (err: any) {
    if (err.code === "app/duplicate-app") {
      firebaseConfigured = true;
    } else {
      console.log("[Push] Firebase Admin SDK not configured:", err.message);
      console.log("[Push] Set FIREBASE_SERVICE_ACCOUNT_KEY env var to enable FCM push notifications");
    }
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

async function sendFirebaseNotification(token: string, tokenId: string, payload: PushPayload): Promise<void> {
  if (!firebaseConfigured) return;

  try {
    const message: admin.messaging.Message = {
      token,
      notification: {
        title: payload.title,
        body: payload.body,
        imageUrl: payload.icon,
      },
      data: {},
      webpush: {
        notification: {
          icon: payload.icon || "/icon-192.png",
          badge: payload.badge || "/icon-192.png",
          tag: payload.tag || "ignytlive",
        },
      },
      android: {
        priority: "high",
        notification: {
          icon: "ic_notification",
          color: "#ec4899",
          sound: "default",
          tag: payload.tag || "ignytlive",
        },
      },
    };

    if (payload.data) {
      for (const [key, value] of Object.entries(payload.data)) {
        message.data![key] = String(value);
      }
    }
    if (payload.tag) {
      message.data!.tag = payload.tag;
    }

    await admin.messaging().send(message);
  } catch (err: any) {
    if (
      err.code === "messaging/registration-token-not-registered" ||
      err.code === "messaging/invalid-registration-token"
    ) {
      console.log(`[Push] Removing invalid FCM token ${tokenId}`);
      await storage.removeNativePushToken(tokenId);
    } else {
      console.error(`[Push] FCM send failed:`, err.message);
    }
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

  if (firebaseConfigured) {
    const nativeTokens = await storage.getNativeTokensByUserId(userId);
    for (const nt of nativeTokens) {
      await sendFirebaseNotification(nt.token, nt.id, payload);
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
