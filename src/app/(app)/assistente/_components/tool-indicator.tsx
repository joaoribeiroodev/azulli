import { Loader2, type LucideIcon, BarChart3, ListChecks, PieChart, Repeat, Crown, Truck, Search, AlertCircle } from "lucide-react"

const TOOL_LABELS: Record<string, { label: string; icon: LucideIcon }> = {
  get_financial_summary: { label: "Consultando seu caixa…", icon: BarChart3 },
  list_recent_transactions: { label: "Buscando lançamentos…", icon: ListChecks },
  get_top_categories: { label: "Agrupando por categoria…", icon: PieChart },
  get_recurring_expenses: { label: "Detectando recorrentes…", icon: Repeat },
  get_top_customers: { label: "Listando top clientes…", icon: Crown },
  get_top_suppliers: { label: "Listando top fornecedores…", icon: Truck },
  search_transactions: { label: "Buscando…", icon: Search },
  get_overdue_transactions: { label: "Levantando vencidos…", icon: AlertCircle },
}

export function ToolIndicator({
  name,
  done,
}: {
  name: string
  done?: boolean
}) {
  const meta = TOOL_LABELS[name] ?? {
    label: `Executando ${name}…`,
    icon: BarChart3,
  }
  const Icon = done ? meta.icon : Loader2
  return (
    <div className="inline-flex items-center gap-2 text-xs text-muted-foreground bg-muted/60 rounded-full px-3 py-1">
      <Icon className={`h-3 w-3 ${done ? "" : "animate-spin"}`} />
      <span>{done ? meta.label.replace("…", "") : meta.label}</span>
    </div>
  )
}
