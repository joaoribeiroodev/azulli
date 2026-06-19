/**
 * Normaliza telefone para comparação/armazenamento (apenas dígitos, com DDI Brasil).
 */
export function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, "")
  if (digits.length === 10 || digits.length === 11) {
    return `55${digits}`
  }
  return digits
}

export type ParsedWhatsAppEvent = {
  eventId: string
  phone: string
  name: string | null
  text: string
  fromMe: boolean
  utm?: {
    source?: string
    medium?: string
    campaign?: string
    content?: string
  }
}

/**
 * Parser unificado Evolution API / Z-API (payloads comuns).
 */
export function parseWhatsAppWebhook(body: Record<string, unknown>): ParsedWhatsAppEvent | null {
  // Z-API style
  if (typeof body.phone === "string" && body.text && typeof body.text === "object") {
    const textObj = body.text as { message?: string }
    const message = textObj.message ?? ""
    if (!message.trim()) return null
    return {
      eventId: String(body.messageId ?? body.id ?? `${body.phone}-${Date.now()}`),
      phone: normalizePhone(body.phone),
      name: typeof body.senderName === "string" ? body.senderName : null,
      text: message.trim(),
      fromMe: Boolean(body.fromMe),
      utm: extractUtm(body),
    }
  }

  // Evolution API v2 — messages.upsert
  const data = body.data as Record<string, unknown> | undefined
  if (data && typeof data === "object") {
    const key = data.key as { remoteJid?: string; fromMe?: boolean } | undefined
    const message = data.message as Record<string, unknown> | undefined
    const pushName = data.pushName as string | undefined

    const remoteJid = key?.remoteJid ?? ""
    const phoneRaw = remoteJid.split("@")[0] ?? ""
    if (!phoneRaw) return null

    const fromMe = Boolean(key?.fromMe)
    const text =
      (message?.conversation as string) ??
      (message?.extendedTextMessage as { text?: string })?.text ??
      ""

    if (!text.trim()) return null

    return {
      eventId: String(
        (key as { id?: string })?.id ?? `${phoneRaw}-${Date.now()}`
      ),
      phone: normalizePhone(phoneRaw),
      name: pushName ?? null,
      text: text.trim(),
      fromMe,
      utm: extractUtm(body),
    }
  }

  // Evolution flat fallback
  if (typeof body.from === "string" && typeof body.body === "string") {
    return {
      eventId: String(body.id ?? `${body.from}-${Date.now()}`),
      phone: normalizePhone(body.from),
      name: typeof body.pushName === "string" ? body.pushName : null,
      text: body.body.trim(),
      fromMe: Boolean(body.fromMe),
      utm: extractUtm(body),
    }
  }

  return null
}

function extractUtm(body: Record<string, unknown>): ParsedWhatsAppEvent["utm"] {
  const utm =
    (body.utm as Record<string, string> | undefined) ??
    (body.metadata as Record<string, string> | undefined)
  if (!utm) return undefined
  return {
    source: utm.utm_source ?? utm.source,
    medium: utm.utm_medium ?? utm.medium,
    campaign: utm.utm_campaign ?? utm.campaign,
    content: utm.utm_content ?? utm.content,
  }
}
