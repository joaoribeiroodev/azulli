import Link from "next/link"
import { TrendingDown, TrendingUp, Wallet } from "lucide-react"

import {
  computeForecastForTenant,
  tenantHasTransactions,
} from "@/lib/forecast/queries"
import type { ForecastSeries } from "@/lib/forecast/types"
import { Button } from "@/components/ui/button"
import { formatBRL } from "@/lib/utils/currency"
import { formatDateBR } from "@/lib/utils/date"

type Props = {
  forecast?: ForecastSeries
  hasTransactions?: boolean
}

export async function RunwayCard({ forecast, hasTransactions }: Props = {}) {
  const [resolvedForecast, resolvedHasTransactions] =
    forecast !== undefined && hasTransactions !== undefined
      ? [forecast, hasTransactions]
      : await Promise.all([
          computeForecastForTenant(30),
          tenantHasTransactions(),
        ])

  if (!resolvedForecast) return null

  const { summary, openingBalance } = resolvedForecast
  const days = summary.daysUntilNegative

  let title: string
  let description: string
  let tone: "ok" | "warn" | "critical" | "empty" = "ok"
  let icon: "up" | "down" | "wallet" = "up"

  if (!resolvedHasTransactions) {
    title = "Previsão de caixa"
    description =
      "Registre receitas e despesas ou importe um extrato OFX para ver quantos dias de caixa você tem."
    tone = "empty"
    icon = "wallet"
  } else if (openingBalance < 0) {
    title = "Caixa negativo hoje"
    description = "Revise pendências e recebimentos para voltar ao positivo."
    tone = "critical"
    icon = "down"
  } else if (days === null) {
    title =
      openingBalance === 0
        ? "Caixa zerado — estável no horizonte"
        : "Caixa estável no horizonte"
    description =
      openingBalance === 0
        ? "Sem ruptura prevista nos próximos 30 dias. Continue registrando movimentações."
        : `Saldo atual ${formatBRL(openingBalance)} — sem ruptura prevista nos próximos 30 dias.`
    tone = "ok"
    icon = "up"
  } else if (days <= 7) {
    title = `Aguento ~${days} dia${days === 1 ? "" : "s"} de caixa`
    description = `Ruptura prevista em ${formatDateBR(summary.minBalanceDate)}. Aja nas pendências ou receitas.`
    tone = "critical"
    icon = "down"
  } else if (days <= 14) {
    title = `Aguento ~${days} dias de caixa`
    description = `Saldo pode ficar negativo em ${formatDateBR(summary.minBalanceDate)}.`
    tone = "warn"
    icon = "down"
  } else {
    title = `Aguento ~${days} dias de caixa`
    description = `Com o ritmo atual, o saldo pode zerar em ${formatDateBR(summary.minBalanceDate)}.`
    tone = "ok"
    icon = "up"
  }

  const border =
    tone === "critical"
      ? "border-destructive/40 bg-destructive/5"
      : tone === "warn"
        ? "border-warning/40 bg-warning-soft/30"
        : tone === "empty"
          ? "border-border bg-muted/20"
          : "border-brand/25 bg-brand-soft/30"

  const actionHref =
    tone === "empty" ? "/lancamentos" : "/dashboard#forecast"
  const actionLabel =
    tone === "empty" ? "Novo lançamento" : "Ver previsão"

  return (
    <div className={`rounded-xl border p-4 ${border}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex gap-3 min-w-0">
          {icon === "wallet" ? (
            <Wallet
              className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5"
              aria-hidden
            />
          ) : icon === "up" ? (
            <TrendingUp
              className="h-5 w-5 text-brand shrink-0 mt-0.5"
              aria-hidden
            />
          ) : (
            <TrendingDown
              className={`h-5 w-5 shrink-0 mt-0.5 ${tone === "critical" ? "text-destructive" : "text-warning"}`}
              aria-hidden
            />
          )}
          <div>
            <p className="text-sm font-semibold text-brand-ink">{title}</p>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              {description}
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" asChild className="shrink-0">
          <Link href={actionHref}>{actionLabel}</Link>
        </Button>
      </div>
    </div>
  )
}
