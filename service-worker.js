self.addEventListener("push", (event) => {
  let payload = {};
  try { payload = event.data ? event.data.json() : {}; }
  catch { payload = { body: event.data?.text() || "Tienes un recordatorio pendiente." }; }

  const notification = payload.notification || payload;
  const data = payload.data || {};
  const title = notification.title || "Recordatorio de DigitCong";
  const options = {
    body: notification.body || "Tienes una tarea pendiente.",
    icon: notification.icon || "assets/icon-192.png",
    badge: notification.badge || "assets/icon-192.png",
    tag: notification.tag || "digitcong-recordatorio",
    data: { url: data.url || "tareas.html" },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const destino = new URL(event.notification.data?.url || "tareas.html", self.location.origin).href;
  event.waitUntil((async () => {
    const ventanas = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const ventana of ventanas) {
      if (ventana.url.startsWith(self.location.origin) && "focus" in ventana) {
        await ventana.focus();
        if ("navigate" in ventana) await ventana.navigate(destino);
        return;
      }
    }
    if (self.clients.openWindow) await self.clients.openWindow(destino);
  })());
});
