import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // pdf-parse v2.x pulls in pdfjs-dist and @napi-rs/canvas (native addons).
  // Tell Next.js/Turbopack not to bundle these for the server runtime —
  // they need to be required from node_modules at request time.
  serverExternalPackages: ["pdf-parse", "pdfjs-dist", "@napi-rs/canvas"],
};

export default nextConfig;
