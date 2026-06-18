import Link from "next/link"
import { AlertCircle, CalendarClock } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { formatBRL } from "@/lib/utils/currency"
import { formatDateBR } from "@/lib/utils/date"
import { getAccountantPendingItems } from "@/lib/accountant/queries"

export async function ContadorPendingPanel() {
  const pending = await getAccountantPendingItems()
  const hasOverdue =
    pending.overdueReceivables.length > 0 || pending.overduePayables.length > 0
  const hasUpcoming = pending.upcomingPayables.length > 0

  if (!hasOverdue && !hasUpcoming) {
    return (
      <Card className="border-border/80">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Pendências</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Nenhuma pendência vencida ou despesa a pagar nos próximos 7 dias.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-border/80">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-warning shrink-0" aria-hidden />
          Pendências e vencimentos
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Visão read-only — o cliente gerencia em Lançamentos
        </p>
      </CardHeader>
      <CardContent className="space-y-5">
        {pending.overdueReceivables.length > 0 && (
          <PendingGroup
            title="A receber (vencido)"
            tone="income"
            items={pending.overdueReceivables}
          />
        )}
        {pending.overduePayables.length > 0 && (
          <PendingGroup
            title="A pagar (vencido)"
            tone="expense"
            items={pending.overduePayables}
          />
        )}
        {pending.upcomingPayables.length > 0 && (
          <PendingGroup
            title="A pagar (próximos 7 dias)"
            tone="upcoming"
            icon={CalendarClock}
            items={pending.upcomingPayables}
          />
        )}
        <p className="text-xs text-muted-foreground">
          <Link href="/contador?status=overdue" className="text-brand hover:underline">
            Ver todos vencidos
          </Link>
        </p>
      </CardContent>
    </Card>
  )
}

function PendingGroup({
  title,
  tone,
  items,
  icon: Icon = AlertCircle,
}: {
  title: string
  tone: "income" | "expense" | "upcoming"
  items: Array<{
    id: string
    type: "income" | "expense"
    amount: number
    description: string | null
    due_date: string
  }>
  icon?: typeof AlertCircle
}) {
  const total = items.reduce((s, i) => s + i.amount, 0)

  return (
    <div>
      <div className="flex items-center justify-between gap-2 mb-2">
        <p className="text-sm font-medium flex items-center gap-1.5">
          <Icon className="h-4 w-4 text-muted-foreground" aria-hidden />
          {title}
        </p>
        <span className="text-sm font-semibold tabular-nums">
          {formatBRL(total)}
        </span>
      </div>
      <ul className="space-y-1.5">
        {items.map((item) => (
          <li
            key={item.id}
            className="flex items-center justify-between gap-2 text-sm py-1.5 px-2 rounded-md bg-muted/40"
          >
            <div className="min-w-0">
              <p className="truncate font-medium">
                {item.description || (item.type === "income" ? "Receita" : "Despesa")}
              </p>
              <p className="text-xs text-muted-foreground">
                Vence {formatDateBR(item.due_date)}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {tone === "income" && (
                <Badge variant="secondary" className="text-[10px] bg-success-soft text-success-ink">
                  Receber
                </Badge>
              )}
              <span className="font-semibold tabular-nums">
                {formatBRL(item.amount)}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
