import "server-only"
import { Resend } from "resend"
import { env } from "@/lib/env"

let cachedClient: Resend | null = null

/**
 * Cliente Resend singleton.
 * Retorna `null` quando RESEND_API_KEY não está configurado — os jobs de
 * email devem fazer graceful skip nesse caso.
 */
export function getResendClient(): Resend | null {
  if (cachedClient) return cachedClient
  const apiKey = env.RESEND_API_KEY
  if (!apiKey) return null
  cachedClient = new Resend(apiKey)
  return cachedClient
}

/**
 * Email "from" padrão. Usa env ou fallback no localhost pra dev.
 */
export function getFromEmail(): string {
  return env.RESEND_FROM_EMAIL ?? "Azulli <noreply@example.com>"
}
