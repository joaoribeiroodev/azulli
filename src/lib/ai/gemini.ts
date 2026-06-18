import { GoogleGenerativeAI } from "@google/generative-ai"
import { env } from "@/lib/env"

let cachedOfxClient: GoogleGenerativeAI | null = null
let cachedAssistantClient: GoogleGenerativeAI | null = null

export type AssistantMode = "llm" | "rules" | "auto"

/**
 * Client Gemini para importação OFX (categorização).
 * Usa GOOGLE_GENERATIVE_AI_API_KEY — não compete com chave só do assistente.
 */
export function getGeminiClientForOfx(): GoogleGenerativeAI | null {
  if (!env.GOOGLE_GENERATIVE_AI_API_KEY) return null
  if (!cachedOfxClient) {
    cachedOfxClient = new GoogleGenerativeAI(env.GOOGLE_GENERATIVE_AI_API_KEY)
  }
  return cachedOfxClient
}

/**
 * Client Gemini para o assistente conversacional.
 * Pode usar GOOGLE_GENERATIVE_AI_ASSISTANT_KEY separada (quota isolada).
 */
export function getGeminiClientForAssistant(): GoogleGenerativeAI | null {
  const key =
    env.GOOGLE_GENERATIVE_AI_ASSISTANT_KEY ?? env.GOOGLE_GENERATIVE_AI_API_KEY
  if (!key) return null
  if (!cachedAssistantClient) {
    cachedAssistantClient = new GoogleGenerativeAI(key)
  }
  return cachedAssistantClient
}

/** @deprecated Use getGeminiClientForOfx ou getGeminiClientForAssistant */
export function getGeminiClient(): GoogleGenerativeAI | null {
  return getGeminiClientForOfx()
}

export function getAssistantMode(): AssistantMode {
  const mode = env.ASSISTANT_MODE
  if (mode === "llm" || mode === "rules" || mode === "auto") return mode
  return "auto"
}

export function isAssistantLlmEnabled(): boolean {
  return getAssistantMode() !== "rules"
}

export function getAssistantDailyLlmLimit(): number {
  return env.ASSISTANT_DAILY_LLM_LIMIT ?? 15
}

export const GEMINI_FLASH_MODEL = "gemini-2.5-flash"

/** Fallback quando o modelo principal atinge quota ou não está disponível. */
export const GEMINI_FLASH_FALLBACK_MODELS = [
  "gemini-2.0-flash",
  "gemini-2.0-flash-lite",
] as const
