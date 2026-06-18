import { Suspense } from "react"
import { Skeleton } from "@/components/ui/skeleton"
import { EnterpriseFeatureUpsell } from "@/components/app/enterprise-feature-upsell"
import { tenantHasForecastAccess } from "@/lib/billing/tenant-tier"
import { RunwayCard } from "../_components/runway-card"
import { CashFlowForecastCard } from "../_components/cash-flow-forecast"
import { ForecastAlerts } from "../_components/forecast-alerts"
import { computeForecastForTenant, tenantHasTransactions } from "@/lib/forecast/queries"
import { buildAlerts } from "@/lib/forecast/alerts"
import { listDismissedAlertKeys } from "@/lib/forecast/actions"

export function ForecastGateSection() {
  return (
    <Suspense fallback={<Skeleton className="h-96" />}>
      <ForecastGateContent />
    </Suspense>
  )
}

async function ForecastGateContent() {
  const allowed = await tenantHasForecastAccess()
  if (!allowed) {
    return (
      <div className="space-y-4">
        <EnterpriseFeatureUpsell feature="forecast" />
      </div>
    )
  }

  const [series, forecast30, dismissed, hasTransactions] = await Promise.all([
    computeForecastForTenant(90),
    computeForecastForTenant(30),
    listDismissedAlertKeys(),
    tenantHasTransactions(),
  ])
  const alerts = buildAlerts(series).filter((a) => !dismissed.has(a.key))

  return (
    <div className="space-y-4">
      <RunwayCard forecast={forecast30} hasTransactions={hasTransactions} />
      <div id="forecast" className="space-y-4 scroll-mt-20">
        <ForecastAlerts alerts={alerts} />
        <CashFlowForecastCard series={series} />
      </div>
    </div>
  )
}
