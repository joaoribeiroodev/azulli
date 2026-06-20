import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [
    "pdf-lib",
    "puppeteer",
    "pg",
    "bcryptjs",
    "jsonwebtoken",
    "openai",
  ],
  outputFileTracingIncludes: {
    "/api/finder/[[...slug]]": ["./apps/finder/**/*"],
    "/api/internal/finder/convert-lead": ["./apps/finder/**/*"],
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
};

export default nextConfig;
