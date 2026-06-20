import type { PitchCanal, PitchStored } from "@/lib/finder/types"

export function parsePitchStored(stored: string | null | undefined): PitchStored | null {
  if (!stored || typeof stored !== "string") return null
  const trimmed = stored.trim()
  if (!trimmed) return null
  if (!trimmed.startsWith("{")) {
    return { v: 1, legacy: true, canal: "whatsapp", mensagem: trimmed, corpo: trimmed }
  }
  try {
    return JSON.parse(trimmed) as PitchStored
  } catch {
    return { v: 1, legacy: true, canal: "whatsapp", mensagem: trimmed, corpo: trimmed }
  }
}

export function getPitchCopyText(
  stored: string | null | undefined,
  canal: PitchCanal = "whatsapp",
  variant: "default" | "pos_optin" | "follow_up" = "default"
): string {
  const parsed = parsePitchStored(stored)
  if (!parsed) return ""
  if (canal === "email") {
    if (parsed.assunto && parsed.corpo) return `Assunto: ${parsed.assunto}\n\n${parsed.corpo}`
    return parsed.corpo || parsed.mensagem || stored || ""
  }
  if (variant === "pos_optin" && parsed.mensagem_pos_optin) return parsed.mensagem_pos_optin
  if (variant === "follow_up" && parsed.follow_up) return parsed.follow_up
  return parsed.mensagem || parsed.corpo || stored || ""
}
