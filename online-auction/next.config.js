/** @type {import('next').NextConfig} */

const withPWA = require("next-pwa")({
  dest: "public",
  register: true,
  fallbacks: {
    document: "/_offline",
    image: "/offline.png",
  },
});

const nextConfig = withPWA({
  reactStrictMode: true,
  env: {
    API_DOMAIN: "",
  },
});

module.exports = nextConfig;
