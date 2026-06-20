import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [
    "pdf-lib",
    "puppeteer",
    "puppeteer-core",
    "@sparticuz/chromium-min",
    "pg",
    "bcryptjs",
    "jsonwebtoken",
    "openai",
  ],
  outputFileTracingIncludes: {
    "/api/finder/[[...slug]]": ["./src/lib/finder/server/**/*"],
    "/api/internal/finder/convert-lead": ["./src/lib/finder/server/**/*"],
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
