import { z } from "zod"

/** Normaliza valores lidos de .env / .env.local */
function emptyToUndefined(value: string | undefined): string | undefined {
  if (value === undefined || value.trim() === "") return undefined
  return value.trim()
}

function stripQuotes(value: string | undefined): string | undefined {
  if (!value) return value
  const trimmed = value.trim()
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1).trim()
  }
  return trimmed
}

const emailFromSchema = z
  .string()
  .regex(
    /^(?:[^<>\s]+@[^<>\s]+\.[^<>\s]+|[^<>]+<[^<>\s]+@[^<>\s]+\.[^<>\s]+>)$/,
    "Formato inválido. Use 'email@dominio.com' ou 'Nome <email@dominio.com>'."
  )

const envSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  NEXT_PUBLIC_APP_URL: z.string().url(),
  ASAAS_API_KEY: z.string().optional(),
  ASAAS_BASE_URL: z.string().url().optional(),
  ASAAS_WEBHOOK_TOKEN: z.string().optional(),
  GOOGLE_GENERATIVE_AI_API_KEY: z.string().optional(),
  /** Chave opcional só do assistente (quota separada da importação OFX). */
  GOOGLE_GENERATIVE_AI_ASSISTANT_KEY: z.string().optional(),
  /**
   * llm = só Gemini · rules = consultas automáticas (sem quota) · auto = LLM com fallback
   */
  ASSISTANT_MODE: z.enum(["llm", "rules", "auto"]).optional(),
  /** Limite de mensagens/dia que usam LLM no modo auto (protege quota free tier). */
  ASSISTANT_DAILY_LLM_LIMIT: z.coerce.number().int().positive().optional(),
  RESEND_API_KEY: z.string().optional(),
  /**
   * Aceita "user@domain.com" OU "Nome Exibição <user@domain.com>" (RFC 5322).
   * Aspas no .env.local são removidas antes da validação.
   */
  RESEND_FROM_EMAIL: emailFromSchema.optional(),
  CRON_SECRET: z.string().optional(),
})

const parsed = envSchema.safeParse({
  NEXT_PUBLIC_SUPABASE_URL: emptyToUndefined(
    process.env.NEXT_PUBLIC_SUPABASE_URL
  ),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: emptyToUndefined(
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ),
  NEXT_PUBLIC_APP_URL: emptyToUndefined(process.env.NEXT_PUBLIC_APP_URL),
  ASAAS_API_KEY: emptyToUndefined(process.env.ASAAS_API_KEY),
  ASAAS_BASE_URL: emptyToUndefined(process.env.ASAAS_BASE_URL),
  ASAAS_WEBHOOK_TOKEN: emptyToUndefined(process.env.ASAAS_WEBHOOK_TOKEN),
  GOOGLE_GENERATIVE_AI_API_KEY: emptyToUndefined(
    process.env.GOOGLE_GENERATIVE_AI_API_KEY
  ),
  GOOGLE_GENERATIVE_AI_ASSISTANT_KEY: emptyToUndefined(
    process.env.GOOGLE_GENERATIVE_AI_ASSISTANT_KEY
  ),
  ASSISTANT_MODE: (() => {
    const v = emptyToUndefined(process.env.ASSISTANT_MODE)
    if (v === "llm" || v === "rules" || v === "auto") return v
    return undefined
  })(),
  ASSISTANT_DAILY_LLM_LIMIT: (() => {
    const raw = emptyToUndefined(process.env.ASSISTANT_DAILY_LLM_LIMIT)
    if (!raw) return undefined
    const n = Number(raw)
    return Number.isFinite(n) && n > 0 ? n : undefined
  })(),
  RESEND_API_KEY: emptyToUndefined(process.env.RESEND_API_KEY),
  RESEND_FROM_EMAIL: (() => {
    const raw = emptyToUndefined(process.env.RESEND_FROM_EMAIL)
    if (!raw) return undefined
    return stripQuotes(raw)
  })(),
  CRON_SECRET: emptyToUndefined(process.env.CRON_SECRET),
})

if (!parsed.success) {
  console.error(
    "❌ Variáveis de ambiente inválidas:",
    parsed.error.flatten().fieldErrors
  )
  throw new Error("Variáveis de ambiente inválidas. Verifique seu .env.local")
}

export const env = parsed.data
