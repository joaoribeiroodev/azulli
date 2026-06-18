import "server-only"

import { executeTool } from "@/lib/assistant/tools"
import type { ToolCallRecord } from "@/lib/assistant/types"
import { formatBRL } from "@/lib/utils/currency"
import { formatDateBR } from "@/lib/utils/date"

type Intent = {
  tool: string
  args: Record<string, unknown>
  label: string
}

type RulesResult = {
  text: string
  toolCalls: ToolCallRecord[]
  intents: Intent[]
}

/**
 * Responde sem LLM: detecta intenção, executa tools e formata em português.
 * Garante que o assistente funcione mesmo com quota Gemini zerada.
 */
export async function runRulesAssistant(message: string): Promise<RulesResult> {
  const intents = detectIntents(message)
  const toolCalls: ToolCallRecord[] = []
  const sections: string[] = []

  for (const intent of intents) {
    const result = await executeTool(intent.tool, intent.args)
    toolCalls.push({ name: intent.tool, args: intent.args, result })
    sections.push(formatToolResult(intent, result))
  }

  const text =
    sections.join("\n\n").trim() ||
    buildFallbackMessage(message)

  return { text, toolCalls, intents }
}

function detectIntents(message: string): Intent[] {
  const q = message.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "")

  if (/\b(como usar|como import|importar ofx|extrato|exportar excel|convidar contador)\b/.test(q)) {
    return [
      {
        tool: "get_financial_summary",
        args: { period: "this_month" },
        label: "resumo",
      },
    ]
  }

  if (
    /\b(dias de caixa|runway|previsao|fluxo de caixa|ficar no negativo|quanto tempo de caixa)\b/.test(
      q
    )
  ) {
    return [
      {
        tool: "get_cash_flow_forecast",
        args: { horizon_days: 30 },
        label: "forecast",
      },
    ]
  }

  if (/\b(recorrente|assinatura|conta fixa|netflix|fixo)\b/.test(q)) {
    return [{ tool: "get_recurring_expenses", args: {}, label: "recorrentes" }]
  }

  if (/\b(top|maiores|melhores)\s+clientes\b|\bquem mais (comprou|pagou)\b/.test(q)) {
    return [
      {
        tool: "get_top_customers",
        args: { period: "month", limit: 5 },
        label: "clientes",
      },
    ]
  }

  if (/\b(top|maiores|principais)\s+fornecedores\b|\bquem mais paguei\b/.test(q)) {
    return [
      {
        tool: "get_top_suppliers",
        args: { period: "month", limit: 5 },
        label: "fornecedores",
      },
    ]
  }

  if (/\b(vencid|atrasad|devendo|inadimpl|a receber)\b/.test(q)) {
    return [
      {
        tool: "get_overdue_transactions",
        args: { limit: 10 },
        label: "vencidos",
      },
    ]
  }

  if (
    /\b(maior despesa|categoria|gastos em|gastei em|marketing|aluguel)\b/.test(q)
  ) {
    return [
      {
        tool: "get_top_categories",
        args: { period: "this_month", type: "expense", limit: 5 },
        label: "categorias",
      },
    ]
  }

  if (/\b(ultimos|recentes|ultimas)\s+(lancamento|movimentacao|venda|despesa)/.test(q)) {
    const type = /\bdespesa/.test(q) ? "expense" : /\bvenda|receita/.test(q) ? "income" : undefined
    return [
      {
        tool: "list_recent_transactions",
        args: { type, days: 30, limit: 8 },
        label: "recentes",
      },
    ]
  }

  if (/\b(mes passado|ultimo mes|comparar|mudou)\b/.test(q)) {
    return [
      {
        tool: "get_top_categories",
        args: { period: "this_month", type: "expense", limit: 5 },
        label: "categorias_mes",
      },
      {
        tool: "get_top_categories",
        args: { period: "last_30_days", type: "expense", limit: 5 },
        label: "categorias_30d",
      },
    ]
  }

  // Padrão: resumo do mês (cobre "como está meu caixa", etc.)
  return [
    {
      tool: "get_financial_summary",
      args: { period: "this_month" },
      label: "resumo",
    },
  ]
}

function formatToolResult(intent: Intent, raw: unknown): string {
  if (raw && typeof raw === "object" && "error" in raw) {
    return `Não consegui buscar ${intent.label}: ${(raw as { error: string }).error}`
  }

  switch (intent.tool) {
    case "get_financial_summary":
      return formatFinancialSummary(raw)
    case "get_cash_flow_forecast":
      return formatForecast(raw)
    case "get_recurring_expenses":
      return formatRecurring(raw)
    case "get_top_customers":
      return formatTopParties(raw, "clientes")
    case "get_top_suppliers":
      return formatTopParties(raw, "fornecedores")
    case "get_overdue_transactions":
      return formatOverdue(raw)
    case "get_top_categories":
      return formatTopCategories(raw, intent.args)
    case "list_recent_transactions":
      return formatRecent(raw)
    default:
      return JSON.stringify(raw)
  }
}

function formatFinancialSummary(raw: unknown): string {
  const r = raw as {
    label?: string
    income?: number
    expense?: number
    profit?: number
    pending_count?: number
    pending_amount?: number
    overdue_count?: number
  }
  const label = r.label ?? "este mês"
  let out = `**Resumo (${label})**\n`
  out += `- Receitas: ${formatBRL(r.income ?? 0)}\n`
  out += `- Despesas: ${formatBRL(r.expense ?? 0)}\n`
  out += `- Resultado: ${formatBRL(r.profit ?? 0)}\n`
  if (r.pending_count) {
    out += `- Pendentes: ${r.pending_count} (${formatBRL(r.pending_amount ?? 0)})\n`
  }
  if (r.overdue_count) {
    out += `- Vencidos: ${r.overdue_count} lançamento(s)\n`
  }
  return out.trim()
}

function formatForecast(raw: unknown): string {
  const r = raw as {
    has_transactions?: boolean
    opening_balance?: number
    final_balance?: number
    days_until_negative?: number | null
    min_balance?: number
    min_balance_date?: string | null
    note?: string
  }
  if (!r.has_transactions) {
    return (
      "**Previsão de caixa**\n" +
      "Ainda não há lançamentos suficientes. Importe um OFX ou cadastre receitas e despesas."
    )
  }
  let out = "**Previsão de caixa (30 dias)**\n"
  out += `- Saldo hoje (realizado): ${formatBRL(r.opening_balance ?? 0)}\n`
  out += `- Saldo projetado: ${formatBRL(r.final_balance ?? 0)}\n`
  if (r.days_until_negative != null && r.days_until_negative > 0) {
    out += `- Runway: ~${r.days_until_negative} dias até saldo negativo\n`
  } else if ((r.final_balance ?? 0) < 0) {
    out += `- Atenção: projeção indica saldo negativo no horizonte\n`
  } else {
    out += `- Runway: saldo positivo no horizonte de 30 dias\n`
  }
  if (r.note) out += `\n_${r.note}_`
  return out.trim()
}

function formatRecurring(raw: unknown): string {
  const r = raw as {
    items?: Array<{
      name?: string
      monthly_amount?: number
      times_seen?: number
    }>
  }
  const items = r.items ?? []
  if (items.length === 0) {
    return "Não identifiquei despesas recorrentes nos últimos meses."
  }
  let out = "**Despesas recorrentes detectadas**\n"
  for (const item of items.slice(0, 8)) {
    out += `- ${item.name ?? "Item"}: ~${formatBRL(item.monthly_amount ?? 0)}/mês (${item.times_seen ?? 0}x)\n`
  }
  return out.trim()
}

function formatTopParties(
  raw: unknown,
  kind: "clientes" | "fornecedores"
): string {
  const r = raw as {
    customers?: Array<{ name: string; total_received: number }>
    suppliers?: Array<{ name: string; total_paid: number }>
  }
  const parties =
    kind === "clientes"
      ? (r.customers ?? []).map((p) => ({
          name: p.name,
          total: p.total_received,
        }))
      : (r.suppliers ?? []).map((p) => ({
          name: p.name,
          total: p.total_paid,
        }))
  if (parties.length === 0) {
    return `Sem ${kind} com movimentação no período.`
  }
  let out = `**Top ${kind}**\n`
  for (const p of parties) {
    out += `- ${p.name}: ${formatBRL(p.total)}\n`
  }
  return out.trim()
}

function formatOverdue(raw: unknown): string {
  const r = raw as {
    count?: number
    total_receivable?: number
    total_payable?: number
    transactions?: Array<{
      type: string
      amount: number
      due_date: string
      description?: string | null
    }>
  }
  let out = "**Lançamentos vencidos**\n"
  out += `- A receber: ${formatBRL(r.total_receivable ?? 0)}\n`
  out += `- A pagar: ${formatBRL(r.total_payable ?? 0)}\n`
  for (const t of (r.transactions ?? []).slice(0, 6)) {
    const kind = t.type === "income" ? "Receita" : "Despesa"
    out += `- ${kind} ${formatBRL(t.amount)} · venc. ${formatDateBR(t.due_date)} · ${t.description ?? "—"}\n`
  }
  return out.trim()
}

function formatTopCategories(
  raw: unknown,
  args: Record<string, unknown>
): string {
  const r = raw as {
    categories?: Array<{ category: string; total: number }>
    period_label?: string
  }
  const list = r.categories ?? []
  const period =
    r.period_label ??
    (args.period === "last_30_days" ? "últimos 30 dias" : "este mês")
  if (list.length === 0) {
    return `Sem despesas por categoria em ${period}.`
  }
  let out = `**Despesas por categoria (${period})**\n`
  for (const c of list) {
    out += `- ${c.category}: ${formatBRL(c.total)}\n`
  }
  return out.trim()
}

function formatRecent(raw: unknown): string {
  const r = raw as {
    transactions?: Array<{
      type: string
      amount: number
      status: string
      date: string
      description?: string | null
    }>
  }
  const list = r.transactions ?? []
  if (list.length === 0) {
    return "Nenhum lançamento encontrado no período."
  }
  let out = "**Lançamentos recentes**\n"
  for (const t of list) {
    const kind = t.type === "income" ? "↑" : "↓"
    out += `- ${kind} ${formatBRL(t.amount)} · ${t.status} · ${formatDateBR(t.date)} · ${t.description ?? "—"}\n`
  }
  return out.trim()
}

function buildFallbackMessage(message: string): string {
  return (
    `Analisei sua pergunta («${message.slice(0, 80)}») com consultas automáticas aos seus dados.\n\n` +
    "Para perguntas mais abertas, use os atalhos na tela ou reformule focando em: caixa do mês, vencidos, recorrentes, clientes ou previsão de fluxo."
  )
}
