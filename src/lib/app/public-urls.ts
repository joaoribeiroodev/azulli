/**
 * URLs públicas absolutas (marketing, e-mails, redirects entre subdomínios).
 */

export function getAppBaseUrl(): string {
  const raw = process.env.NEXT_PUBLIC_APP_URL
  if (raw) return raw.replace(/\/$/, "")
  return "https://use.azulli.app.br"
}

export function getTrialBaseUrl(): string | null {
  const raw = process.env.NEXT_PUBLIC_TRIAL_URL
  if (!raw?.trim()) return null
  return raw.trim().replace(/\/$/, "")
}

/** URL de cadastro trial — preferir subdomínio dedicado quando configurado. */
export function getRegisterUrl(): string {
  const trial = getTrialBaseUrl()
  if (trial) return `${trial}/register`
  return "/register"
}

/** Login do app (assinantes existentes). */
export function getLoginUrl(): string {
  return `${getAppBaseUrl()}/login`
}

/** Redireciona rotas do app após onboarding (fora do subdomínio trial). */
export function getAppPath(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`
  return `${getAppBaseUrl()}${normalized}`
}
