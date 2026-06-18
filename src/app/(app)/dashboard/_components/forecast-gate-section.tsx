import { Suspense } from "react"
import { Skeleton } from "@/components/ui/skeleton"
import { EnterpriseFeatureUpsell } from "@/components/app/enterprise-feature-upsell"
import { tenantHasForecastAccess } from "@/lib/billing/tenant-tier"
import { RunwayCard } from "./runway-card"
import { CashFlowForecastCard } from "./cash-flow-forecast"
import { ForecastAlerts } from "./forecast-alerts"
import {
  computeForecastForTenant,
  tenantHasTransactions,
} from "@/lib/forecast/queries"
import { buildAlerts } from "@/lib/forecast/alerts"
import { listDismissedAlertKeys } from "@/lib/forecast/actions"

/** Runway + alertas — faixa de notificação acima dos KPIs. */
export function ForecastNotifications() {
  return (
    <Suspense fallback={<Skeleton className="h-20" />}>
      <ForecastNotificationsContent />
    </Suspense>
  )
}

async function ForecastNotificationsContent() {
  const allowed = await tenantHasForecastAccess()
  if (!allowed) {
    return <EnterpriseFeatureUpsell feature="forecast" />
  }

  const [forecast30, dismissed, hasTransactions, series] = await Promise.all([
    computeForecastForTenant(30),
    listDismissedAlertKeys(),
    tenantHasTransactions(),
    computeForecastForTenant(90),
  ])
  const alerts = buildAlerts(series).filter((a) => !dismissed.has(a.key))

  return (
    <div className="space-y-3">
      <RunwayCard forecast={forecast30} hasTransactions={hasTransactions} />
      {alerts.length > 0 && <ForecastAlerts alerts={alerts} />}
    </div>
  )
}

/** Gráfico completo de previsão — abaixo dos gráficos do mês. */
export function ForecastChartSection() {
  return (
    <Suspense fallback={<Skeleton className="h-96" />}>
      <ForecastChartContent />
    </Suspense>
  )
}

async function ForecastChartContent() {
  const allowed = await tenantHasForecastAccess()
  if (!allowed) return null

  const series = await computeForecastForTenant(90)

  return (
    <div id="forecast" className="scroll-mt-20">
      <CashFlowForecastCard series={series} />
    </div>
  )
}
