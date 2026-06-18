/**
 * Domínios marketing vs app (edge-safe — usado no proxy).
 *
 * - azulli.app.br → landing em `/`
 * - use.azulli.app.br (NEXT_PUBLIC_APP_URL) → `/` redireciona a login ou dashboard
 */

const MARKETING_HOSTS = new Set(["azulli.app.br", "www.azulli.app.br"])

/** Hosts do app — fixos para não depender só de NEXT_PUBLIC_APP_URL no deploy. */
const APP_PRODUCT_HOSTS = new Set(["use.azulli.app.br", "www.use.azulli.app.br"])

export function getAppHostnameFromEnv(): string {
  const raw = process.env.NEXT_PUBLIC_APP_URL
  if (raw) {
    try {
      return new URL(raw).hostname.toLowerCase()
    } catch {
      /* ignore */
    }
  }
  return "use.azulli.app.br"
}

function normalizeHost(hostname: string): string {
  return hostname.toLowerCase().split(":")[0]
}

export function isMarketingHost(hostname: string): boolean {
  return MARKETING_HOSTS.has(normalizeHost(hostname))
}

/** Host do produto (app): não é marketing nem localhost de dev. */
export function isAppProductHost(hostname: string): boolean {
  const host = normalizeHost(hostname)
  if (host === "localhost" || host === "127.0.0.1") {
    return false
  }
  if (isMarketingHost(host)) return false
  if (APP_PRODUCT_HOSTS.has(host)) return true
  const appHost = getAppHostnameFromEnv()
  return host === appHost || host === `www.${appHost}`
}
