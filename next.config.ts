import type { NextConfig } from "next";

const productionApiUrl = process.env.NEXT_PUBLIC_API_URL;
const isProductionBuild =
  process.env.NODE_ENV === "production" ||
  process.env.NEXT_PHASE === "phase-production-build";

if (
  isProductionBuild &&
  productionApiUrl &&
  /^https?:\/\/(?:localhost|127\.0\.0\.1)(?::|\/|$)/i.test(productionApiUrl)
) {
  throw new Error(
    "NEXT_PUBLIC_API_URL must not point to localhost or 127.0.0.1 for production builds.",
  );
}

const nextConfig: NextConfig = {
  output: "export",
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
