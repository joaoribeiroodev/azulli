import crypto from "crypto"

/** Comparação timing-safe para tokens de webhook (header x-api-key, etc.). */
export function compareApiKey(incoming: string, expected: string): boolean {
  if (!expected || !incoming) return false
  try {
    const bufA = Buffer.from(incoming)
    const bufB = Buffer.from(expected)
    if (bufA.length !== bufB.length) return false
    return crypto.timingSafeEqual(bufA, bufB)
  } catch {
    return false
  }
}
