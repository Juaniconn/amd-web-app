import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /*
    Empaquetado independiente para el VPS de Oracle Cloud.

    `standalone` hace que `next build` genere `.next/standalone/` con un
    `server.js` mínimo y SOLO los node_modules que el runtime necesita
    (~150 MB en vez de los 1.1 GB de node_modules completo). Eso permite
    desplegar sin correr `npm install` en el servidor.

    Tras el build hay que copiar a mano `public/` y `.next/static/`
    (el server.js no los incluye) — el script scripts/deploy/build.sh lo hace.

    Arranque: PORT=3000 HOSTNAME=0.0.0.0 node server.js
  */
  output: "standalone",

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
