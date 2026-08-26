import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["pdf-parse", "dxf-parser", "@cursor/sdk", "jszip"],
  allowedDevOrigins: [
    "192.168.*.*",
    "10.*.*.*",
    ...Array.from({ length: 16 }, (_, index) => `172.${16 + index}.*.*`),
    "*.local",
    // Túneles de desarrollo remoto (Cloudflare Quick Tunnel / ngrok).
    // Sin esto el websocket de hot-reload devuelve "Unauthorized" y la
    // consola del navegador se llena de errores, aunque la app cargue bien.
    "*.trycloudflare.com",
    "*.ngrok-free.app",
    "*.ngrok.io",
  ],
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
