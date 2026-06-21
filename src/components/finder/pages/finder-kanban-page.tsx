"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { toast } from "sonner"

import { useFinderPageMeta } from "@/components/finder/finder-context"
import { useFinderPermissions } from "@/components/finder/use-finder-permissions"
import { FinderReadOnlyNotice } from "@/components/finder/ui/read-only-notice"
import { IcpBadge } from "@/components/finder/ui/icp-badge"
import { LeadStatusBadge } from "@/components/finder/ui/lead-status-badge"
import { LoadingState } from "@/components/finder/ui/loading-state"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { KANBAN_COLUMNS, STATUS_LABEL } from "@/lib/finder/constants"
import { fmtDate, fmtPhone } from "@/lib/finder/format"
import { finderClient } from "@/lib/finder/client"
import type { Lead, LeadStatus } from "@/lib/finder/types"
import { cn } from "@/lib/utils"

function emptyGrouped(): Record<LeadStatus, Lead[]> {
  return {
    novo: [],
    qualificado: [],
    contatado: [],
    em_negociacao: [],
    assinante: [],
    descartado: [],
  }
}

export function FinderKanbanPage() {
  useFinderPageMeta({
    title: "Pipeline (Kanban)",
    subtitle: "Arraste leads entre as etapas do pipeline comercial",
  })

  const { canWriteLeads, isReadOnly } = useFinderPermissions()

  const [q, setQ] = useState("")
  const [uf, setUf] = useState("")
  const [scoreMin, setScoreMin] = useState("")
  const [grouped, setGrouped] = useState<Record<LeadStatus, Lead[]>>(emptyGrouped)
  const [statusText, setStatusText] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [draggedId, setDraggedId] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState<LeadStatus | null>(null)

  const loadBoard = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { leads, total } = await finderClient.leads.list({
        q: q.trim(),
        uf: uf.trim().toUpperCase(),
        scoreMin: scoreMin.trim(),
        limit: 200,
      })
      setStatusText(`${leads.length} de ${total} leads carregados`)

      const next = emptyGrouped()
      leads.forEach((l) => {
        if (next[l.status]) next[l.status].push(l)
      })
      setGrouped(next)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar")
    } finally {
      setLoading(false)
    }
  }, [q, uf, scoreMin])

  useEffect(() => {
    loadBoard()
  }, [loadBoard])

  async function handleDrop(targetStatus: LeadStatus) {
    if (!draggedId || !canWriteLeads) return
    const id = draggedId
    setDraggedId(null)
    setDragOver(null)
    try {
      await finderClient.leads.status(id, targetStatus)
      toast.success(`Lead movido para "${STATUS_LABEL[targetStatus]}".`)
      loadBoard()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao mover lead")
    }
  }

  return (
    <div className="space-y-4">
      {isReadOnly ? <FinderReadOnlyNotice /> : null}
      <Card>
        <CardContent className="pt-4 flex flex-wrap items-center gap-3">
          <Input
            className="flex-1 min-w-[200px]"
            placeholder="Filtrar por nome…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && loadBoard()}
          />
          <Input
            maxLength={2}
            className="uppercase w-20"
            placeholder="UF"
            value={uf}
            onChange={(e) => setUf(e.target.value)}
          />
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            ICP ≥
            <Input
              type="number"
              min={0}
              max={100}
              step={5}
              className="w-24"
              placeholder="0"
              value={scoreMin}
              onChange={(e) => setScoreMin(e.target.value)}
            />
          </div>
          <Button type="button" className="bg-brand hover:bg-brand-hover" onClick={loadBoard}>
            Aplicar
          </Button>
          {statusText ? <span className="text-xs text-muted-foreground">{statusText}</span> : null}
        </CardContent>
      </Card>

      {loading ? (
        <LoadingState />
      ) : error ? (
        <div className="bg-destructive/10 border border-destructive/30 text-destructive p-4 rounded-lg text-sm">
          {error}
        </div>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory xl:grid xl:grid-cols-6 xl:overflow-x-auto">
          {KANBAN_COLUMNS.map((col) => {
            const cards = grouped[col.id] || []
            return (
              <div
                key={col.id}
                className={cn(
                  "flex-none w-[min(85vw,280px)] xl:w-auto snap-start rounded-xl border bg-muted/50 p-3 flex flex-col gap-2 min-h-[min(60vh,420px)]",
                  dragOver === col.id && "bg-brand/10 border-brand"
                )}
                onDragOver={
                  canWriteLeads
                    ? (e) => {
                        e.preventDefault()
                        setDragOver(col.id)
                      }
                    : undefined
                }
                onDragLeave={canWriteLeads ? () => setDragOver(null) : undefined}
                onDrop={
                  canWriteLeads
                    ? (e) => {
                        e.preventDefault()
                        handleDrop(col.id)
                      }
                    : undefined
                }
              >
                <div className="flex items-center justify-between font-bold text-sm pb-2 border-b mb-1">
                  <div className="flex items-center gap-2">
                    <LeadStatusBadge status={col.id} />
                    <span>{col.label}</span>
                  </div>
                  <span className="text-xs font-semibold text-muted-foreground">{cards.length}</span>
                </div>
                <div className="space-y-2 flex-1">
                  {cards.length === 0 ? (
                    <div className="text-xs text-muted-foreground text-center py-4">vazio</div>
                  ) : (
                    cards.map((lead) => (
                      <div
                        key={lead.id}
                        draggable={canWriteLeads}
                        onDragStart={
                          canWriteLeads ? () => setDraggedId(lead.id) : undefined
                        }
                        onDragEnd={
                          canWriteLeads
                            ? () => {
                                setDraggedId(null)
                                setDragOver(null)
                              }
                            : undefined
                        }
                        className={cn(
                          "rounded-lg border bg-card p-3 transition shadow-sm hover:shadow-md",
                          canWriteLeads
                            ? "cursor-grab active:cursor-grabbing"
                            : "cursor-default",
                          draggedId === lead.id && "opacity-50 scale-[0.98]"
                        )}
                      >
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <IcpBadge score={lead.icp_score} />
                          {lead.segmento ? (
                            <span className="text-[10px] text-muted-foreground capitalize">
                              {lead.segmento}
                            </span>
                          ) : null}
                        </div>
                        <Link
                          href={`/finder/leads/${lead.id}`}
                          className="block font-semibold text-sm hover:text-brand leading-tight"
                        >
                          {lead.nome}
                        </Link>
                        <div className="text-xs text-muted-foreground mt-1 truncate">
                          {lead.cidade || ""}
                          {lead.uf ? `/${lead.uf}` : ""}
                        </div>
                        <div className="flex items-center justify-between mt-2 text-xs">
                          <span className="text-muted-foreground">
                            {lead.telefone ? fmtPhone(lead.telefone) : "—"}
                          </span>
                          <span className="text-muted-foreground/70 text-[10px]">
                            {fmtDate(lead.updated_at)}
                          </span>
                        </div>
                        {lead.responsavel_nome ? (
                          <div className="mt-1 text-[10px] text-brand truncate">
                            👤 {lead.responsavel_nome}
                          </div>
                        ) : null}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
