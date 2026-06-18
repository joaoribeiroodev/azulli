type GeminiLikeError = {
  status?: number
  message?: string
  errorDetails?: Array<{
    "@type"?: string
    retryDelay?: string
    violations?: Array<{ quotaMetric?: string }>
  }>
}

/**
 * Erro de quota / rate limit do Gemini.
 */
export function isGeminiQuotaError(err: unknown): boolean {
  const e = err as GeminiLikeError
  const msg = e?.message ?? String(err)
  return e?.status === 429 || msg.includes("429") || /quota/i.test(msg)
}

/** Modelo indisponível, quota ou erro transitório — tenta próximo modelo ou rules. */
export function isGeminiRetryableError(err: unknown): boolean {
  const e = err as GeminiLikeError
  const status = e?.status
  const msg = e?.message ?? String(err)
  if (isGeminiQuotaError(err)) return true
  if (status === 404 || status === 503) return true
  if (/not found|not supported for generatecontent/i.test(msg)) return true
  return false
}

/**
 * Mensagem amigável para erros da API Gemini (quota, rate limit, etc.).
 */
export function formatGeminiUserError(err: unknown): string {
  const e = err as GeminiLikeError
  const msg = e?.message ?? String(err)

  if (isGeminiQuotaError(err)) {
    const retrySec = parseRetrySeconds(msg, e)
    const retryHint =
      retrySec > 0
        ? ` Tente novamente em cerca de ${formatRetryWait(retrySec)}.`
        : " Tente novamente mais tarde ou amanhã."

    return (
      "Limite da API Gemini (plano gratuito) atingido. O assistente usa consultas automáticas como fallback; a importação OFX usa quota separada se você configurar GOOGLE_GENERATIVE_AI_ASSISTANT_KEY." +
      retryHint +
      " Veja uso em https://ai.dev/rate-limit ou habilite billing no Google AI Studio."
    )
  }

  if (e?.status === 503 || msg.includes("503")) {
    return "Serviço de IA temporariamente indisponível. Tente em alguns minutos."
  }

  return "Algo deu errado processando sua pergunta. Tente de novo."
}

function parseRetrySeconds(msg: string, e: GeminiLikeError): number {
  const fromDetails = e.errorDetails?.find(
    (d) => d["@type"]?.includes("RetryInfo")
  )
  if (fromDetails?.retryDelay) {
    const n = Number(fromDetails.retryDelay.replace(/s$/, ""))
    if (!Number.isNaN(n) && n > 0) return Math.ceil(n)
  }
  const m = msg.match(/retry in ([\d.]+)s/i)
  if (m) return Math.ceil(Number(m[1]))
  return 0
}

function formatRetryWait(seconds: number): string {
  if (seconds < 120) return `${seconds} segundos`
  const min = Math.ceil(seconds / 60)
  return `${min} minuto${min > 1 ? "s" : ""}`
}
