import { z } from "zod"

const envSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  NEXT_PUBLIC_APP_URL: z.string().url(),
  ASAAS_API_KEY: z.string().optional(),
  ASAAS_BASE_URL: z.string().url().optional(),
  ASAAS_WEBHOOK_TOKEN: z.string().optional(),
})

const parsed = envSchema.safeParse({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  ASAAS_API_KEY: process.env.ASAAS_API_KEY,
  ASAAS_BASE_URL: process.env.ASAAS_BASE_URL,
  ASAAS_WEBHOOK_TOKEN: process.env.ASAAS_WEBHOOK_TOKEN,
})

if (!parsed.success) {
  console.error("❌ Variáveis de ambiente inválidas:", parsed.error.flatten().fieldErrors)
  throw new Error("Variáveis de ambiente inválidas. Verifique seu .env.local")
}

export const env = parsed.data