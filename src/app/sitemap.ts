import type { MetadataRoute } from "next"

import { env } from "@/lib/env"
import { LEGAL_PATHS } from "@/lib/legal/paths"

export default function sitemap(): MetadataRoute.Sitemap {
  const base = env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "")

  return [
    { url: base, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/login`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${base}/register`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}${LEGAL_PATHS.terms}`, changeFrequency: "yearly", priority: 0.4 },
    {
      url: `${base}${LEGAL_PATHS.privacy}`,
      changeFrequency: "yearly",
      priority: 0.4,
    },
  ]
}
