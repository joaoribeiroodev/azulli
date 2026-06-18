import "server-only"

import * as XLSX from "xlsx"

import { createClient } from "@/lib/supabase/server"
import { resolveAccountantRange } from "@/lib/accountant/queries"
import { utcToLocalDateBR } from "@/lib/utils/date"
import {
  formatWorksheet,
  writeWorkbookBuffer,
} from "@/lib/export/xlsx-format"

export type AccountantExportResult = {
  filename: string
  buffer: Uint8Array
  jsonFilename: string
  jsonBody: string
}

export type AccountantExportOptions = {
  /** YYYY-MM ou mês atual se omitido */
  month?: string
}

export async function buildAccountantExport(
  options: AccountantExportOptions = {}
): Promise<AccountantExportResult | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const tenantRes = await supabase.from("tenants").select("*").limit(1).maybeSingle()
  const tenant = tenantRes.data
  if (!tenant) return null

  const { from, to, label: periodLabel } = resolveAccountantRange(
    options.month
  )

  const { data: transactions } = await supabase
    .from("transactions_with_status")
    .select(
      "id, type, amount, description, category, status, due_date, paid_at, customer_id, supplier_id"
    )
    .order("due_date", { ascending: false })
    .limit(5000)

  const rows = (transactions ?? []).map((t) => ({
    Data: t.due_date as string,
    Tipo: t.type === "income" ? "Receita" : "Despesa",
    Descrição: (t.description as string) ?? "",
    Categoria: (t.category as string) ?? "",
    Valor: Number(t.amount),
    Status:
      t.status === "paid"
        ? "Pago"
        : t.status === "overdue"
          ? "Vencido"
          : "Pendente",
    "Data pagamento": (t.paid_at as string | null)?.slice(0, 10) ?? "",
  }))

  const monthTx = (transactions ?? []).filter((t) => {
    if (t.status !== "paid") return false
    const ref = t.paid_at
      ? utcToLocalDateBR(t.paid_at as string)
      : (t.due_date as string)
    return ref >= from && ref <= to
  })

  let paidIncome = 0
  let paidExpense = 0
  const expenseByCat = new Map<string, number>()

  for (const t of monthTx) {
    const amount = Number(t.amount)
    if (t.type === "income") {
      paidIncome += amount
    } else {
      paidExpense += amount
      const cat = (t.category as string) ?? "Sem categoria"
      expenseByCat.set(cat, (expenseByCat.get(cat) ?? 0) + amount)
    }
  }

  const topExpenses = [...expenseByCat.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)

  const summaryRows: Array<{ Métrica: string; Valor: string | number }> = [
    { Métrica: "Empresa", Valor: tenant.name as string },
    { Métrica: "Período", Valor: `${from} a ${to} (${periodLabel})` },
    { Métrica: "Receitas pagas", Valor: paidIncome },
    { Métrica: "Despesas pagas", Valor: paidExpense },
    { Métrica: "Lucro (pagos)", Valor: paidIncome - paidExpense },
    { Métrica: "", Valor: "" },
    { Métrica: "Top 5 despesas (pagas)", Valor: "" },
    ...topExpenses.map(([cat, val], i) => ({
      Métrica: `${i + 1}. ${cat}`,
      Valor: val,
    })),
  ]

  const txHeaders = [
    "Data",
    "Tipo",
    "Descrição",
    "Categoria",
    "Valor",
    "Status",
    "Data pagamento",
  ]

  const wb = XLSX.utils.book_new()
  const wsTx = XLSX.utils.json_to_sheet(rows, { header: txHeaders })
  formatWorksheet(wsTx, {
    colWidths: [12, 12, 40, 22, 14, 12, 14],
    currencyColumns: [4],
    dateColumns: [0, 6],
    autofilter: true,
    freezeHeader: true,
  })
  XLSX.utils.book_append_sheet(wb, wsTx, "Lançamentos")

  const wsSummary = XLSX.utils.json_to_sheet(summaryRows, {
    header: ["Métrica", "Valor"],
  })
  formatWorksheet(wsSummary, {
    colWidths: [28, 18],
    currencyColumns: [1],
  })
  XLSX.utils.book_append_sheet(wb, wsSummary, "Resumo mensal")

  const buffer = writeWorkbookBuffer(wb)
  const safeName = String(tenant.name)
    .replace(/[^\w\s-]/g, "")
    .trim()
    .slice(0, 40)

  const jsonBody = JSON.stringify(
    {
      exported_at: new Date().toISOString(),
      format: "accountant_package",
      tenant: tenant,
      period: { from, to, label: periodLabel },
      summary: {
        paid_income: paidIncome,
        paid_expense: paidExpense,
        profit_paid: paidIncome - paidExpense,
        top_expenses: topExpenses.map(([category, amount]) => ({
          category,
          amount,
        })),
      },
      transactions: transactions ?? [],
    },
    null,
    2
  )

  const periodStamp = options.month ?? from.slice(0, 7)
  return {
    filename: `azulli_contador_${safeName || "empresa"}_${periodStamp}.xlsx`,
    buffer,
    jsonFilename: `azulli_contador_${safeName || "empresa"}_${periodStamp}.json`,
    jsonBody,
  }
}
