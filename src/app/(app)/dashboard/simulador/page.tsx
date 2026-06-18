import { redirect } from "next/navigation"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"

import { Button } from "@/components/ui/button"
import { tenantHasForecastAccess } from "@/lib/billing/tenant-tier"
import { computeForecastForTenant, loadForecastEngineInput } from "@/lib/forecast/queries"

import { SimulatorShell } from "./_components/simulator-shell"

export const metadata = { title: "Simulador «e se?» — Azulli" }

export default async function SimuladorPage() {
  if (!(await tenantHasForecastAccess())) {
    redirect("/billing?upsell=previsao")
  }

  const [baselineSeries, baselineInput] = await Promise.all([
    computeForecastForTenant(30),
    loadForecastEngineInput(30),
  ])
  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto space-y-6">
      <header>
        <Button asChild variant="ghost" size="sm" className="mb-2 gap-2 -ml-2">
          <Link href="/dashboard">
            <ArrowLeft className="h-4 w-4" />
            Voltar ao painel
          </Link>
        </Button>
        <h1 className="text-2xl lg:text-3xl font-display font-bold text-brand-ink">
          Simulador «e se?»
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Adicione ajustes hipotéticos e veja o impacto no seu fluxo de caixa
          em tempo real. Nada é alterado nos seus lançamentos reais.
        </p>
      </header>

      <SimulatorShell
        baselineSeries={baselineSeries}
        scheduled={baselineInput.scheduled}
        today={baselineInput.today}
      />
    </div>
  )
}
