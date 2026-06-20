import type { NextConfig } from "next";

const FINDER_CACHE = "public, max-age=31536000, immutable";
const FINDER_HTML_CACHE = "public, max-age=0, must-revalidate";

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
    "/api/finder/[[...slug]]": ["./apps/finder/**/*"],
    "/api/internal/finder/convert-lead": ["./apps/finder/**/*"],
  },
  async headers() {
    return [
      {
        source: "/finder/js/:path*",
        headers: [{ key: "Cache-Control", value: FINDER_CACHE }],
      },
      {
        source: "/finder/css/:path*",
        headers: [{ key: "Cache-Control", value: FINDER_CACHE }],
      },
      {
        source: "/finder/index.html",
        headers: [{ key: "Cache-Control", value: FINDER_HTML_CACHE }],
      },
      {
        source: "/finder",
        headers: [{ key: "Cache-Control", value: FINDER_HTML_CACHE }],
      },
    ];
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
