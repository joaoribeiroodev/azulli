"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Megaphone, LogOut } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatBRL } from "@/lib/utils/currency"
import type { AdminMetrics } from "@/lib/admin/metrics"

function pct(n: number | null) {
  return n === null ? "—" : `${(n * 100).toFixed(1)}%`
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

function tierLabel(tier: string) {
  if (tier === "trial") return "Trial"
  if (tier === "pro") return "Pro"
  if (tier === "enterprise") return "Empresarial"
  return tier
}

export function AdminDashboardClient() {
  const [metrics, setMetrics] = useState<AdminMetrics | null>(null)
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
    return <p className="text-sm text-muted-foreground">Carregando painel…</p>
  }

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Visão geral
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard title="Empresas" value={String(metrics.product.totalTenants)} />
          <MetricCard title="Usuários" value={String(metrics.product.totalUsers)} />
          <MetricCard title="MAU" value={String(metrics.product.mau)} />
          <MetricCard title="DAU" value={String(metrics.product.dau)} />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Assinaturas
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <MetricCard title="Ativas" value={String(metrics.subscriptions.active)} />
          <MetricCard title="Trials" value={String(metrics.subscriptions.trialsActive)} />
          <MetricCard
            title="Trial expira (3 dias)"
            value={String(metrics.subscriptions.trialsEndingSoon)}
          />
          <MetricCard title="Inadimplentes" value={String(metrics.subscriptions.pastDue)} />
          <MetricCard title="Canceladas" value={String(metrics.subscriptions.canceled)} />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Financeiro
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard title="MRR estimado" value={formatBRL(metrics.financial.mrr)} />
          <MetricCard
            title="Receita (30 dias)"
            value={formatBRL(metrics.financial.revenueLast30Days)}
          />
          <MetricCard
            title="Receita total"
            value={formatBRL(metrics.financial.revenueAllTime)}
          />
          <MetricCard title="Churn" value={pct(metrics.financial.churnRate)} />
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Novos cadastros</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>Últimos 7 dias: <strong>{metrics.product.newTenantsLast7Days}</strong></p>
            <p>Últimos 30 dias: <strong>{metrics.product.newTenantsLast30Days}</strong></p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Planos (empresas)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            {Object.entries(metrics.product.planDistribution).map(([tier, n]) => (
              <p key={tier}>
                {tierLabel(tier)}: <strong>{n}</strong>
              </p>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Empresas recentes</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-muted-foreground border-b">
                <th className="pb-2 pr-4">Empresa</th>
                <th className="pb-2 pr-4">E-mail</th>
                <th className="pb-2 pr-4">Plano</th>
                <th className="pb-2 pr-4">Status</th>
                <th className="pb-2">Cadastro</th>
              </tr>
            </thead>
            <tbody>
              {metrics.recentTenants.map((row) => (
                <tr key={row.id} className="border-b border-border/50">
                  <td className="py-2 pr-4 font-medium">{row.name}</td>
                  <td className="py-2 pr-4 text-muted-foreground">
                    {row.ownerEmail ?? "—"}
                  </td>
                  <td className="py-2 pr-4">{tierLabel(row.tier)}</td>
                  <td className="py-2 pr-4">{row.subscriptionStatus}</td>
                  <td className="py-2">{formatDate(row.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {metrics.recentTenants.length === 0 && (
            <p className="text-sm text-muted-foreground">Nenhuma empresa cadastrada.</p>
          )}
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2">
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
