importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyAO8ue4BLcW8XARCpsLgkgOJ7ob44nUR5A",
  authDomain: "ignytlive.firebaseapp.com",
  projectId: "ignytlive",
  storageBucket: "ignytlive.firebasestorage.app",
  messagingSenderId: "819835416231",
  appId: "1:819835416231:web:615144803b09d8f80db582",
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const notificationTitle = payload.notification?.title || payload.data?.title || "IgnytLive";
  const notificationOptions = {
    body: payload.notification?.body || payload.data?.body || "",
    icon: payload.notification?.icon || "/icon-192.png",
    badge: "/icon-192.png",
    tag: payload.data?.tag || "ignytlive",
    data: payload.data || {},
    vibrate: [200, 100, 200],
  };

  return self.registration.showNotification(notificationTitle, notificationOptions);
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      return self.clients.openWindow(url);
    })
  );
});
