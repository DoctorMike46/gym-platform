import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";

const withSerwist = withSerwistInit({
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
  cacheOnNavigation: false,
  reloadOnOnline: true,
  // PWA disabilitata: bug build non-deterministico con @serwist/next 9.5.7 + Next 15.5
  // ("Cannot read properties of undefined (reading 'call')" in webpack-runtime random).
  // Da reabilitare dopo upgrade Serwist o dopo aver isolato il root cause.
  disable: true,
});

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
};

export default withSerwist(nextConfig);
