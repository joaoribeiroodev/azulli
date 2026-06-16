/**
 * Remove o DDI brasileiro (+55) repetido de uma string de dígitos.
 * Usa um while para corrigir dados corrompidos com prefixo duplo ou triplo.
 * Só remove "55" quando sobrariam mais de 11 dígitos, preservando números
 * nacionais com DDD 55 (ex: Maringá/PR: 55 9XXXXXXXX = 11 dígitos).
 */
function stripBRCountryCode(digits: string): string {
  while (digits.startsWith("55") && digits.length > 11) {
    digits = digits.slice(2)
  }
  return digits
}

/**
 * Formata um número de telefone/WhatsApp BR para exibição.
 * Aceita qualquer formato de entrada: E.164 (+5571999999999),
 * só dígitos (71999999999), com máscara ((71) 99999-9999),
 * ou até dados corrompidos com prefixo duplo (+555571...).
 * Produz "(71) 99999-9999".
 */
export function formatWhatsAppBR(value: string): string {
  const digits = stripBRCountryCode(value.replace(/\D/g, "")).slice(0, 11)

  if (digits.length <= 2) return digits
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`
  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`
  }
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`
}

/**
 * Converte qualquer formato BR para E.164 (+5571999999999).
 * Seguro para entrada já em E.164 (não duplica o +55).
 */
export function toE164BR(value: string): string {
  const national = stripBRCountryCode(value.replace(/\D/g, ""))
  return `+55${national}`
}

/**
 * Retorna apenas DDD + número, sem país e sem formatação.
 * Formato que o Asaas espera: "71999999999".
 */
export function toAsaasPhone(value: string): string {
  return stripBRCountryCode(value.replace(/\D/g, ""))
}
