import "server-only"

import {
  SchemaType,
  type FunctionDeclaration,
  type Schema,
} from "@google/generative-ai"

import { createClient } from "@/lib/supabase/server"
import {
  getDashboardSummary,
  getTopCustomers,
  getTopSuppliers,
  type TopPartyRange,
} from "@/lib/financial/queries"
import { detectRecurringExpenses } from "@/lib/insights/recurring"
import { computeForecastForTenant, tenantHasTransactions } from "@/lib/forecast/queries"
import {
  getCurrentMonthRange,
  todayLocalBR,
  utcToLocalDateBR,
} from "@/lib/utils/date"

/**
 * Tools de leitura disponibilizadas pro Assistente IA via function calling.
 *
 * Princípios:
 *   - 100% read-only. Nada de criar/editar transações por aqui.
 *   - Tenant-scoped via RLS automaticamente (chama createClient()).
 *   - Output enxuto, em JSON, com valores numéricos puros (a IA formata texto).
 *   - Erros NUNCA estouram — retornamos { error: string } pra IA poder pedir
 *     desculpa/replanejar sem o request inteiro morrer.
 */

// ===========================================================================
// Helpers
// ===========================================================================

type Period = "this_month" | "last_30_days" | "last_90_days" | "all_time"

function periodToRange(
  period: Period
): { from: string; to: string; label: string } {
  const today = todayLocalBR()
  if (period === "this_month") {
    const { from, to } = getCurrentMonthRange()
    return { from, to, label: "este mês" }
  }
  if (period === "last_30_days") {
    const fromDate = addDaysIso(today, -30)
    return {
      from: `${fromDate}T00:00:00-03:00`,
      to: `${today}T23:59:59-03:00`,
      label: "últimos 30 dias",
    }
  }
  if (period === "last_90_days") {
    const fromDate = addDaysIso(today, -90)
    return {
      from: `${fromDate}T00:00:00-03:00`,
      to: `${today}T23:59:59-03:00`,
      label: "últimos 90 dias",
    }
  }
  return {
    from: "1900-01-01T00:00:00-03:00",
    to: "2100-12-31T23:59:59-03:00",
    label: "histórico completo",
  }
}

function addDaysIso(isoDate: string, days: number): string {
  const [y, m, d] = isoDate.split("-").map(Number)
  const date = new Date(y, m - 1, d)
  date.setDate(date.getDate() + days)
  const yy = date.getFullYear()
  const mm = String(date.getMonth() + 1).padStart(2, "0")
  const dd = String(date.getDate()).padStart(2, "0")
  return `${yy}-${mm}-${dd}`
}

// ===========================================================================
// Tool 1: get_financial_summary
// ===========================================================================

async function tool_getFinancialSummary(args: { period?: Period }) {
  // Reusa o cálculo do dashboard pra "this_month".
  // Pros outros períodos, calcula on-the-fly.
  if (!args.period || args.period === "this_month") {
    const s = await getDashboardSummary()
    return {
      period: "this_month",
      label: "este mês",
      income: s.income,
      expense: s.expense,
      profit: s.profit,
      pending_count: s.pendingCount,
      pending_amount: s.pendingAmount,
      overdue_count: s.overdueCount,
    }
  }

  const supabase = await createClient()
  const { from, to, label } = periodToRange(args.period)
  const { data } = await supabase
    .from("transactions_with_status")
    .select("type, amount, status, paid_at")
    .eq("status", "paid")
    .gte("paid_at", from)
    .lte("paid_at", to)

  let income = 0
  let expense = 0
  for (const r of data ?? []) {
    const a = Number(r.amount)
    if (r.type === "income") income += a
    else expense += a
  }
  return {
    period: args.period,
    label,
    income,
    expense,
    profit: income - expense,
    pending_count: 0,
    pending_amount: 0,
    overdue_count: 0,
  }
}

// ===========================================================================
// Tool 2: list_recent_transactions
// ===========================================================================

async function tool_listRecentTransactions(args: {
  type?: "income" | "expense"
  status?: "paid" | "pending" | "overdue"
  days?: number
  limit?: number
}) {
  const supabase = await createClient()
  const limit = Math.min(50, Math.max(1, args.limit ?? 10))
  const days = Math.min(365, Math.max(1, args.days ?? 30))

  const cutoffDate = addDaysIso(todayLocalBR(), -days)
  const cutoffPaidTs = `${cutoffDate}T00:00:00-03:00`

  let q = supabase
    .from("transactions_with_status")
    .select(
      "id, type, amount, status, due_date, paid_at, description, category"
    )

  if (args.status === "paid") {
    q = q
      .eq("status", "paid")
      .gte("paid_at", cutoffPaidTs)
      .order("paid_at", { ascending: false })
  } else if (args.status === "pending" || args.status === "overdue") {
    q = q
      .eq("status", args.status)
      .gte("due_date", cutoffDate)
      .order("due_date", { ascending: false })
  } else {
    q = q.gte("due_date", cutoffDate).order("due_date", { ascending: false })
  }

  q = q.limit(limit)

  if (args.type) q = q.eq("type", args.type)
  if (args.status) q = q.eq("status", args.status)

  const { data, error } = await q
  if (error) return { error: "Não foi possível listar lançamentos." }

  return {
    count: data?.length ?? 0,
    transactions: (data ?? []).map((t) => ({
      type: t.type,
      amount: Number(t.amount),
      status: t.status,
      date:
        t.status === "paid" && t.paid_at
          ? utcToLocalDateBR(t.paid_at as string)
          : (t.due_date as string),
      description: t.description,
      category: t.category,
    })),
  }
}

// ===========================================================================
// Tool 3: get_top_categories
// ===========================================================================

async function tool_getTopCategories(args: {
  type: "income" | "expense"
  period?: Period
  limit?: number
}) {
  const supabase = await createClient()
  const limit = Math.min(20, Math.max(1, args.limit ?? 5))
  const { from, to, label } = periodToRange(args.period ?? "this_month")

  const { data, error } = await supabase
    .from("transactions")
    .select("amount, category")
    .eq("type", args.type)
    .eq("status", "paid")
    .not("category", "is", null)
    .gte("paid_at", from)
    .lte("paid_at", to)

  if (error) return { error: "Não foi possível agrupar categorias." }

  const totals = new Map<string, { total: number; count: number }>()
  for (const r of data ?? []) {
    if (!r.category) continue
    const cur = totals.get(r.category) ?? { total: 0, count: 0 }
    cur.total += Number(r.amount)
    cur.count += 1
    totals.set(r.category, cur)
  }

  const top = Array.from(totals.entries())
    .map(([category, t]) => ({ category, total: t.total, count: t.count }))
    .sort((a, b) => b.total - a.total)
    .slice(0, limit)

  return {
    type: args.type,
    period_label: label,
    categories: top,
  }
}

// ===========================================================================
// Tool 4: get_recurring_expenses
// ===========================================================================

async function tool_getRecurringExpenses() {
  const items = await detectRecurringExpenses()
  const total = items.reduce((s, x) => s + x.monthlyAmount, 0)
  return {
    count: items.length,
    total_monthly: total,
    items: items.slice(0, 20).map((r) => ({
      name: r.sampleDescription,
      monthly_amount: r.monthlyAmount,
      times_seen: r.count,
      last_seen: r.lastSeen,
      category: r.category,
    })),
  }
}

// ===========================================================================
// Tool 5: get_top_customers
// ===========================================================================

async function tool_getTopCustomers(args: {
  period?: TopPartyRange
  limit?: number
}) {
  const limit = Math.min(20, Math.max(1, args.limit ?? 5))
  const result = await getTopCustomers(args.period ?? "month")
  return {
    period: args.period ?? "month",
    customers: result
      .slice(0, limit)
      .map((c) => ({ name: c.name, total_received: c.total })),
  }
}

// ===========================================================================
// Tool 6: get_top_suppliers
// ===========================================================================

async function tool_getTopSuppliers(args: {
  period?: TopPartyRange
  limit?: number
}) {
  const limit = Math.min(20, Math.max(1, args.limit ?? 5))
  const result = await getTopSuppliers(args.period ?? "month")
  return {
    period: args.period ?? "month",
    suppliers: result
      .slice(0, limit)
      .map((s) => ({ name: s.name, total_paid: s.total })),
  }
}

// ===========================================================================
// Tool 7: search_transactions
// ===========================================================================

async function tool_searchTransactions(args: {
  query: string
  type?: "income" | "expense"
  limit?: number
}) {
  const supabase = await createClient()
  const limit = Math.min(50, Math.max(1, args.limit ?? 10))
  const q = args.query.trim()
  if (q.length < 2) return { error: "Busca precisa ter pelo menos 2 caracteres." }

  // ilike seguro — escapa % e _ pra não virar wildcards do usuário.
  const escaped = q.replace(/[%_]/g, "\\$&")

  let query = supabase
    .from("transactions_with_status")
    .select(
      "type, amount, status, due_date, description, category"
    )
    .or(`description.ilike.%${escaped}%,category.ilike.%${escaped}%`)
    .order("due_date", { ascending: false })
    .limit(limit)

  if (args.type) query = query.eq("type", args.type)

  const { data, error } = await query
  if (error) return { error: "Não foi possível buscar." }

  return {
    query: q,
    count: data?.length ?? 0,
    transactions: (data ?? []).map((t) => ({
      type: t.type,
      amount: Number(t.amount),
      status: t.status,
      date: t.due_date,
      description: t.description,
      category: t.category,
    })),
  }
}

// ===========================================================================
// Tool 8: get_overdue_transactions
// ===========================================================================

async function tool_getOverdueTransactions(args: { limit?: number }) {
  const supabase = await createClient()
  const limit = Math.min(50, Math.max(1, args.limit ?? 10))

  const { data, error } = await supabase
    .from("transactions_with_status")
    .select(
      "type, amount, status, due_date, description, category, customer_id, supplier_id"
    )
    .eq("status", "overdue")
    .order("due_date", { ascending: true })
    .limit(limit)

  if (error) return { error: "Não foi possível buscar vencidos." }

  let totalReceivable = 0
  let totalPayable = 0
  for (const r of data ?? []) {
    if (r.type === "income") totalReceivable += Number(r.amount)
    else totalPayable += Number(r.amount)
  }

  return {
    count: data?.length ?? 0,
    total_receivable: totalReceivable,
    total_payable: totalPayable,
    transactions: (data ?? []).map((t) => ({
      type: t.type,
      amount: Number(t.amount),
      due_date: t.due_date,
      description: t.description,
      category: t.category,
    })),
  }
}

// ===========================================================================
// Tool 9: get_cash_flow_forecast
// ===========================================================================

async function tool_getCashFlowForecast(args: { horizon_days?: number }) {
  const horizon =
    args.horizon_days === 60 || args.horizon_days === 90
      ? args.horizon_days
      : 30

  const [series, hasTransactions] = await Promise.all([
    computeForecastForTenant(horizon as 30 | 60 | 90),
    tenantHasTransactions(),
  ])
  const { summary, openingBalance } = series

  if (!hasTransactions) {
    return {
      horizon_days: horizon,
      has_transactions: false,
      opening_balance: 0,
      final_balance: 0,
      days_until_negative: null,
      note:
        "Conta sem lançamentos ainda — não há previsão de caixa. Oriente o usuário a registrar receitas/despesas ou importar OFX.",
    }
  }

  return {
    horizon_days: horizon,
    has_transactions: true,
    opening_balance: openingBalance,
    final_balance: summary.finalBalance,
    min_balance: summary.minBalance,
    min_balance_date: summary.minBalanceDate || null,
    days_until_negative: summary.daysUntilNegative,
    projected_income: summary.totalIncome,
    projected_expense: summary.totalExpense,
    note:
      openingBalance < 0
        ? "Saldo atual negativo (despesas pagas superam receitas pagas registradas)."
        : "Saldo inicial = soma de receitas pagas menos despesas pagas. Projeção inclui pendentes, recorrentes (2+ meses) e tendência de receita dos meses anteriores.",
  }
}

// ===========================================================================
// Declarações pra Gemini (FunctionDeclaration[])
// ===========================================================================

const PERIOD_ENUM: Schema = {
  type: SchemaType.STRING,
  format: "enum",
  enum: ["this_month", "last_30_days", "last_90_days", "all_time"],
  description:
    "Período da consulta. 'this_month' (atual), 'last_30_days', 'last_90_days' ou 'all_time'.",
}

export const TOOL_DECLARATIONS: FunctionDeclaration[] = [
  {
    name: "get_financial_summary",
    description:
      "Retorna receitas, despesas, lucro, contas pendentes e vencidas em um período. Use sempre que o usuário perguntar sobre 'como está o caixa', 'quanto gastei', 'quanto fechei o mês', etc.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: { period: PERIOD_ENUM },
      required: [],
    },
  },
  {
    name: "list_recent_transactions",
    description:
      "Lista lançamentos recentes (receitas ou despesas) com filtros. Use pra perguntas tipo 'mostre minhas últimas vendas' ou 'que despesas tive essa semana'.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        type: {
          type: SchemaType.STRING,
          format: "enum",
          enum: ["income", "expense"],
          description: "income = receita, expense = despesa. Omita pra ambos.",
        },
        status: {
          type: SchemaType.STRING,
          format: "enum",
          enum: ["paid", "pending", "overdue"],
          description: "Filtra por status. Omita pra todos.",
        },
        days: {
          type: SchemaType.INTEGER,
          description: "Janela em dias (default 30, máximo 365).",
        },
        limit: {
          type: SchemaType.INTEGER,
          description: "Quantidade máxima de resultados (default 10, máximo 50).",
        },
      },
      required: [],
    },
  },
  {
    name: "get_top_categories",
    description:
      "Top categorias por valor pago em um período. Use pra 'em que mais gastei', 'quais minhas maiores fontes de receita por categoria'.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        type: {
          type: SchemaType.STRING,
          format: "enum",
          enum: ["income", "expense"],
          description: "Tipo: income = receitas, expense = despesas.",
        },
        period: PERIOD_ENUM,
        limit: {
          type: SchemaType.INTEGER,
          description: "Quantas categorias retornar (default 5, máximo 20).",
        },
      },
      required: ["type"],
    },
  },
  {
    name: "get_recurring_expenses",
    description:
      "Lista despesas recorrentes detectadas (assinaturas, contas fixas tipo Netflix, aluguel, etc.) com valor mensal estimado. Use pra 'quanto gasto em assinaturas', 'quais minhas contas fixas'.",
    parameters: { type: SchemaType.OBJECT, properties: {}, required: [] },
  },
  {
    name: "get_top_customers",
    description:
      "Top clientes por receita em um período. Use pra 'meus melhores clientes', 'quem mais comprou esse mês'.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        period: {
          type: SchemaType.STRING,
          format: "enum",
          enum: ["month", "last30d"],
          description: "'month' (mês atual) ou 'last30d' (últimos 30 dias).",
        },
        limit: {
          type: SchemaType.INTEGER,
          description: "Quantos retornar (default 5, máximo 20).",
        },
      },
      required: [],
    },
  },
  {
    name: "get_top_suppliers",
    description:
      "Top fornecedores por valor pago em um período. Use pra 'pra quem mais paguei', 'meus principais fornecedores'.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        period: {
          type: SchemaType.STRING,
          format: "enum",
          enum: ["month", "last30d"],
          description: "'month' (mês atual) ou 'last30d' (últimos 30 dias).",
        },
        limit: {
          type: SchemaType.INTEGER,
          description: "Quantos retornar (default 5, máximo 20).",
        },
      },
      required: [],
    },
  },
  {
    name: "search_transactions",
    description:
      "Busca textual em descrição e categoria de lançamentos. Use quando o usuário citar um nome específico ('vendas pra Maria', 'gastos com Uber').",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        query: {
          type: SchemaType.STRING,
          description: "Termo a buscar (mínimo 2 caracteres).",
        },
        type: {
          type: SchemaType.STRING,
          format: "enum",
          enum: ["income", "expense"],
          description: "Filtra por tipo. Omita pra ambos.",
        },
        limit: {
          type: SchemaType.INTEGER,
          description: "Máximo de resultados (default 10, máximo 50).",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "get_overdue_transactions",
    description:
      "Lista lançamentos vencidos (pendentes com data passada) com totais a receber e a pagar. Use pra 'o que está atrasado', 'quem me deve', 'que contas estão vencidas'.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        limit: {
          type: SchemaType.INTEGER,
          description: "Máximo de resultados (default 10, máximo 50).",
        },
      },
      required: [],
    },
  },
  {
    name: "get_cash_flow_forecast",
    description:
      "Previsão de fluxo de caixa (saldo hoje, saldo projetado, dias até saldo negativo / runway). Use SEMPRE para 'quantos dias de caixa', 'previsão de fluxo', 'vou ficar no negativo?', 'runway', 'como fica meu caixa nos próximos 30 dias'.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        horizon_days: {
          type: SchemaType.INTEGER,
          description: "Horizonte em dias: 30 (padrão), 60 ou 90.",
        },
      },
      required: [],
    },
  },
]

// ===========================================================================
// Dispatcher
// ===========================================================================

type ToolArgs = Record<string, unknown>

const HANDLERS: Record<string, (args: ToolArgs) => Promise<unknown>> = {
  get_financial_summary: (a) => tool_getFinancialSummary(a as never),
  list_recent_transactions: (a) => tool_listRecentTransactions(a as never),
  get_top_categories: (a) => tool_getTopCategories(a as never),
  get_recurring_expenses: () => tool_getRecurringExpenses(),
  get_top_customers: (a) => tool_getTopCustomers(a as never),
  get_top_suppliers: (a) => tool_getTopSuppliers(a as never),
  search_transactions: (a) => tool_searchTransactions(a as never),
  get_overdue_transactions: (a) => tool_getOverdueTransactions(a as never),
  get_cash_flow_forecast: (a) => tool_getCashFlowForecast(a as never),
}

export async function executeTool(
  name: string,
  args: ToolArgs
): Promise<unknown> {
  const handler = HANDLERS[name]
  if (!handler) {
    return { error: `Função "${name}" não existe.` }
  }
  try {
    return await handler(args)
  } catch (err) {
    console.error(`[assistant] tool ${name} failed:`, err)
    return {
      error: `Falha ao executar ${name}. Tente reformular a pergunta.`,
    }
  }
}
