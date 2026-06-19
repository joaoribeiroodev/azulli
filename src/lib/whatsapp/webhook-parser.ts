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
  /** Número ou JID completo para Evolution sendText (quando disponível). */
  evolutionSendNumber?: string
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

type MessageKey = {
  remoteJid?: string
  remoteJidAlt?: string
  participant?: string
  participantAlt?: string
  fromMe?: boolean
  id?: string
}

function isLidJid(jid: string): boolean {
  return jid.includes("@lid")
}

function isPhoneJid(jid: string): boolean {
  return (
    jid.includes("@s.whatsapp.net") ||
    jid.includes("@c.us") ||
    jid.includes("@whatsapp.net")
  )
}

function phoneDigitsFromJid(jid: string): string | null {
  if (!jid || isLidJid(jid) || !isPhoneJid(jid)) return null
  const user = jid.split("@")[0]?.split(":")[0] ?? ""
  const digits = user.replace(/\D/g, "")
  if (digits.length < 10) return null
  return normalizePhone(digits)
}

function resolveSenderPhone(
  body: Record<string, unknown>,
  key: MessageKey | undefined
): { phone: string; evolutionSendNumber?: string } | null {
  const jidCandidates = [
    key?.remoteJidAlt,
    key?.remoteJid,
    key?.participantAlt,
    key?.participant,
  ]

  for (const jid of jidCandidates) {
    if (!jid) continue
    const digits = phoneDigitsFromJid(jid)
    if (digits) {
      return { phone: digits, evolutionSendNumber: jid.split(":")[0] }
    }
  }

  const sender = body.sender
  if (typeof sender === "string") {
    if (sender.includes("@")) {
      const digits = phoneDigitsFromJid(sender)
      if (digits) return { phone: digits, evolutionSendNumber: sender.split(":")[0] }
    } else {
      const digits = sender.replace(/\D/g, "")
      if (digits.length >= 10) return { phone: normalizePhone(digits) }
    }
  }

  // Último recurso: LID sem telefone resolvido — Evolution sendText falha com @lid
  const lidJid = jidCandidates.find((j) => j && isLidJid(j))
  if (lidJid) {
    console.warn(
      "[webhook-parser] remoteJid @lid sem remoteJidAlt — mensagem ignorada:",
      lidJid
    )
    return null
  }

  return null
}

function extractMessageText(message: Record<string, unknown> | undefined): string {
  if (!message) return ""

  if (typeof message.conversation === "string") return message.conversation

  const extended = message.extendedTextMessage as { text?: string } | undefined
  if (extended?.text) return extended.text

  const image = message.imageMessage as { caption?: string } | undefined
  if (image?.caption) return image.caption

  const video = message.videoMessage as { caption?: string } | undefined
  if (video?.caption) return video.caption

  const document = message.documentMessage as { caption?: string } | undefined
  if (document?.caption) return document.caption

  const buttons = message.buttonsResponseMessage as {
    selectedDisplayText?: string
  } | undefined
  if (buttons?.selectedDisplayText) return buttons.selectedDisplayText

  const list = message.listResponseMessage as { title?: string } | undefined
  if (list?.title) return list.title

  return ""
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
    const key = data.key as MessageKey | undefined
    const message = data.message as Record<string, unknown> | undefined
    const pushName = data.pushName as string | undefined

    const resolved = resolveSenderPhone(body, key)
    if (!resolved) return null

    const fromMe = Boolean(key?.fromMe)
    const text = extractMessageText(message)

    if (!text.trim()) return null

    return {
      eventId: String(key?.id ?? `${resolved.phone}-${Date.now()}`),
      phone: resolved.phone,
      evolutionSendNumber: resolved.evolutionSendNumber,
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
