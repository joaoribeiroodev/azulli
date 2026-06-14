import "server-only"
import { createClient } from "@/lib/supabase/server"

export type InvoiceRow = {
  id: string
  type: "nfe" | "nfse"
  status: "processing" | "authorized" | "error"
  external_id: string | null
  xml_url: string | null
  pdf_url: string | null
  error_message: string | null
  created_at: string
  transaction_id: string
  transaction_amount: number
  transaction_description: string | null
  customer_name: string | null
}

export async function listInvoices(): Promise<InvoiceRow[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("invoices")
    .select(
      "id, type, status, external_id, xml_url, pdf_url, error_message, created_at, transaction_id"
    )
    .order("created_at", { ascending: false })
    .limit(100)

  if (error || !data || data.length === 0) return []

  const txIds = data.map((i) => i.transaction_id)
  const { data: txs } = await supabase
    .from("transactions")
    .select("id, amount, description, customer_id")
    .in("id", txIds)

  const customerIds = Array.from(
    new Set(
      (txs ?? [])
        .map((t) => t.customer_id)
        .filter((x): x is string => !!x)
    )
  )
  const { data: customers } =
    customerIds.length > 0
      ? await supabase
          .from("customers")
          .select("id, name")
          .in("id", customerIds)
      : { data: [] }

  const txMap = new Map((txs ?? []).map((t) => [t.id, t]))
  const customerMap = new Map((customers ?? []).map((c) => [c.id, c.name]))

  return data.map((inv) => {
    const tx = txMap.get(inv.transaction_id)
    return {
      id: inv.id,
      type: inv.type as "nfe" | "nfse",
      status: inv.status as "processing" | "authorized" | "error",
      external_id: inv.external_id,
      xml_url: inv.xml_url,
      pdf_url: inv.pdf_url,
      error_message: inv.error_message,
      created_at: inv.created_at,
      transaction_id: inv.transaction_id,
      transaction_amount: tx ? Number(tx.amount) : 0,
      transaction_description: tx?.description ?? null,
      customer_name: tx?.customer_id
        ? customerMap.get(tx.customer_id) ?? null
        : null,
    }
  })
}

export async function getInvoiceByTransactionId(
  transactionId: string
): Promise<{
  id: string
  type: "nfe" | "nfse"
  status: "processing" | "authorized" | "error"
} | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from("invoices")
    .select("id, type, status")
    .eq("transaction_id", transactionId)
    .in("status", ["processing", "authorized"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!data) return null
  return data as {
    id: string
    type: "nfe" | "nfse"
    status: "processing" | "authorized" | "error"
  }
}

export type TenantInvoiceContext = {
  tier: "trial" | "pro" | "enterprise"
  allowsNFe: boolean
  nfseUsed: number
  nfseLimit: number | null
}

export async function getTenantInvoiceContext(): Promise<TenantInvoiceContext> {
  const supabase = await createClient()
  const { data: tenant } = await supabase
    .from("tenants")
    .select("tier")
    .limit(1)
    .maybeSingle()

  const tier = (tenant?.tier ?? "trial") as "trial" | "pro" | "enterprise"

  const { data: counts } = await supabase
    .from("invoice_monthly_count")
    .select("nfse_count_current_month")
    .limit(1)
    .maybeSingle()

  const limits: Record<string, number | null> = {
    trial: 5,
    pro: 30,
    enterprise: null,
  }

  return {
    tier,
    allowsNFe: tier === "enterprise",
    nfseUsed: counts?.nfse_count_current_month ?? 0,
    nfseLimit: limits[tier],
  }
}
