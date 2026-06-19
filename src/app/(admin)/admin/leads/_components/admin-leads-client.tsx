"use client"

import { useCallback, useEffect, useState } from "react"
import { LayoutGrid, List } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import {
  LEAD_STATUSES,
  LEAD_STATUS_LABELS,
  type LeadRow,
  type LeadStatus,
} from "@/lib/admin/leads"

type ViewMode = "kanban" | "table"

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export function AdminLeadsClient() {
  const [leads, setLeads] = useState<LeadRow[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<ViewMode>("kanban")
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  const loadLeads = useCallback(() => {
    setLoading(true)
    fetch("/api/admin/leads")
      .then(async (res) => {
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          throw new Error(data.error ?? "Falha ao carregar leads")
        }
        return res.json()
      })
      .then((data) => setLeads(data.leads ?? []))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    loadLeads()
  }, [loadLeads])

  async function updateStatus(id: string, status: LeadStatus) {
    setUpdatingId(id)
    try {
      const res = await fetch(`/api/admin/leads/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? "Falha ao atualizar status")
      }
      setLeads((prev) =>
        prev.map((lead) =>
          lead.id === id ? { ...lead, status, updated_at: new Date().toISOString() } : lead
        )
      )
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao atualizar")
    } finally {
      setUpdatingId(null)
    }
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground">Carregando leads…</p>
  }

  if (error && leads.length === 0) {
    return (
      <p className="text-sm text-destructive bg-destructive/10 rounded-lg p-4">
        {error}
      </p>
    )
  }

  const counts = LEAD_STATUSES.reduce(
    (acc, status) => {
      acc[status] = leads.filter((l) => l.status === status).length
      return acc
    },
    {} as Record<LeadStatus, number>
  )

  return (
    <div className="space-y-6">
      {error ? (
        <p className="text-sm text-destructive bg-destructive/10 rounded-lg p-3">
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
          <span>
            Total: <strong className="text-foreground">{leads.length}</strong>
          </span>
          {LEAD_STATUSES.map((status) => (
            <span key={status}>
              {LEAD_STATUS_LABELS[status]}:{" "}
              <strong className="text-foreground">{counts[status]}</strong>
            </span>
          ))}
        </div>
        <div className="flex gap-1 rounded-lg border p-1">
          <Button
            type="button"
            variant={view === "kanban" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setView("kanban")}
            aria-pressed={view === "kanban"}
          >
            <LayoutGrid className="h-4 w-4 mr-1.5" />
            Kanban
          </Button>
          <Button
            type="button"
            variant={view === "table" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setView("table")}
            aria-pressed={view === "table"}
          >
            <List className="h-4 w-4 mr-1.5" />
            Tabela
          </Button>
        </div>
      </div>

      {leads.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Nenhum lead capturado ainda. Configure o n8n para enviar ao webhook.
          </CardContent>
        </Card>
      ) : view === "kanban" ? (
        <KanbanView
          leads={leads}
          updatingId={updatingId}
          onStatusChange={updateStatus}
        />
      ) : (
        <TableView leads={leads} updatingId={updatingId} onStatusChange={updateStatus} />
      )}
    </div>
  )
}

function KanbanView({
  leads,
  updatingId,
  onStatusChange,
}: {
  leads: LeadRow[]
  updatingId: string | null
  onStatusChange: (id: string, status: LeadStatus) => void
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {LEAD_STATUSES.map((status) => {
        const columnLeads = leads.filter((l) => l.status === status)
        return (
          <div key={status} className="min-w-0">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-brand-ink">
                {LEAD_STATUS_LABELS[status]}
              </h2>
              <span className="text-xs text-muted-foreground tabular-nums">
                {columnLeads.length}
              </span>
            </div>
            <div className="space-y-3 min-h-[120px] rounded-xl border border-dashed border-border/80 bg-muted/20 p-3">
              {columnLeads.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-6">
                  Vazio
                </p>
              ) : (
                columnLeads.map((lead) => (
                  <LeadCard
                    key={lead.id}
                    lead={lead}
                    updating={updatingId === lead.id}
                    onStatusChange={onStatusChange}
                  />
                ))
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function LeadCard({
  lead,
  updating,
  onStatusChange,
}: {
  lead: LeadRow
  updating: boolean
  onStatusChange: (id: string, status: LeadStatus) => void
}) {
  return (
    <Card className="shadow-sm">
      <CardHeader className="p-4 pb-2">
        <CardTitle className="text-sm font-semibold leading-snug">
          {lead.name ?? "Sem nome"}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-0 space-y-2">
        <LeadDetails lead={lead} compact />
        <StatusSelect
          value={lead.status}
          disabled={updating}
          onValueChange={(status) => onStatusChange(lead.id, status)}
        />
      </CardContent>
    </Card>
  )
}

function TableView({
  leads,
  updatingId,
  onStatusChange,
}: {
  leads: LeadRow[]
  updatingId: string | null
  onStatusChange: (id: string, status: LeadStatus) => void
}) {
  return (
    <Card className="overflow-hidden">
      <CardContent className="overflow-x-auto p-0 sm:p-6">
        <table className="w-full text-sm min-w-[800px]">
          <thead>
            <tr className="text-left text-muted-foreground border-b">
              <th className="pb-2 pr-4">Nome</th>
              <th className="pb-2 pr-4">E-mail</th>
              <th className="pb-2 pr-4">CNPJ</th>
              <th className="pb-2 pr-4">UTM source</th>
              <th className="pb-2 pr-4">UTM campaign</th>
              <th className="pb-2 pr-4">Cadastro</th>
              <th className="pb-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {leads.map((lead) => (
              <tr key={lead.id} className="border-b border-border/50">
                <td className="py-2.5 pr-4 font-medium">{lead.name ?? "—"}</td>
                <td className="py-2.5 pr-4 text-muted-foreground">
                  {lead.email ?? "—"}
                </td>
                <td className="py-2.5 pr-4 text-muted-foreground">
                  {lead.cnpj ?? "—"}
                </td>
                <td className="py-2.5 pr-4 text-muted-foreground">
                  {lead.utm_source ?? "—"}
                </td>
                <td className="py-2.5 pr-4 text-muted-foreground">
                  {lead.utm_campaign ?? "—"}
                </td>
                <td className="py-2.5 pr-4 text-muted-foreground whitespace-nowrap">
                  {formatDate(lead.created_at)}
                </td>
                <td className="py-2.5">
                  <StatusSelect
                    value={lead.status}
                    disabled={updatingId === lead.id}
                    onValueChange={(status) => onStatusChange(lead.id, status)}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  )
}

function LeadDetails({ lead, compact }: { lead: LeadRow; compact?: boolean }) {
  return (
    <div className={cn("text-xs text-muted-foreground space-y-0.5", compact && "text-[11px]")}>
      {lead.email ? <p>{lead.email}</p> : null}
      {lead.cnpj ? <p>CNPJ: {lead.cnpj}</p> : null}
      {(lead.utm_source || lead.utm_campaign) && (
        <p className="text-[11px] leading-relaxed">
          {lead.utm_source ? `source: ${lead.utm_source}` : null}
          {lead.utm_source && lead.utm_campaign ? " · " : null}
          {lead.utm_campaign ? `campaign: ${lead.utm_campaign}` : null}
        </p>
      )}
      <p className="text-[11px]">{formatDate(lead.created_at)}</p>
    </div>
  )
}

function StatusSelect({
  value,
  disabled,
  onValueChange,
}: {
  value: LeadStatus
  disabled?: boolean
  onValueChange: (status: LeadStatus) => void
}) {
  return (
    <Select
      value={value}
      disabled={disabled}
      onValueChange={(v) => onValueChange(v as LeadStatus)}
    >
      <SelectTrigger size="sm" className="w-full max-w-[140px]">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {LEAD_STATUSES.map((status) => (
          <SelectItem key={status} value={status}>
            {LEAD_STATUS_LABELS[status]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
