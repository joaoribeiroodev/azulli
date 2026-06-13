/**
 * Formata BRL: 1234.56 → "R$ 1.234,56"
 */
export function formatBRL(value: number | string): string {
  const num = typeof value === "string" ? parseFloat(value) : value
  if (!Number.isFinite(num)) return "R$ 0,00"
  return num.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  })
}

/**
 * Parse de string "R$ 1.234,56" ou "1234,56" → 1234.56
 * Usado nos formulários antes de mandar pro Supabase.
 */
export function parseBRL(input: string): number {
  const cleaned = input.replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", ".")
  const num = parseFloat(cleaned)
  return Number.isFinite(num) ? num : 0
}

/**
 * Máscara de entrada para inputs de moeda.
 * Aceita digitação livre e formata para "1.234,56".
 */
export function maskBRL(input: string): string {
  const digits = input.replace(/\D/g, "")
  if (!digits) return ""
  const num = parseInt(digits, 10) / 100
  return num.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}