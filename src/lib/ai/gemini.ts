import { GoogleGenerativeAI } from "@google/generative-ai"
import { env } from "@/lib/env"

let cachedClient: GoogleGenerativeAI | null = null

/**
 * Retorna o client Gemini ou null se a env var não está configurada.
 *
 * Tudo que depende de IA deve checar `if (!client) return fallback` —
 * o produto funciona sem IA, só perde a sugestão automática.
 */
export function getGeminiClient(): GoogleGenerativeAI | null {
  if (!env.GOOGLE_GENERATIVE_AI_API_KEY) return null
  if (!cachedClient) {
    cachedClient = new GoogleGenerativeAI(env.GOOGLE_GENERATIVE_AI_API_KEY)
  }
  return cachedClient
}

export const GEMINI_FLASH_MODEL = "gemini-2.5-flash"
