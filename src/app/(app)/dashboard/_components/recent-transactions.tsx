import Link from "next/link"
import { ArrowDownRight, ArrowUpRight } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { formatBRL } from "@/lib/utils/currency"
import { formatDateBR } from "@/lib/utils/date"
import type { RecentTransaction } from "@/lib/financial/queries"

type Props = { transactions: RecentTransaction[] }

const STATUS_LABEL: Record<RecentTransaction["status"], string> = {
  paid: "Pago",
  pending: "Pendente",
  overdue: "Vencido",
}

export function RecentTransactionsList({ transactions }: Props) {
  if (transactions.length === 0) {
    return (
      <div className="py-8 text-center text-sm text-muted-foreground">
        Nada por aqui ainda. Comece registrando uma receita.
      </div>
    )
  }

  return (
    <ul className="space-y-3">
      {transactions.map((t) => {
        const isIncome = t.type === "income"
        const Icon = isIncome ? ArrowUpRight : ArrowDownRight
        const partyName = isIncome ? t.customer_name : t.supplier_name
        return (
          <li key={t.id} className="flex items-center gap-3">
            <div
              className={`shrink-0 h-9 w-9 rounded-full flex items-center justify-center ${
                isIncome
                  ? "bg-success-soft text-success-ink"
                  : "bg-red-50 text-destructive dark:bg-red-950/40"
              }`}
            >
              <Icon className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                {t.description || (isIncome ? "Receita" : "Despesa")}
              </p>
              <p className="text-xs text-muted-foreground">
                {partyName ? `${partyName} · ` : ""}
                {formatDateBR(t.due_date)}
              </p>
            </div>
            <div className="text-right shrink-0">
              <p
                className={`text-sm font-semibold ${
                  isIncome ? "text-success-ink" : "text-foreground"
                }`}
              >
                {isIncome ? "+" : "-"} {formatBRL(t.amount)}
              </p>
              <StatusBadge status={t.status} />
            </div>
          </li>
        )
      })}
      <li className="pt-2">
        <Link
          href="/lancamentos"
          className="text-xs font-medium text-brand hover:text-brand-hover"
        >
          Ver todos →
        </Link>
      </li>
    </ul>
  )
}

function StatusBadge({ status }: { status: RecentTransaction["status"] }) {
  const cls = {
    paid: "bg-success-soft text-success-ink hover:bg-success-soft",
    pending: "bg-amber-100 text-amber-800 hover:bg-amber-100",
    overdue: "bg-red-100 text-red-800 hover:bg-red-100",
  }[status]
  return (
    <Badge variant="secondary" className={`text-[10px] mt-0.5 ${cls}`}>
      {STATUS_LABEL[status]}
    </Badge>
  )
}
