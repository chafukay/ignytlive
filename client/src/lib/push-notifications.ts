import { api } from "./api";
import { isNative } from "./capacitor";

let swRegistration: ServiceWorkerRegistration | null = null;

export async function initPushNotifications(userId: string): Promise<boolean> {
  if (isNative()) {
    return initNativePush(userId);
  }

  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    return false;
  }

  try {
    swRegistration = await navigator.serviceWorker.register("/sw.js");
    await navigator.serviceWorker.ready;

    const existing = await swRegistration.pushManager.getSubscription();
    if (existing) {
      await syncSubscriptionToServer(userId, existing);
      return true;
    }

    return false;
  } catch (e) {
    console.error("[Push] Init failed:", e);
    return false;
  }
}

export async function subscribeToPush(userId: string): Promise<boolean> {
  if (isNative()) {
    return subscribeNativePush(userId);
  }

  if (!swRegistration) {
    const ok = await initPushNotifications(userId);
    if (!ok && !swRegistration) return false;
  }

  try {
    const vapidKey = await api.getVapidPublicKey();
    if (!vapidKey) return false;

    const permission = await Notification.requestPermission();
    if (permission !== "granted") return false;

    const subscription = await swRegistration!.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidKey),
    });

    await syncSubscriptionToServer(userId, subscription);
    return true;
  } catch (e) {
    console.error("[Push] Subscribe failed:", e);
    return false;
  }
}

export async function unsubscribeFromPush(): Promise<void> {
  if (isNative()) {
    try {
      const { PushNotifications } = await import('@capacitor/push-notifications');
      await PushNotifications.removeAllListeners();
    } catch (e) {
      console.error("[Push] Native unsubscribe failed:", e);
    }
    return;
  }

  if (!swRegistration) return;
  try {
    const subscription = await swRegistration.pushManager.getSubscription();
    if (subscription) {
      const endpoint = subscription.endpoint;
      await subscription.unsubscribe();
      await api.removePushSubscription(endpoint);
    }
  } catch (e) {
    console.error("[Push] Unsubscribe failed:", e);
  }
}

export async function isPushSubscribed(): Promise<boolean> {
  if (isNative()) {
    try {
      const { PushNotifications } = await import('@capacitor/push-notifications');
      const result = await PushNotifications.checkPermissions();
      return result.receive === 'granted';
    } catch {
      return false;
    }
  }

  if (!swRegistration) return false;
  try {
    const sub = await swRegistration.pushManager.getSubscription();
    return !!sub;
  } catch {
    return false;
  }
}

async function initNativePush(userId: string): Promise<boolean> {
  try {
    const { PushNotifications } = await import('@capacitor/push-notifications');

    const permResult = await PushNotifications.checkPermissions();
    if (permResult.receive !== 'granted') {
      const reqResult = await PushNotifications.requestPermissions();
      if (reqResult.receive !== 'granted') return false;
    }

    await PushNotifications.register();

    PushNotifications.addListener('registration', async (token) => {
      console.log('[Push] Native token:', token.value);
      await api.saveNativePushToken(userId, token.value);
    });

    PushNotifications.addListener('registrationError', (err) => {
      console.error('[Push] Native registration error:', err);
    });

    PushNotifications.addListener('pushNotificationReceived', (notification) => {
      console.log('[Push] Received:', notification);
    });

    PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
      console.log('[Push] Action:', action);
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

async function syncSubscriptionToServer(userId: string, subscription: globalThis.PushSubscription) {
  const json = subscription.toJSON();
  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) return;
  await api.savePushSubscription(userId, json.endpoint, json.keys.p256dh, json.keys.auth);
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
