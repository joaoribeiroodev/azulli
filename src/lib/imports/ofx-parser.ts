/**
 * Parser OFX puro (sem deps externas).
 *
 * Suporta os 2 dialetos usados pelos bancos brasileiros:
 *   - OFX 1.x (SGML): tags leaf sem closing — `<TRNAMT>10.50` (BB, Itaú, Bradesco, Caixa)
 *   - OFX 2.x (XML):  tags leaf com closing — `<TRNAMT>10.50</TRNAMT>` (Nubank, alguns extratos novos)
 *
 * Estratégia: como tags container (`STMTTRN`, `BANKTRANLIST`) sempre têm closing
 * em ambos os dialetos, isolamos cada bloco `<STMTTRN>...</STMTTRN>` e dentro
 * dele pegamos cada tag leaf via regex `<TAG>VALUE` (parando em newline ou `<`).
 * A mesma regex funciona para SGML e XML.
 */

import type {
  ParsedOfxStatement,
  ParsedOfxTransaction,
} from "@/lib/imports/types"

// ---------------------------------------------------------------------------
// Detecção de charset e decodificação do buffer
// ---------------------------------------------------------------------------

/**
 * Bancos brasileiros costumam mandar OFX 1.x em Windows-1252 (com cedilha
 * e acentos). Olhamos o header `CHARSET:` antes de decodificar o body.
 */
export function detectCharset(headerSection: string): string {
  const m = headerSection.match(/CHARSET:\s*([\w-]+)/i)
  if (!m) return "utf-8"
  const raw = m[1].toLowerCase()
  if (raw === "1252") return "windows-1252"
  if (raw === "8859-1" || raw === "latin1") return "iso-8859-1"
  return raw
}

export function decodeOfxBuffer(buffer: ArrayBuffer): string {
  const probe = new TextDecoder("ascii", { fatal: false }).decode(
    buffer.slice(0, 512)
  )
  const charset = detectCharset(probe)
  try {
    return new TextDecoder(charset, { fatal: false }).decode(buffer)
  } catch {
    return new TextDecoder("utf-8", { fatal: false }).decode(buffer)
  }
}

// ---------------------------------------------------------------------------
// Helpers de extração
// ---------------------------------------------------------------------------

/**
 * Extrai o valor da primeira ocorrência de uma tag leaf no bloco.
 * Funciona pra SGML (`<TAG>VALUE\n`) e XML (`<TAG>VALUE</TAG>`).
 */
function extractTag(block: string, tag: string): string | null {
  const re = new RegExp(`<${tag}>([^<\\r\\n]+)`, "i")
  const m = block.match(re)
  return m?.[1]?.trim() ?? null
}

/**
 * OFX usa formatos: "YYYYMMDD", "YYYYMMDDHHMMSS", ou
 * "YYYYMMDDHHMMSS.SSS[TZ:NAME]". Só precisamos do dia.
 */
function parseOfxDate(raw: string | null): string | null {
  if (!raw) return null
  const m = raw.match(/^(\d{4})(\d{2})(\d{2})/)
  if (!m) return null
  return `${m[1]}-${m[2]}-${m[3]}`
}

/**
 * TRNAMT pode vir com vírgula (raro, mas alguns bancos BR usam) ou ponto.
 */
function parseOfxAmount(raw: string | null): number {
  if (!raw) return NaN
  const normalized = raw.replace(/\s/g, "").replace(",", ".")
  return parseFloat(normalized)
}

// ---------------------------------------------------------------------------
// Parser principal
// ---------------------------------------------------------------------------

export function parseOfx(content: string): ParsedOfxStatement {
  const ofxStart = content.search(/<OFX[\s>]/i)
  const body = ofxStart >= 0 ? content.slice(ofxStart) : content

  const bankId = extractTag(body, "BANKID")
  const accountId = extractTag(body, "ACCTID")

  const listMatch = body.match(
    /<BANKTRANLIST>([\s\S]*?)<\/BANKTRANLIST>/i
  )
  const listRaw = listMatch?.[1] ?? body

  const periodStart = parseOfxDate(extractTag(listRaw, "DTSTART"))
  const periodEnd = parseOfxDate(extractTag(listRaw, "DTEND"))

  const txRegex = /<STMTTRN>([\s\S]*?)<\/STMTTRN>/gi
  const transactions: ParsedOfxTransaction[] = []

  let match: RegExpExecArray | null
  while ((match = txRegex.exec(listRaw)) !== null) {
    const block = match[1]

    const fitId = extractTag(block, "FITID")
    if (!fitId) continue

    const trnAmtRaw = extractTag(block, "TRNAMT")
    const trnAmt = parseOfxAmount(trnAmtRaw)
    if (!Number.isFinite(trnAmt) || trnAmt === 0) continue

    const date = parseOfxDate(extractTag(block, "DTPOSTED"))
    if (!date) continue

    const trnType = (extractTag(block, "TRNTYPE") ?? "").toUpperCase()
    const memo = extractTag(block, "MEMO")
    const name = extractTag(block, "NAME")

    const description =
      [name, memo].filter((s): s is string => Boolean(s)).join(" — ").slice(0, 280) ||
      "Importado do OFX"

    transactions.push({
      fitId,
      ofxType: trnType,
      amount: Math.abs(trnAmt),
      type: trnAmt < 0 ? "expense" : "income",
      date,
      description,
    })
  }

  return {
    bankId,
    accountId,
    periodStart,
    periodEnd,
    transactions,
  }
}
