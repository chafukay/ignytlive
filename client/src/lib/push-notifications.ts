import { api } from "./api";
import { isNative } from "./capacitor";
import { getFCMToken, setupForegroundMessages } from "./firebase";

let foregroundUnsub: (() => void) | null = null;

export async function initPushNotifications(userId: string): Promise<boolean> {
  if (isNative()) {
    return initNativePush(userId);
  }

  try {
    const token = await getFCMToken();
    if (token) {
      await api.saveFCMToken(userId, token, "web");
      await setupForegroundHandler();
      return true;
    }
    return false;
  } catch (e) {
    console.error("[Push] Firebase init failed:", e);
    return false;
  }
}

export async function subscribeToPush(userId: string): Promise<boolean> {
  if (isNative()) {
    return subscribeNativePush(userId);
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") return false;

    const token = await getFCMToken();
    if (!token) return false;

    await api.saveFCMToken(userId, token, "web");
    await setupForegroundHandler();
    return true;
  } catch (e) {
    console.error("[Push] Subscribe failed:", e);
    return false;
  }
}

export async function unsubscribeFromPush(): Promise<void> {
  if (isNative()) {
    try {
      const { PushNotifications } = await import("@capacitor/push-notifications");
      await PushNotifications.removeAllListeners();
    } catch (e) {
      console.error("[Push] Native unsubscribe failed:", e);
    }
    return;
  }

  if (foregroundUnsub) {
    foregroundUnsub();
    foregroundUnsub = null;
  }
}

export async function isPushSubscribed(): Promise<boolean> {
  if (isNative()) {
    try {
      const { PushNotifications } = await import("@capacitor/push-notifications");
      const result = await PushNotifications.checkPermissions();
      return result.receive === "granted";
    } catch {
      return false;
    }
  }

  if (!("Notification" in window)) return false;
  return Notification.permission === "granted";
}

async function setupForegroundHandler() {
  if (foregroundUnsub) return;
  foregroundUnsub = await setupForegroundMessages((payload) => {
    const title = payload.notification?.title || payload.data?.title || "IgnytLive";
    const body = payload.notification?.body || payload.data?.body || "";
    if (Notification.permission === "granted") {
      new Notification(title, {
        body,
        icon: "/icon-192.png",
        tag: payload.data?.tag || "ignytlive",
      });
    }
  });
}

async function initNativePush(userId: string): Promise<boolean> {
  try {
    const { PushNotifications } = await import("@capacitor/push-notifications");

    const permResult = await PushNotifications.checkPermissions();
    if (permResult.receive !== "granted") {
      const reqResult = await PushNotifications.requestPermissions();
      if (reqResult.receive !== "granted") return false;
    }

    await PushNotifications.register();

    PushNotifications.addListener("registration", async (token) => {
      console.log("[Push] Native FCM token:", token.value);
      await api.saveFCMToken(userId, token.value, "android");
    });

    PushNotifications.addListener("registrationError", (err) => {
      console.error("[Push] Native registration error:", err);
    });

    PushNotifications.addListener("pushNotificationReceived", (notification) => {
      console.log("[Push] Received:", notification);
    });

    PushNotifications.addListener("pushNotificationActionPerformed", (action) => {
      console.log("[Push] Action:", action);
    });

    return true;
  } catch (e) {
    console.error("[Push] Native init failed:", e);
    return false;
  }
}

async function subscribeNativePush(userId: string): Promise<boolean> {
  return initNativePush(userId);
}
