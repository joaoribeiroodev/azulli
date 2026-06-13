/**
 * Formata um número de WhatsApp BR para exibição.
 * Aceita strings sujas (com ou sem máscara) e produz "(71) 99999-9999".
 */
export function formatWhatsAppBR(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 11)

  if (digits.length <= 2) return digits
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`
  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`
  }
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`
}

/**
 * Converte WhatsApp BR para o formato E.164 (+5571999999999).
 * Espera 10 ou 11 dígitos (DDD + número).
 */
export function toE164BR(value: string): string {
  const digits = value.replace(/\D/g, "")
  return `+55${digits}`
}