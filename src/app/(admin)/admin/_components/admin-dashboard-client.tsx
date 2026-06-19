"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Megaphone, LogOut } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatBRL } from "@/lib/utils/currency"

type Metrics = {
  product: {
    totalUsers: number
    mau: number
    dau: number
    planDistribution: Record<string, number>
    totalTenants: number
    activeTenants: number
  }
  financial: {
    grossRevenue: number
    mrr: number
    totalAdSpend: number
    cac: number | null
    roi: number | null
    churnRate: number | null
  }
  marketing: {
    totalInboundLeads: number
    convertedLeads: number
    conversionRate: number | null
    leadsByStatus: Record<string, number>
  }
}

export function AdminDashboardClient() {
  const [metrics, setMetrics] = useState<Metrics | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch("/api/admin/metrics")
      .then(async (res) => {
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          throw new Error(data.error ?? "Falha ao carregar métricas")
        }
        return res.json()
      })
      .then(setMetrics)
      .catch((e) => setError(e.message))
  }, [])

  if (error) {
    return (
      <p className="text-sm text-destructive bg-destructive/10 rounded-lg p-4">
        {error}
      </p>
    )
  }

  if (!metrics) {
    return <p className="text-sm text-muted-foreground">Carregando métricas…</p>
  }

  const pct = (n: number | null) =>
    n === null ? "—" : `${(n * 100).toFixed(1)}%`

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard title="Usuários" value={String(metrics.product.totalUsers)} />
        <MetricCard title="MAU" value={String(metrics.product.mau)} />
        <MetricCard title="DAU" value={String(metrics.product.dau)} />
        <MetricCard
          title="Tenants ativos"
          value={String(metrics.product.activeTenants)}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <MetricCard
          title="Faturamento bruto"
          value={formatBRL(metrics.financial.grossRevenue)}
        />
        <MetricCard title="MRR" value={formatBRL(metrics.financial.mrr)} />
        <MetricCard
          title="Investimento Ads"
          value={formatBRL(metrics.financial.totalAdSpend)}
        />
        <MetricCard title="CAC" value={formatBRL(metrics.financial.cac ?? 0)} />
        <MetricCard title="ROI" value={pct(metrics.financial.roi)} />
        <MetricCard title="Churn" value={pct(metrics.financial.churnRate)} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Funil inbound</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>Total leads: {metrics.marketing.totalInboundLeads}</p>
            <p>Convertidos: {metrics.marketing.convertedLeads}</p>
            <p>Taxa conversão: {pct(metrics.marketing.conversionRate)}</p>
            <ul className="text-muted-foreground">
              {Object.entries(metrics.marketing.leadsByStatus).map(([k, v]) => (
                <li key={k}>{k}: {v}</li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Distribuição de planos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            {Object.entries(metrics.product.planDistribution).map(([tier, n]) => (
              <p key={tier}>{tier}: {n}</p>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-2">
        <Button asChild variant="outline">
          <Link href="/admin/announcements">
            <Megaphone className="h-4 w-4 mr-2" />
            Avisos globais
          </Link>
        </Button>
        <Button asChild variant="ghost">
          <Link href="/login">
            <LogOut className="h-4 w-4 mr-2" />
            Sair
          </Link>
        </Button>
      </div>
    </div>
  )
}

function MetricCard({ title, value }: { title: string; value: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-display font-bold text-brand-ink">{value}</p>
      </CardContent>
    </Card>
  )
}
