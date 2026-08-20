import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["pdf-parse", "dxf-parser", "@cursor/sdk", "jszip"],
  allowedDevOrigins: [
    "192.168.*.*",
    "10.*.*.*",
    ...Array.from({ length: 16 }, (_, index) => `172.${16 + index}.*.*`),
    "*.local",
  ],
};

export default nextConfig;
