"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { decodeOfxBuffer, parseOfx } from "@/lib/imports/ofx-parser"
import { categorizeImportBatch } from "@/lib/imports/categorize"
import type {
  ReviewableImportRow,
  ParsedOfxStatement,
  ConfirmImportInput,
} from "@/lib/imports/types"

type ActionResult<T = undefined> =
  | { success: true; data: T }
  | { success: false; error: string }

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5 MB
const MAX_TRANSACTIONS = 5000

export type ParseOfxResult = {
  batchId: string
  rows: ReviewableImportRow[]
  statement: {
    bankId: string | null
    accountId: string | null
    periodStart: string | null
    periodEnd: string | null
    fileName: string
    totalParsed: number
    totalDuplicates: number
  }
}

async function getCurrentTenantId(): Promise<string | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from("tenant_users")
    .select("tenant_id")
    .limit(1)
    .maybeSingle()
  return data?.tenant_id ?? null
}

/**
 * Lê um arquivo OFX, valida, parseia e cria um import_batch no DB com status
 * 'parsed'. Marca duplicatas (FITIDs já presentes em transactions). Não insere
 * nada em transactions ainda — isso só acontece em `confirmImportAction` (7D).
 */
export async function parseOfxAction(
  formData: FormData
): Promise<ActionResult<ParseOfxResult>> {
  const file = formData.get("file")

  if (!(file instanceof File)) {
    return { success: false, error: "Nenhum arquivo enviado." }
  }
  if (file.size === 0) {
    return { success: false, error: "Arquivo vazio." }
  }
  if (file.size > MAX_FILE_SIZE) {
    return {
      success: false,
      error: "Arquivo muito grande. Limite de 5MB por importação.",
    }
  }

  const lower = file.name.toLowerCase()
  if (!lower.endsWith(".ofx") && !lower.endsWith(".qfx")) {
    return {
      success: false,
      error: "Envie um arquivo .ofx exportado do seu banco.",
    }
  }

  // ---- Decode + parse ----
  let statement: ParsedOfxStatement
  try {
    const buffer = await file.arrayBuffer()
    const text = decodeOfxBuffer(buffer)
    statement = parseOfx(text)
  } catch (err) {
    console.error("[imports] parseOfx failed:", err)
    return {
      success: false,
      error: "Não conseguimos ler esse arquivo. Confirme que é um OFX válido.",
    }
  }

  if (statement.transactions.length === 0) {
    return {
      success: false,
      error: "Nenhum lançamento encontrado no arquivo.",
    }
  }
  if (statement.transactions.length > MAX_TRANSACTIONS) {
    return {
      success: false,
      error: `Arquivo com ${statement.transactions.length} lançamentos — limite por importação é ${MAX_TRANSACTIONS}. Divida em períodos menores.`,
    }
  }

  // ---- Auth + tenant ----
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: "Sessão expirada." }

  const tenantId = await getCurrentTenantId()
  if (!tenantId) return { success: false, error: "Empresa não encontrada." }

  // ---- Dedup contra transactions já importadas ----
  const fitIds = statement.transactions.map((t) => t.fitId)
  const { data: existing, error: dupErr } = await supabase
    .from("transactions")
    .select("external_ref")
    .eq("tenant_id", tenantId)
    .eq("source", "ofx_import")
    .in("external_ref", fitIds)

  if (dupErr) {
    console.error("[imports] dedup query failed:", dupErr)
    return { success: false, error: "Erro ao validar duplicatas." }
  }

  const duplicateSet = new Set(
    (existing ?? [])
      .map((r) => r.external_ref)
      .filter((x): x is string => typeof x === "string")
  )

  // ---- Cria batch ----
  const { data: batch, error: batchErr } = await supabase
    .from("import_batches")
    .insert({
      tenant_id: tenantId,
      user_id: user.id,
      file_name: file.name.slice(0, 200),
      bank_id: statement.bankId,
      account_id: statement.accountId,
      status: "parsed",
      total_parsed: statement.transactions.length,
      total_imported: 0,
      total_skipped: duplicateSet.size,
    })
    .select("id")
    .single()

  if (batchErr || !batch) {
    console.error("[imports] batch insert failed:", batchErr)
    return { success: false, error: "Não foi possível registrar a importação." }
  }

  // ---- Monta linhas pra revisão ----
  const rows: ReviewableImportRow[] = statement.transactions.map((t, idx) => ({
    rowId: `${batch.id}:${idx}`,
    fitId: t.fitId,
    type: t.type,
    amount: t.amount,
    date: t.date,
    description: t.description,
    suggestedCategory: null,
    duplicate: duplicateSet.has(t.fitId),
  }))

  // ---- Categorização IA (apenas linhas não-duplicadas) ----
  // Falha silenciosa: se Gemini não tiver key ou der timeout, importação
  // segue sem sugestão e o usuário preenche manualmente na tela de revisão.
  const toCategorize = rows
    .filter((r) => !r.duplicate)
    .map((r) => ({
      rowId: r.rowId,
      type: r.type,
      amount: r.amount,
      description: r.description,
    }))

  const suggestions = await categorizeImportBatch(tenantId, toCategorize)
  for (const r of rows) {
    const sug = suggestions.get(r.rowId)
    if (sug) r.suggestedCategory = sug
  }

  return {
    success: true,
    data: {
      batchId: batch.id,
      rows,
      statement: {
        bankId: statement.bankId,
        accountId: statement.accountId,
        periodStart: statement.periodStart,
        periodEnd: statement.periodEnd,
        fileName: file.name,
        totalParsed: statement.transactions.length,
        totalDuplicates: duplicateSet.size,
      },
    },
  }
}

// ---------------------------------------------------------------------------
// confirmImportAction — usuário revisou e confirmou; insere em transactions
// ---------------------------------------------------------------------------

const confirmRowSchema = z.object({
  rowId: z.string().min(1),
  fitId: z.string().min(1),
  type: z.enum(["income", "expense"]),
  amount: z.number().positive().max(99_999_999.99),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  description: z.string().trim().max(280),
  category: z.string().trim().max(60).nullable(),
})

const confirmInputSchema = z.object({
  batchId: z.string().uuid(),
  rows: z.array(confirmRowSchema).min(1).max(5000),
})

export async function confirmImportAction(
  input: ConfirmImportInput
): Promise<ActionResult<{ imported: number }>> {
  const parsed = confirmInputSchema.safeParse(input)
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Dados inválidos.",
    }
  }
  const { batchId, rows } = parsed.data

  const supabase = await createClient()

  // Confirma que o batch existe e pertence ao tenant do usuário (RLS protege).
  const { data: batch, error: batchErr } = await supabase
    .from("import_batches")
    .select("id, tenant_id, status")
    .eq("id", batchId)
    .maybeSingle()

  if (batchErr || !batch) {
    return { success: false, error: "Importação não encontrada." }
  }
  if (batch.status !== "parsed") {
    return {
      success: false,
      error: "Esta importação já foi confirmada ou descartada.",
    }
  }

  const nowIso = new Date().toISOString()
  const insertRows = rows.map((r) => ({
    tenant_id: batch.tenant_id,
    type: r.type,
    amount: r.amount,
    due_date: r.date,
    paid_at: nowIso, // OFX traz só transações já realizadas
    description: r.description || null,
    category: r.category && r.category.length > 0 ? r.category : null,
    status: "paid" as const,
    source: "ofx_import" as const,
    import_batch_id: batchId,
    external_ref: r.fitId,
  }))

  const { error: insertErr, count } = await supabase
    .from("transactions")
    .insert(insertRows, { count: "exact" })

  if (insertErr) {
    console.error("[imports] bulk insert failed:", insertErr)
    // Erro mais comum: violação do unique partial index (race com outra
    // importação). Mensagem amigável mesmo no caso genérico.
    return {
      success: false,
      error:
        "Não foi possível concluir a importação. Algumas linhas podem ser duplicatas — feche a tela e tente novamente.",
    }
  }

  const imported = count ?? insertRows.length

  await supabase
    .from("import_batches")
    .update({
      status: "confirmed",
      total_imported: imported,
    })
    .eq("id", batchId)

  revalidatePath("/lancamentos")
  revalidatePath("/dashboard")

  return { success: true, data: { imported } }
}

/**
 * Cancela um batch que está em status 'parsed' (usuário fechou a tela
 * sem confirmar). Marca como 'discarded'.
 */
export async function discardImportBatchAction(
  batchId: string
): Promise<ActionResult> {
  const supabase = await createClient()
  const { error } = await supabase
    .from("import_batches")
    .update({ status: "discarded" })
    .eq("id", batchId)
    .eq("status", "parsed")

  if (error) {
    console.error("[imports] discard failed:", error)
    return { success: false, error: "Não foi possível descartar a importação." }
  }
  return { success: true, data: undefined }
}
