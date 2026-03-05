self.addEventListener("push", (event) => {
  if (!event.data) return;

  try {
    const payload = event.data.json();
    const options = {
      body: payload.body || "",
      icon: payload.icon || "/icon-192.png",
      badge: payload.badge || "/icon-192.png",
      tag: payload.tag || "ignytlive",
      data: payload.data || {},
      vibrate: [200, 100, 200],
      actions: payload.data?.url
        ? [{ action: "open", title: "Open" }]
        : [],
    };
    event.waitUntil(self.registration.showNotification(payload.title || "IgnytLive", options));
  } catch (e) {
    console.error("[SW] Push parse error:", e);
  }
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
