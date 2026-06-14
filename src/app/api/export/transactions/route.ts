import { NextResponse, type NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"

/**
 * GET /api/export/transactions?type=&status=&from=&to=
 *
 * Exporta lançamentos em CSV (UTF-8 com BOM pra abrir bonito no Excel BR).
 * RLS garante que apenas dados do tenant do usuário sejam retornados.
 *
 * Filtros aceitos (todos opcionais):
 *  - type: income | expense
 *  - status: pending | paid | overdue
 *  - from: YYYY-MM-DD (due_date >=)
 *  - to:   YYYY-MM-DD (due_date <=)
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
  const fromFilter = sp.get("from")
  const toFilter = sp.get("to")

  let query = supabase
    .from("transactions_with_status")
    .select(
      "id, type, amount, status, due_date, paid_at, description, customer_id, supplier_id, created_at"
    )

  if (typeFilter && typeFilter !== "all") query = query.eq("type", typeFilter)
  if (statusFilter && statusFilter !== "all")
    query = query.eq("status", statusFilter)
  if (fromFilter) query = query.gte("due_date", fromFilter)
  if (toFilter) query = query.lte("due_date", toFilter)

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

  // Enriquece com nomes de cliente/fornecedor
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

  // Monta o CSV (separador `;` é o padrão BR; Excel BR abre direto)
  const headers = [
    "Tipo",
    "Descrição",
    "Cliente",
    "Fornecedor",
    "Valor",
    "Status",
    "Vencimento",
    "Pago em",
  ]

  const csvRows = (rows ?? []).map((r) => {
    const type = r.type === "income" ? "Receita" : "Despesa"
    const status =
      r.status === "paid"
        ? "Pago"
        : r.status === "overdue"
          ? "Vencido"
          : "Pendente"
    const customer = r.customer_id
      ? (customerMap.get(r.customer_id) ?? "")
      : ""
    const supplier = r.supplier_id
      ? (supplierMap.get(r.supplier_id) ?? "")
      : ""
    const amount = Number(r.amount).toFixed(2).replace(".", ",") // formato BR

    return [
      escape(type),
      escape(r.description ?? ""),
      escape(customer),
      escape(supplier),
      amount,
      escape(status),
      escape(r.due_date),
      escape(r.paid_at ? r.paid_at.slice(0, 10) : ""),
    ].join(";")
  })

  // BOM + linhas separadas por CRLF (compatibilidade Excel Windows)
  const csv = "\uFEFF" + [headers.join(";"), ...csvRows].join("\r\n")

  const filename = buildFilename(typeFilter, fromFilter, toFilter)

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  })
}

/** Escapa células do CSV: aspas duplas dobradas e wrap se conter `;`, `"` ou newline. */
function escape(value: string): string {
  if (value === "") return ""
  const needsWrap = /[;"\n\r]/.test(value)
  const escaped = value.replace(/"/g, '""')
  return needsWrap ? `"${escaped}"` : escaped
}

function buildFilename(
  type: string | null,
  from: string | null,
  to: string | null
): string {
  const parts: string[] = ["azulli"]
  if (type === "income") parts.push("entradas")
  else if (type === "expense") parts.push("saidas")
  else parts.push("lancamentos")

  if (from || to) {
    parts.push(`${from ?? "inicio"}_a_${to ?? "hoje"}`)
  } else {
    parts.push(new Date().toISOString().slice(0, 10))
  }
  return parts.join("_") + ".csv"
}
