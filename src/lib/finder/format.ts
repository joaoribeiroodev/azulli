import type { Lead } from "@/lib/finder/types"

export function fmtDate(dt: string | null | undefined): string {
  if (!dt) return "—"
  try {
    const d = new Date(dt)
    return d.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })
  } catch {
    return "—"
  }
}

export function fmtPhone(t: string | null | undefined): string {
  if (!t) return "—"
  const d = String(t).replace(/\D/g, "")
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return t
}

export function whatsappLink(t: string | null | undefined): string | null {
  if (!t) return null
  const d = String(t).replace(/\D/g, "")
  if (!d) return null
  const intl = d.startsWith("55") ? d : `55${d}`
  return `https://wa.me/${intl}`
}

export function mapsSearchLink(lead: Pick<Lead, "nome" | "endereco">): string {
  const q = encodeURIComponent(`${lead.nome || ""} ${lead.endereco || ""}`.trim())
  return `https://www.google.com/maps/search/${q}`
}
