/**
 * Domínios marketing vs app vs admin (edge-safe — usado no proxy).
 */

const MARKETING_HOSTS = new Set(["azulli.app.br", "www.azulli.app.br"])

const APP_PRODUCT_HOSTS = new Set(["use.azulli.app.br", "www.use.azulli.app.br"])

const ADMIN_HOSTS = new Set(["admin.azulli.app.br", "www.admin.azulli.app.br"])

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

export function getAdminHostnameFromEnv(): string {
  const raw = process.env.NEXT_PUBLIC_ADMIN_URL
  if (raw) {
    try {
      return new URL(raw).hostname.toLowerCase()
    } catch {
      /* ignore */
    }
  }
  return "admin.azulli.app.br"
}

function normalizeHost(hostname: string): string {
  return hostname.toLowerCase().split(":")[0]
}

export function isMarketingHost(hostname: string): boolean {
  return MARKETING_HOSTS.has(normalizeHost(hostname))
}

export function isAdminHost(hostname: string): boolean {
  const host = normalizeHost(hostname)
  if (ADMIN_HOSTS.has(host)) return true
  const adminHost = getAdminHostnameFromEnv()
  return host === adminHost || host === `www.${adminHost}`
}

export function isAppProductHost(hostname: string): boolean {
  const host = normalizeHost(hostname)
  if (host === "localhost" || host === "127.0.0.1") {
    return false
  }
  if (isMarketingHost(host)) return false
  if (isAdminHost(host)) return false
  if (APP_PRODUCT_HOSTS.has(host)) return true
  const appHost = getAppHostnameFromEnv()
  return host === appHost || host === `www.${appHost}`
}
