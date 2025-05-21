self.addEventListener("install", (ev) => {
  console.log("Installed custom worker");
  self.skipWaiting();
});

self.addEventListener("activate", async (ev) => {
  console.log("Activated custom worker");

  await clients.claim();
});

self.addEventListener("push", (ev) => {
  const data = ev?.data?.json();

  if (!data?.title || !data?.message) {
    console.log("No title OR message in the data object.");
    return;
  }

  ev.waitUntil(
    self.registration.showNotification(data?.title, {
      body: data?.message,
      icon: "/icon-192x192.png",
      badge: "/icon-192x192.png",
      data: { destinationURL: data?.destinationURL || "/" },
    })
  );
});

self.addEventListener("notificationclick", (ev) => {
  ev.notification.close();

  console.log("NOTIFICATION CLICKED!", ev);
  clients.openWindow(ev?.notification?.data?.destinationURL || "/", "_blank");
});
