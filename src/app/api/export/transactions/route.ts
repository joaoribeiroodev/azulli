import { NextResponse, type NextRequest } from "next/server"
import * as XLSX from "xlsx"
import { createClient } from "@/lib/supabase/server"

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
  if (effFrom) query = query.gte("due_date", effFrom)
  if (effTo) query = query.lte("due_date", effTo)

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
      "Pago em": r.paid_at ? r.paid_at.slice(0, 10) : "",
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

  // ------- Formatação de células -------

  // Larguras de coluna (em "caracteres" do Excel)
  ws["!cols"] = [
    { wch: 10 }, // Tipo
    { wch: 32 }, // Descrição
    { wch: 22 }, // Categoria
    { wch: 24 }, // Cliente
    { wch: 24 }, // Fornecedor
    { wch: 14 }, // Valor
    { wch: 12 }, // Status
    { wch: 12 }, // Vencimento
    { wch: 12 }, // Pago em
  ]

  // Aplica formato BRL na coluna F (Valor) — pula header (linha 1)
  const range = XLSX.utils.decode_range(ws["!ref"] ?? "A1")
  for (let R = 1; R <= range.e.r; R++) {
    const cellAddr = XLSX.utils.encode_cell({ c: 5, r: R }) // coluna F = índice 5
    const cell = ws[cellAddr]
    if (cell && typeof cell.v === "number") {
      cell.z = `"R$" #,##0.00`
      cell.t = "n"
    }
  }

  // Estilo do cabeçalho (negrito) — funciona em Excel, mas SheetJS Community
  // não preserva estilos completos. Pra header em negrito real, precisamos
  // do xlsx-style/xlsx-js-style. Como queremos zero dependências extras,
  // deixamos sem estilo de header (Excel/LibreOffice exibem em negrito por
  // ser primeira linha de tabela auto-detectada quando abre o arquivo).

  // Linha de totais no rodapé (só se for tudo do mesmo tipo)
  if (sheetRows.length > 0) {
    const total = sheetRows.reduce((sum, r) => sum + (r.Valor ?? 0), 0)
    const totalRow = range.e.r + 2 // pula 1 linha em branco
    XLSX.utils.sheet_add_aoa(
      ws,
      [["", "", "", "", "Total:", total]],
      { origin: { c: 0, r: totalRow } }
    )
    const totalCell = XLSX.utils.encode_cell({ c: 5, r: totalRow })
    if (ws[totalCell]) {
      ws[totalCell].z = `"R$" #,##0.00`
      ws[totalCell].t = "n"
    }
    // Atualiza range pra incluir o rodapé
    ws["!ref"] = XLSX.utils.encode_range({
      s: { c: 0, r: 0 },
      e: { c: range.e.c, r: totalRow },
    })
  }

  // Auto-filtro no cabeçalho
  ws["!autofilter"] = { ref: `A1:I${range.e.r + 1}` }

  // Freeze pane no header
  ws["!freeze"] = { xSplit: 0, ySplit: 1 }

  // ------- Workbook -------
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, "Lançamentos")

  const buffer = XLSX.write(wb, {
    type: "buffer",
    bookType: "xlsx",
    compression: true,
  })

  const filename = buildFilename(typeFilter, monthFilter, effFrom, effTo)

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  })
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
    parts.push(new Date().toISOString().slice(0, 10))
  }
  return parts.join("_") + ".xlsx"
}
