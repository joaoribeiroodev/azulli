/**
 * Tipos compartilhados pelo fluxo de importação OFX.
 *
 * Pipeline:
 *   1. Usuário faz upload do .ofx           → ParsedOfxTransaction[]
 *   2. Servidor cria import_batches + dedup  → ReviewableImportRow[]
 *   3. Usuário revisa/edita                  → ConfirmImportInput
 *   4. Servidor insere em transactions       → success
 */

export type TransactionSource = "manual" | "ofx_import" | "recurring"

export type ImportBatchStatus = "parsed" | "confirmed" | "discarded"

// ---------------------------------------------------------------------------
// 1) Parser → output bruto do OFX
// ---------------------------------------------------------------------------

/**
 * Uma transação bruta lida do OFX, antes de qualquer enriquecimento.
 * Os campos seguem a nomenclatura do OFX 2.x mas valem pro 1.x também.
 */
export type ParsedOfxTransaction = {
  /** FITID do OFX — id estável do banco; usado pra dedup. */
  fitId: string
  /** "DEBIT" | "CREDIT" | "PAYMENT" | "FEE" | "INT" | etc — vindo do OFX. */
  ofxType: string
  /** Valor absoluto (em real). Sinal já decodificado pelo type. */
  amount: number
  /** "income" se TRNAMT > 0, "expense" se TRNAMT < 0. */
  type: "income" | "expense"
  /** Data postada (YYYY-MM-DD). */
  date: string
  /** Descrição combinando MEMO + NAME do OFX. */
  description: string
}

/**
 * Header do extrato: identifica conta/banco. Usado no batch
 * pra mostrar pro usuário "Importando do banco X, conta Y".
 */
export type ParsedOfxStatement = {
  bankId: string | null
  accountId: string | null
  /** ISO date do início do range no OFX. */
  periodStart: string | null
  periodEnd: string | null
  transactions: ParsedOfxTransaction[]
}

// ---------------------------------------------------------------------------
// 2) Linha pronta pra revisão na UI
// ---------------------------------------------------------------------------

/**
 * Após parse + dedup, cada linha vem com um flag `duplicate` indicando
 * se já existe uma transaction com esse fitId pro tenant. UI mostra
 * essas linhas marcadas e desabilitadas por default.
 */
export type ReviewableImportRow = {
  /** Id local UUID gerado na revisão (não vai pro DB). */
  rowId: string
  fitId: string
  type: "income" | "expense"
  amount: number
  date: string
  description: string
  /** Categoria sugerida pela IA (Sub-fase 7C); null se IA off ou inferência falhou. */
  suggestedCategory: string | null
  /** Já existe no banco com mesmo fitId — UI desabilita por default. */
  duplicate: boolean
}

// ---------------------------------------------------------------------------
// 3) Input de confirmação (UI → server)
// ---------------------------------------------------------------------------

export type ConfirmImportRow = {
  rowId: string
  fitId: string
  type: "income" | "expense"
  amount: number
  date: string
  description: string
  /** Categoria final escolhida pelo usuário (pode ter editado a sugestão). */
  category: string | null
}

export type ConfirmImportInput = {
  batchId: string
  rows: ConfirmImportRow[]
}

// ---------------------------------------------------------------------------
// 4) Tipos de leitura (DB → UI)
// ---------------------------------------------------------------------------

export type ImportBatchRow = {
  id: string
  tenant_id: string
  user_id: string
  file_name: string
  bank_id: string | null
  account_id: string | null
  status: ImportBatchStatus
  total_parsed: number
  total_imported: number
  total_skipped: number
  created_at: string
  updated_at: string
}
