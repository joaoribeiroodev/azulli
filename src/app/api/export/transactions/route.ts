import { NextResponse, type NextRequest } from "next/server"
import * as XLSX from "xlsx"
import { createClient } from "@/lib/supabase/server"
import { applyTransactionDateRange } from "@/lib/financial/date-filters"
import { todayLocalBR, utcToLocalDateBR } from "@/lib/utils/date"
import {
  formatWorksheet,
  writeWorkbookBuffer,
  XLSX_BRL_FORMAT,
} from "@/lib/export/xlsx-format"

/**
 * GET /api/export/transactions?type=&status=&category=&from=&to=&month=
 *
 * Exporta lançamentos em XLSX formatado. RLS garante isolamento por tenant.
 *
 * Filtros:
 *  - type: income | expense
 *  - status: pending | paid | overdue
 *  - category: nome literal (ou __uncategorized)
 *  - from / to: YYYY-MM-DD (due_date)
 *  - month: YYYY-MM (atalho: equivale a from=YYYY-MM-01, to=YYYY-MM-último)
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
  }

  const sp = request.nextUrl.searchParams
  const typeFilter = sp.get("type")
  const statusFilter = sp.get("status")
  const categoryFilter = sp.get("category")
  const fromFilter = sp.get("from")
  const toFilter = sp.get("to")
  const monthFilter = sp.get("month") // "2026-01"

  // Se month foi enviado, sobrepõe from/to com o intervalo do mês completo
  let effFrom = fromFilter ?? undefined
  let effTo = toFilter ?? undefined
  if (monthFilter && /^\d{4}-\d{2}$/.test(monthFilter)) {
    const [y, m] = monthFilter.split("-").map(Number)
    const lastDay = new Date(y, m, 0).getDate()
    effFrom = `${monthFilter}-01`
    effTo = `${monthFilter}-${String(lastDay).padStart(2, "0")}`
  }

  let query = supabase
    .from("transactions_with_status")
    .select(
      "id, type, amount, status, due_date, paid_at, description, category, customer_id, supplier_id, created_at"
    )

  if (typeFilter && typeFilter !== "all") query = query.eq("type", typeFilter)
  if (statusFilter && statusFilter !== "all")
    query = query.eq("status", statusFilter)
  if (categoryFilter && categoryFilter !== "all") {
    if (categoryFilter === "__uncategorized") {
      query = query.is("category", null)
    } else {
      query = query.eq("category", categoryFilter)
    }
  }
  if (effFrom || effTo) {
    query = applyTransactionDateRange(
      query,
      effFrom,
      effTo,
      (statusFilter as "pending" | "paid" | "overdue" | "all") ?? "all"
    )
  }

  const { data: rows, error } = await query.order("due_date", {
    ascending: false,
  })

  if (error) {
    console.error("[export] failed:", error)
    return NextResponse.json(
      { error: "Erro ao gerar exportação" },
      { status: 500 }
    )
  }

  // Hidrata nomes de cliente/fornecedor
  const customerIds = Array.from(
    new Set((rows ?? []).map((r) => r.customer_id).filter((x): x is string => !!x))
  )
  const supplierIds = Array.from(
    new Set((rows ?? []).map((r) => r.supplier_id).filter((x): x is string => !!x))
  )

  const customerMap = new Map<string, string>()
  if (customerIds.length > 0) {
    const { data: customers } = await supabase
      .from("customers")
      .select("id, name")
      .in("id", customerIds)
    for (const c of customers ?? []) customerMap.set(c.id, c.name)
  }

  const supplierMap = new Map<string, string>()
  if (supplierIds.length > 0) {
    const { data: suppliers } = await supabase
      .from("suppliers")
      .select("id, name")
      .in("id", supplierIds)
    for (const s of suppliers ?? []) supplierMap.set(s.id, s.name)
  }

  // Constrói linhas pra planilha
  const sheetRows = (rows ?? []).map((r) => {
    const isIncome = r.type === "income"
    const customer = r.customer_id ? customerMap.get(r.customer_id) ?? "" : ""
    const supplier = r.supplier_id ? supplierMap.get(r.supplier_id) ?? "" : ""

    return {
      Tipo: isIncome ? "Receita" : "Despesa",
      Descrição: r.description ?? "",
      Categoria: r.category ?? "",
      Cliente: customer,
      Fornecedor: supplier,
      Valor: Number(r.amount), // numérico — Excel formata com a célula
      Status:
        r.status === "paid"
          ? "Pago"
          : r.status === "overdue"
            ? "Vencido"
            : "Pendente",
      Vencimento: r.due_date,
      "Pago em": r.paid_at ? utcToLocalDateBR(r.paid_at) : "",
    }
  })

  // Cria workbook
  const ws = XLSX.utils.json_to_sheet(sheetRows, {
    header: [
      "Tipo",
      "Descrição",
      "Categoria",
      "Cliente",
      "Fornecedor",
      "Valor",
      "Status",
      "Vencimento",
      "Pago em",
    ],
  })

  formatWorksheet(ws, {
    colWidths: [10, 36, 22, 24, 24, 14, 12, 12, 12],
    currencyColumns: [5],
    dateColumns: [7, 8],
    autofilter: true,
    freezeHeader: true,
  })

  const range = XLSX.utils.decode_range(ws["!ref"] ?? "A1")
  if (sheetRows.length > 0) {
    const total = sheetRows.reduce((sum, r) => sum + (r.Valor ?? 0), 0)
    const totalRow = range.e.r + 2
    const labelAddr = XLSX.utils.encode_cell({ c: 4, r: totalRow })
    const totalAddr = XLSX.utils.encode_cell({ c: 5, r: totalRow })
    ws[labelAddr] = { t: "s", v: "Total:" }
    ws[totalAddr] = { t: "n", v: total, z: XLSX_BRL_FORMAT }
    ws["!ref"] = XLSX.utils.encode_range({
      s: { c: 0, r: 0 },
      e: { c: range.e.c, r: totalRow },
    })
  }

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, "Lançamentos")

  const buffer = writeWorkbookBuffer(wb)

  const filename = buildFilename(typeFilter, monthFilter, effFrom, effTo)

  return new NextResponse(
    new Blob([buffer.slice()], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
    {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    }
  )
}

function buildFilename(
  type: string | null,
  month: string | null,
  from?: string,
  to?: string
): string {
  const parts: string[] = ["azulli"]
  if (type === "income") parts.push("entradas")
  else if (type === "expense") parts.push("saidas")
  else parts.push("lancamentos")

  if (month) {
    parts.push(month) // "2026-01"
  } else if (from || to) {
    parts.push(`${from ?? "inicio"}_a_${to ?? "hoje"}`)
  } else {
    parts.push(todayLocalBR())
  }
  return parts.join("_") + ".xlsx"
}
