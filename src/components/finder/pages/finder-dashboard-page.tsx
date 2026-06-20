"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

import { useFinderPageMeta } from "@/components/finder/finder-context"
import { LoadingState } from "@/components/finder/ui/loading-state"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { STATUS_COLORS, STATUS_LABEL, STATUS_ORDER } from "@/lib/finder/constants"
import { finderClient } from "@/lib/finder/client"
import type { LeadsStatsResponse } from "@/lib/finder/types"

const SEGMENT_COLORS = ["#1f57e6", "#3273ff", "#5891ff", "#8ab6ff", "#bcd6ff", "#deebff"]

export function FinderDashboardPage() {
  useFinderPageMeta({
    title: "Dashboard",
    subtitle: "Visão geral da prospecção de assinantes do Azulli",
  })

  const [stats, setStats] = useState<LeadsStatsResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    finderClient.leads
      .stats()
      .then(setStats)
      .catch((e) => setError(e instanceof Error ? e.message : "Erro ao carregar"))
  }, [])

  if (error) {
    return (
      <p className="text-sm text-destructive bg-destructive/10 border border-destructive/30 rounded-lg p-4">
        {error}
      </p>
    )
  }

  if (!stats) return <LoadingState label="Carregando dashboard…" />

  const r = stats.resumo
  const statusData = STATUS_ORDER.map((s) => ({
    name: STATUS_LABEL[s],
    value: stats.byStatus.find((d) => d.status === s)?.total ?? 0,
    fill: STATUS_COLORS[s],
  }))

  const segmentData = stats.bySegmento.slice(0, 6).map((d, i) => ({
    name: d.segmento,
    value: d.total,
    fill: SEGMENT_COLORS[i % SEGMENT_COLORS.length],
  }))

  const ufData = stats.byUf.map((d) => ({
    uf: d.uf,
    total: d.total,
  }))

  const statCards = [
    { label: "Total de leads", value: r.total, hint: "Toda a base do Finder" },
    {
      label: "Em pipeline",
      value: r.ativos,
      hint: "Novos, qualificados, contatados, em negociação",
    },
    {
      label: "Assinantes",
      value: r.assinantes,
      hint: "Leads convertidos em assinantes do Azulli",
    },
    { label: "ICP médio", value: r.icp_medio, hint: "Score médio dos leads enriquecidos" },
    { label: "Buscas (7d)", value: r.buscas_7d, hint: "Atividade do time na última semana" },
  ]

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {statCards.map((c) => (
          <Card key={c.label}>
            <CardContent className="pt-5">
              <p className="text-xs uppercase tracking-wide font-semibold text-muted-foreground">
                {c.label}
              </p>
              <p className="text-2xl sm:text-3xl font-display font-bold text-brand-ink mt-1">
                {c.value ?? 0}
              </p>
              <p className="text-xs text-muted-foreground mt-1">{c.hint}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm">Funil comercial</CardTitle>
            <p className="text-xs text-muted-foreground">Leads por etapa do pipeline</p>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={statusData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {statusData.map((entry) => (
                    <Cell key={entry.name} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Top segmentos</CardTitle>
            <p className="text-xs text-muted-foreground">Onde concentrar prospecção</p>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={segmentData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="45%"
                  outerRadius={70}
                  label={false}
                >
                  {segmentData.map((entry) => (
                    <Cell key={entry.name} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap gap-2 justify-center -mt-2">
              {segmentData.map((d) => (
                <span key={d.name} className="text-[10px] text-muted-foreground">
                  {d.name} ({d.value})
                </span>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="text-sm">Distribuição geográfica</CardTitle>
            <p className="text-xs text-muted-foreground">Leads por UF (top 15)</p>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={ufData}
                layout="vertical"
                margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
              >
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="uf" width={32} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="total" fill="#1f57e6" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Próximos passos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Link
              href="/finder/buscar"
              className="border rounded-xl p-4 transition hover:border-brand hover:bg-brand/5"
            >
              <div className="text-xs uppercase font-semibold text-brand tracking-wider mb-1">
                Prospectar
              </div>
              <div className="text-sm font-medium">Buscar novos leads</div>
              <div className="text-xs text-muted-foreground mt-1">
                Encontre MEIs com bom ICP por segmento + região
              </div>
            </Link>
            <Link
              href="/finder/kanban"
              className="border rounded-xl p-4 transition hover:border-brand hover:bg-brand/5"
            >
              <div className="text-xs uppercase font-semibold text-brand tracking-wider mb-1">
                Trabalhar pipeline
              </div>
              <div className="text-sm font-medium">Abrir Kanban</div>
              <div className="text-xs text-muted-foreground mt-1">
                Mover leads entre etapas até virar assinante
              </div>
            </Link>
            <Link
              href="/finder/leads?sort=icp_score&dir=desc&status=novo,qualificado"
              className="border rounded-xl p-4 transition hover:border-brand hover:bg-brand/5"
            >
              <div className="text-xs uppercase font-semibold text-brand tracking-wider mb-1">
                Foco
              </div>
              <div className="text-sm font-medium">Leads de alto ICP</div>
              <div className="text-xs text-muted-foreground mt-1">
                Lista ordenada por score, novos e qualificados
              </div>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
