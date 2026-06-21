type SharedCookieOptions = {
  domain?: string
  secure?: boolean
  sameSite?: boolean | "lax" | "strict" | "none"
  path?: string
  maxAge?: number
  expires?: Date
  httpOnly?: boolean
}

/**
 * Compartilha sessão Supabase entre subdomínios *.azulli.app.br
 * (use, trial, admin, finder, marketing com auth).
 */
export function getSupabaseCookieOptions(): SharedCookieOptions | undefined {
  if (process.env.NODE_ENV !== "production") return undefined

  const candidates = [
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.NEXT_PUBLIC_TRIAL_URL,
  ].filter(Boolean) as string[]

  for (const raw of candidates) {
    try {
      const hostname = new URL(raw).hostname.toLowerCase()
      if (hostname === "azulli.app.br" || hostname.endsWith(".azulli.app.br")) {
        return {
          domain: ".azulli.app.br",
          secure: true,
          sameSite: "lax",
          path: "/",
        }
      }
    } catch {
      /* ignore */
    }
  }

  return undefined
}

export function mergeSupabaseCookieOptions(
  options?: SharedCookieOptions
): SharedCookieOptions {
  const shared = getSupabaseCookieOptions()
  if (!shared) return options ?? {}
  return { ...options, ...shared }
}
