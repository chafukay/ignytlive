import { isNative } from "./capacitor";

let firebaseApp: any = null;
let messagingInstance: any = null;
let initialized = false;

async function ensureInitialized() {
  if (initialized) return;
  initialized = true;

  if (isNative()) return;

  try {
    const apiKey = import.meta.env.VITE_FIREBASE_API_KEY;
    if (!apiKey) {
      console.warn("[Firebase] No API key configured, skipping init");
      return;
    }

    const { initializeApp } = await import("firebase/app");
    firebaseApp = initializeApp({
      apiKey,
      authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
      projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
      storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
      appId: import.meta.env.VITE_FIREBASE_APP_ID,
    });
  } catch (err) {
    console.warn("[Firebase] Init failed:", err);
  }
}

export async function getFirebaseMessaging() {
  if (isNative()) return null;
  if (messagingInstance) return messagingInstance;

  try {
    await ensureInitialized();
    if (!firebaseApp) return null;

    const { getMessaging, isSupported } = await import("firebase/messaging");
    const supported = await isSupported();
    if (!supported) return null;

    messagingInstance = getMessaging(firebaseApp);
    return messagingInstance;
  } catch (err) {
    console.warn("[Firebase] Messaging not supported:", err);
    return null;
  }
}

export async function getFCMToken(): Promise<string | null> {
  if (isNative()) return null;

  try {
    const messaging = await getFirebaseMessaging();
    if (!messaging) return null;

    if (!("serviceWorker" in navigator)) return null;

    const permission = await Notification.requestPermission();
    if (permission !== "granted") return null;

    const registration = await navigator.serviceWorker.register("/firebase-messaging-sw.js");
    await navigator.serviceWorker.ready;

    const { getToken } = await import("firebase/messaging");
    const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;

    const token = await getToken(messaging, {
      vapidKey: vapidKey || undefined,
      serviceWorkerRegistration: registration,
    });

    return token || null;
  } catch (err) {
    console.error("[Firebase] Failed to get FCM token:", err);
    return null;
  }
}

let onMessageFn: any = null;

export async function setupForegroundMessages(callback: (payload: any) => void): Promise<(() => void) | null> {
  if (isNative() || !messagingInstance) return null;

  try {
    if (!onMessageFn) {
      const mod = await import("firebase/messaging");
      onMessageFn = mod.onMessage;
    }
    const unsubscribe = onMessageFn(messagingInstance, (payload: any) => {
      callback(payload);
    });
    return unsubscribe;
  } catch {
    return null;
  }
}

export function onForegroundMessage(callback: (payload: any) => void): (() => void) | null {
  if (isNative() || !messagingInstance || !onMessageFn) return null;

  try {
    return onMessageFn(messagingInstance, (payload: any) => {
      callback(payload);
    });
  } catch {
    return null;
  }
}
