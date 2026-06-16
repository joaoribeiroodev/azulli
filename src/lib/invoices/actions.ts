"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { getInvoiceProvider } from "@/lib/invoices/provider"
import {
  issueInvoiceSchema,
  type IssueInvoiceInput,
} from "@/lib/invoices/schemas"

type ActionResult<T = undefined> =
  | { success: true; data?: T }
  | { success: false; error: string }

// Limites mensais por tier (hardcoded no MVP; vira tabela depois)
const NFSE_LIMITS: Record<string, number | null> = {
  trial: 5,
  pro: 30,
  enterprise: null, // ilimitado
}

const ALLOWS_NFE: Record<string, boolean> = {
  trial: false,
  pro: false,
  enterprise: true,
}

export async function issueInvoiceAction(
  input: IssueInvoiceInput
): Promise<ActionResult<{ invoiceId: string }>> {
  const parsed = issueInvoiceSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: "Dados inválidos." }
  }
  const { transaction_id, type } = parsed.data
  const supabase = await createClient()

  // 1) Busca tenant + tier + dados do emitente (RLS garante isolamento)
  const { data: tenantRow } = await supabase
    .from("tenants")
    .select("id, tier, name, document, email, phone, inscricao_estadual, inscricao_municipal, cep, logradouro, numero, complemento, bairro, cidade, uf")
    .limit(1)
    .maybeSingle()

  if (!tenantRow) {
    return { success: false, error: "Empresa não encontrada." }
  }
  const tenantId = tenantRow.id
  const tier = tenantRow.tier as "trial" | "pro" | "enterprise"

  // 2) Feature flag: NF-e só pro plano Empresarial
  if (type === "nfe" && !ALLOWS_NFE[tier]) {
    return {
      success: false,
      error:
        "Emissão de NF-e está disponível no plano Empresarial. Faça upgrade pra liberar.",
    }
  }

  // 3) Limite mensal de NFS-e (trial: 5, pro: 30, enterprise: ilimitado)
  if (type === "nfse") {
    const limit = NFSE_LIMITS[tier]
    if (limit !== null) {
      const { data: counts } = await supabase
        .from("invoice_monthly_count")
        .select("nfse_count_current_month")
        .limit(1)
        .maybeSingle()

      const used = counts?.nfse_count_current_month ?? 0
      if (used >= limit) {
        return {
          success: false,
          error:
            tier === "trial"
              ? `Você já emitiu ${used} NFS-e no trial. Assine um plano para continuar.`
              : `Limite de ${limit} NFS-e/mês atingido no plano Pro. Faça upgrade para Empresarial.`,
        }
      }
    }
  }

  // 4) Busca transaction + valida status (precisa estar paga)
  const { data: tx, error: txErr } = await supabase
    .from("transactions")
    .select("id, status, amount, description, customer_id, type, tenant_id")
    .eq("id", transaction_id)
    .maybeSingle()

  if (txErr || !tx) {
    return { success: false, error: "Lançamento não encontrado." }
  }
  if (tx.type !== "income") {
    return {
      success: false,
      error: "Notas só podem ser emitidas para receitas.",
    }
  }
  if (tx.status !== "paid") {
    return {
      success: false,
      error: "Marque o lançamento como pago antes de emitir a nota.",
    }
  }

  // 5) Verifica se já tem invoice autorizada ou processando
  const { data: existing } = await supabase
    .from("invoices")
    .select("id, status")
    .eq("transaction_id", transaction_id)
    .in("status", ["processing", "authorized"])
    .limit(1)
    .maybeSingle()

  if (existing) {
    return {
      success: false,
      error:
        existing.status === "authorized"
          ? "Já existe uma nota autorizada para este lançamento."
          : "Uma nota já está sendo processada para este lançamento.",
    }
  }

  // 6) Busca dados do cliente (se houver)
  let customerName: string | null = null
  let customerDocument: string | null = null
  if (tx.customer_id) {
    const { data: customer } = await supabase
      .from("customers")
      .select("name, document")
      .eq("id", tx.customer_id)
      .maybeSingle()
    customerName = customer?.name ?? null
    customerDocument = customer?.document ?? null
  }

  // 7) Regime tributário do tenant
  const { data: settings } = await supabase
    .from("tenant_settings")
    .select("default_tax_regime")
    .limit(1)
    .maybeSingle()
  const taxRegime =
    (settings?.default_tax_regime as "mei" | "simples_nacional") ?? "mei"

  // 8) Cria invoice em status 'processing'
  const { data: invoice, error: invErr } = await supabase
    .from("invoices")
    .insert({
      tenant_id: tenantId,
      transaction_id,
      type,
      status: "processing",
    })
    .select("id")
    .single()

  if (invErr || !invoice) {
    console.error("[invoices] insert failed:", invErr)
    return { success: false, error: "Não foi possível iniciar a emissão." }
  }

  // 9) Chama provider (síncrono no MVP — vira webhook em prod)
  const provider = await getInvoiceProvider()
  const result = await provider.issue({
    tenantId,
    transactionId: transaction_id,
    type,
    amount: Number(tx.amount),
    customerName,
    customerDocument,
    description: tx.description,
    taxRegime,
    emitter: {
      name: tenantRow.name,
      document: tenantRow.document ?? null,
      email: tenantRow.email ?? null,
      phone: tenantRow.phone ?? null,
      inscricao_estadual: tenantRow.inscricao_estadual ?? null,
      inscricao_municipal: tenantRow.inscricao_municipal ?? null,
      cep: tenantRow.cep ?? null,
      logradouro: tenantRow.logradouro ?? null,
      numero: tenantRow.numero ?? null,
      complemento: tenantRow.complemento ?? null,
      bairro: tenantRow.bairro ?? null,
      cidade: tenantRow.cidade ?? null,
      uf: tenantRow.uf ?? null,
    },
  })

  // 10) Atualiza invoice com o resultado
  if (result.success) {
    await supabase
      .from("invoices")
      .update({
        status: "authorized",
        external_id: result.externalId,
        xml_url: result.xmlUrl,
        pdf_url: result.pdfUrl,
        error_message: null,
      })
      .eq("id", invoice.id)
  } else {
    await supabase
      .from("invoices")
      .update({
        status: "error",
        error_message: result.error,
      })
      .eq("id", invoice.id)

    revalidatePath("/notas")
    revalidatePath("/lancamentos")
    return { success: false, error: result.error }
  }

  revalidatePath("/notas")
  revalidatePath("/lancamentos")
  return { success: true, data: { invoiceId: invoice.id } }
}

export async function retryInvoiceAction(
  invoiceId: string
): Promise<ActionResult<{ invoiceId: string }>> {
  const supabase = await createClient()
  const { data: inv } = await supabase
    .from("invoices")
    .select("transaction_id, type, status")
    .eq("id", invoiceId)
    .maybeSingle()

  if (!inv) return { success: false, error: "Nota não encontrada." }
  if (inv.status !== "error") {
    return { success: false, error: "Só é possível reemitir notas com erro." }
  }

  // Deleta a nota com erro e tenta de novo (UX simples no MVP)
  await supabase.from("invoices").delete().eq("id", invoiceId)

  return issueInvoiceAction({
    transaction_id: inv.transaction_id,
    type: inv.type as "nfe" | "nfse",
  })
}
