import { api } from "./api";

let swRegistration: ServiceWorkerRegistration | null = null;

export async function initPushNotifications(userId: string): Promise<boolean> {
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
  if (!swRegistration) return false;
  try {
    const sub = await swRegistration.pushManager.getSubscription();
    return !!sub;
  } catch {
    return false;
  }
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
