/******/ (() => { // webpackBootstrap
var __webpack_exports__ = {};
self.addEventListener("install", ev => {
  console.log("Installed custom worker");
  self.skipWaiting();
});
self.addEventListener("activate", async ev => {
  console.log("Activated custom worker");
  await clients.claim();
});
self.addEventListener("push", ev => {
  var _ev$data;
  const data = ev === null || ev === void 0 ? void 0 : (_ev$data = ev.data) === null || _ev$data === void 0 ? void 0 : _ev$data.json();
  if (!(data !== null && data !== void 0 && data.title) || !(data !== null && data !== void 0 && data.message)) {
    console.log("No title OR message in the data object.");
    return;
  }
  ev.waitUntil(self.registration.showNotification(data === null || data === void 0 ? void 0 : data.title, {
    body: data === null || data === void 0 ? void 0 : data.message,
    icon: "/icon-192x192.png",
    badge: "/icon-192x192.png",
    data: {
      destinationURL: (data === null || data === void 0 ? void 0 : data.destinationURL) || "/"
    }
  }));
});
self.addEventListener("notificationclick", ev => {
  var _ev$notification, _ev$notification$data;
  ev.notification.close();
  console.log("NOTIFICATION CLICKED!", ev);
  clients.openWindow((ev === null || ev === void 0 ? void 0 : (_ev$notification = ev.notification) === null || _ev$notification === void 0 ? void 0 : (_ev$notification$data = _ev$notification.data) === null || _ev$notification$data === void 0 ? void 0 : _ev$notification$data.destinationURL) || "/", "_blank");
});
/******/ })()
;