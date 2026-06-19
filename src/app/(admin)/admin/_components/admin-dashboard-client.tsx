"use client"

import { useEffect, useState, type ReactNode } from "react"
import Link from "next/link"
import { Download, Mail, Megaphone, MessageCircle } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatBRL } from "@/lib/utils/currency"
import type { AdminMetrics } from "@/lib/admin/metrics"
import type { TenantDirectoryRow } from "@/lib/admin/tenant-directory"

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

function formatTrialEnds(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function tierLabel(tier: string) {
  if (tier === "trial") return "Trial"
  if (tier === "pro") return "Pro"
  if (tier === "enterprise") return "Empresarial"
  return tier
}

function trialWhatsAppUrl(row: TenantDirectoryRow): string | null {
  const phone = row.ownerPhone
  if (!phone) return null
  const name = row.name
  const text = `Olá! Aqui é do Azulli. O trial da empresa ${name} está chegando ao fim — quer ajuda para continuar usando o sistema?`
  return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`
}

function trialMailtoUrl(row: TenantDirectoryRow): string | null {
  const email = row.ownerEmail ?? row.tenantEmail
  if (!email) return null
  const subject = encodeURIComponent(`Azulli — seu trial está terminando`)
  const body = encodeURIComponent(
    `Olá!\n\nO período de trial da ${row.name} no Azulli está chegando ao fim. Se quiser, podemos ajudar você a escolher o plano e continuar organizando as finanças.\n\nEquipe Azulli`
  )
  return `mailto:${email}?subject=${subject}&body=${body}`
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
    <div className="space-y-8 xl:space-y-10">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button asChild variant="outline" size="sm">
          <a href="/api/admin/tenants/export" download>
            <Download className="h-4 w-4 mr-2" />
            Exportar Excel
          </a>
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link href="/admin/announcements">
            <Megaphone className="h-4 w-4 mr-2" />
            Novo aviso
          </Link>
        </Button>
      </div>

      <section className="space-y-4">
        <SectionTitle>Visão geral</SectionTitle>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-4">
          <MetricCard title="Empresas" value={String(metrics.product.totalTenants)} />
          <MetricCard title="Usuários" value={String(metrics.product.totalUsers)} />
          <MetricCard title="MAU" value={String(metrics.product.mau)} />
          <MetricCard title="DAU" value={String(metrics.product.dau)} />
        </div>
      </section>

      <section className="space-y-4">
        <SectionTitle>Assinaturas</SectionTitle>
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5">
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

      {metrics.trialsEndingSoon.length > 0 && (
        <Card className="border-amber-200/80 bg-amber-50/40">
          <CardHeader>
            <CardTitle className="text-base">
              Trials expirando nos próximos 3 dias
            </CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted-foreground border-b">
                  <th className="pb-2 pr-4">Empresa</th>
                  <th className="pb-2 pr-4">Expira</th>
                  <th className="pb-2 pr-4">Contato</th>
                  <th className="pb-2">Ações</th>
                </tr>
              </thead>
              <tbody>
                {metrics.trialsEndingSoon.map((row) => {
                  const wa = trialWhatsAppUrl(row)
                  const mail = trialMailtoUrl(row)
                  return (
                    <tr key={row.id} className="border-b border-border/50">
                      <td className="py-2 pr-4 font-medium">{row.name}</td>
                      <td className="py-2 pr-4">
                        {row.trialEndsAt ? formatTrialEnds(row.trialEndsAt) : "—"}
                      </td>
                      <td className="py-2 pr-4 text-muted-foreground">
                        <div className="space-y-0.5">
                          <p>{row.ownerEmail ?? row.tenantEmail ?? "—"}</p>
                          <p>{row.ownerPhone ?? "—"}</p>
                        </div>
                      </td>
                      <td className="py-2">
                        <div className="flex flex-wrap gap-2">
                          {wa ? (
                            <Button asChild size="sm" variant="outline">
                              <a href={wa} target="_blank" rel="noopener noreferrer">
                                <MessageCircle className="h-3.5 w-3.5 mr-1" />
                                WhatsApp
                              </a>
                            </Button>
                          ) : null}
                          {mail ? (
                            <Button asChild size="sm" variant="ghost">
                              <a href={mail}>
                                <Mail className="h-3.5 w-3.5 mr-1" />
                                E-mail
                              </a>
                            </Button>
                          ) : null}
                          {!wa && !mail && (
                            <span className="text-xs text-muted-foreground">
                              Sem contato
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      <section className="space-y-4">
        <SectionTitle>Financeiro</SectionTitle>
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

      <div className="grid gap-4 xl:grid-cols-2 2xl:grid-cols-3">
        <Card className="2xl:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">Novos cadastros</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              Últimos 7 dias: <strong>{metrics.product.newTenantsLast7Days}</strong>
            </p>
            <p>
              Últimos 30 dias: <strong>{metrics.product.newTenantsLast30Days}</strong>
            </p>
          </CardContent>
        </Card>

        <Card className="2xl:col-span-1">
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

      <Card className="overflow-hidden">
        <CardHeader className="border-b bg-muted/30">
          <CardTitle className="text-base">Empresas recentes</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0 sm:p-6">
          <table className="w-full text-sm min-w-[640px]">
            <thead>
              <tr className="text-left text-muted-foreground border-b">
                <th className="pb-2 pr-4">Empresa</th>
                <th className="pb-2 pr-4">E-mail</th>
                <th className="pb-2 pr-4">Telefone</th>
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
                  <td className="py-2 pr-4 text-muted-foreground">
                    {row.ownerPhone ?? "—"}
                  </td>
                  <td className="py-2 pr-4">{tierLabel(row.tier)}</td>
                  <td className="py-2 pr-4">{row.subscriptionStatus}</td>
                  <td className="py-2">{formatDate(row.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {metrics.recentTenants.length === 0 && (
            <p className="text-sm text-muted-foreground p-6">Nenhuma empresa cadastrada.</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
      {children}
    </h2>
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
