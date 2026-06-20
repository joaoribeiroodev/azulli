"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Download, Loader2 } from "lucide-react"
import { toast } from "sonner"

import { useFinderPageMeta } from "@/components/finder/finder-context"
import { EmptyState } from "@/components/finder/ui/empty-state"
import { IcpBadge } from "@/components/finder/ui/icp-badge"
import { LeadStatusBadge } from "@/components/finder/ui/lead-status-badge"
import { LoadingState } from "@/components/finder/ui/loading-state"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { SEGMENTOS, STATUS_LABEL } from "@/lib/finder/constants"
import { exportLeadsExcel } from "@/lib/finder/export-leads"
import { fmtDate, fmtPhone } from "@/lib/finder/format"
import { finderClient } from "@/lib/finder/client"
import type { Lead } from "@/lib/finder/types"

export function FinderLeadsPage() {
  useFinderPageMeta({
    title: "Leads",
    subtitle: "Lista filtrável de potenciais assinantes",
  })

  const router = useRouter()
  const searchParams = useSearchParams()

  const [q, setQ] = useState("")
  const [status, setStatus] = useState("")
  const [segmento, setSegmento] = useState("")
  const [uf, setUf] = useState("")
  const [scoreMin, setScoreMin] = useState("")
  const [sort, setSort] = useState("icp_score")
  const [dir, setDir] = useState("desc")
  const [searchId, setSearchId] = useState("")

  const [leads, setLeads] = useState<Lead[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setStatus(searchParams.get("status")?.split(",")[0] || "")
    setSegmento(searchParams.get("segmento") || "")
    setUf(searchParams.get("uf") || "")
    setQ(searchParams.get("q") || "")
    setScoreMin(searchParams.get("scoreMin") || "")
    setSort(searchParams.get("sort") || "icp_score")
    setDir(searchParams.get("dir") || "desc")
    setSearchId(searchParams.get("searchId") || "")
  }, [searchParams])

  const buildQueryParams = useCallback(() => {
    const params: Record<string, string | number> = {
      q: q.trim(),
      status: status.trim(),
      segmento: segmento.trim(),
      uf: uf.trim().toUpperCase(),
      scoreMin: scoreMin.trim(),
      sort,
      dir,
      limit: 100,
    }
    if (searchId.trim()) params.searchId = searchId.trim()
    return params
  }, [q, status, segmento, uf, scoreMin, sort, dir, searchId])

  const loadLeads = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = buildQueryParams()
      const res = await finderClient.leads.list(params)
      setLeads(res.leads)
      setTotal(res.total)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar")
      setLeads([])
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }, [buildQueryParams])

  useEffect(() => {
    loadLeads()
  }, [loadLeads])

  async function fetchAllLeads() {
    const { limit, ...rest } = buildQueryParams()
    const pageSize = 200
    let skip = 0
    let all: Lead[] = []
    let totalCount = 0

    do {
      const res = await finderClient.leads.list({ ...rest, limit: pageSize, skip })
      totalCount = res.total
      all = all.concat(res.leads)
      skip += res.leads.length
      if (res.leads.length === 0) break
    } while (all.length < totalCount)

    return all
  }

  async function handleExport() {
    if (total === 0) {
      toast.warning("Nenhum lead para exportar com os filtros atuais.")
      return
    }
    setExporting(true)
    try {
      const all = await fetchAllLeads()
      exportLeadsExcel(all)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro na exportação")
    } finally {
      setExporting(false)
    }
  }

  function clearFilters() {
    setQ("")
    setStatus("")
    setSegmento("")
    setUf("")
    setScoreMin("")
    setSearchId("")
    router.push("/finder/leads")
  }

  return (
    <div className="space-y-5">
      <Card>
        <CardContent className="pt-4 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
            <Input
              className="md:col-span-2"
              placeholder="Buscar por nome ou endereço…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && loadLeads()}
            />
            <Select value={status || "all"} onValueChange={(v) => setStatus(v === "all" ? "" : v)}>
              <SelectTrigger>
                <SelectValue placeholder="Status (todos)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Status (todos)</SelectItem>
                {Object.entries(STATUS_LABEL).map(([k, v]) => (
                  <SelectItem key={k} value={k}>
                    {v}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={segmento || "all"}
              onValueChange={(v) => setSegmento(v === "all" ? "" : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Segmento (todos)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Segmento (todos)</SelectItem>
                {SEGMENTOS.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              maxLength={2}
              className="uppercase"
              placeholder="UF"
              value={uf}
              onChange={(e) => setUf(e.target.value)}
            />
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground whitespace-nowrap">ICP ≥</span>
              <Input
                type="number"
                min={0}
                max={100}
                step={5}
                placeholder="0"
                value={scoreMin}
                onChange={(e) => setScoreMin(e.target.value)}
              />
            </div>
          </div>

          {searchId ? (
            <div className="p-3 rounded-lg border border-brand/30 bg-brand/5 text-sm flex flex-wrap items-center justify-between gap-2">
              <span>Mostrando leads da última busca realizada.</span>
              <Button type="button" variant="outline" size="sm" onClick={() => router.push("/finder/leads")}>
                Ver todos os leads
              </Button>
            </div>
          ) : null}

          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>Ordenar por</span>
              <Select value={sort} onValueChange={setSort}>
                <SelectTrigger className="w-auto h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="icp_score">ICP score</SelectItem>
                  <SelectItem value="created_at">Mais recente</SelectItem>
                  <SelectItem value="updated_at">Atualizado recente</SelectItem>
                  <SelectItem value="avaliacao">Avaliação</SelectItem>
                  <SelectItem value="nome">Nome</SelectItem>
                </SelectContent>
              </Select>
              <Select value={dir} onValueChange={setDir}>
                <SelectTrigger className="w-auto h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="desc">↓ desc</SelectItem>
                  <SelectItem value="asc">↑ asc</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={total === 0 || exporting}
                onClick={handleExport}
              >
                {exporting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                Exportar Excel
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={clearFilters}>
                Limpar filtros
              </Button>
              <Button type="button" size="sm" className="bg-brand hover:bg-brand-hover" onClick={loadLeads}>
                Aplicar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <LoadingState />
      ) : error ? (
        <div className="bg-destructive/10 border border-destructive/30 text-destructive p-4 rounded-lg text-sm">
          {error}
        </div>
      ) : leads.length === 0 ? (
        <EmptyState
          titulo="Nenhum lead com esses filtros"
          descricao="Tente afrouxar os filtros, fazer uma nova busca ou abrir o Kanban para ver o pipeline."
          icone="🗂️"
        />
      ) : (
        <Card className="overflow-hidden">
          <div className="p-4 border-b flex flex-wrap items-center justify-between gap-3">
            <div className="text-xs text-muted-foreground">
              Mostrando <span className="font-semibold text-foreground">{leads.length}</span> de{" "}
              <span className="font-semibold text-foreground">{total}</span> leads
              {total > leads.length ? (
                <span> · exportação inclui todos os {total}</span>
              ) : null}
            </div>
            <Button type="button" variant="outline" size="sm" disabled={exporting} onClick={handleExport}>
              {exporting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              Exportar Excel
            </Button>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Negócio</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead className="text-center">Avaliação</TableHead>
                  <TableHead className="text-center">ICP</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Responsável</TableHead>
                  <TableHead>Criado</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {leads.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell>
                      <Link href={`/finder/leads/${l.id}`} className="font-semibold hover:text-brand">
                        {l.nome}
                      </Link>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {l.segmento ? (
                          <span className="capitalize">{l.segmento}</span>
                        ) : (
                          <span className="text-muted-foreground/70">sem segmento</span>
                        )}
                        {l.cidade ? ` · ${l.cidade}${l.uf ? `/${l.uf}` : ""}` : ""}
                      </div>
                    </TableCell>
                    <TableCell>
                      {l.telefone ? (
                        <a href={`tel:${l.telefone}`} className="text-brand">
                          {fmtPhone(l.telefone)}
                        </a>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {l.avaliacao ? `⭐ ${l.avaliacao}` : "—"}
                    </TableCell>
                    <TableCell className="text-center">
                      <IcpBadge score={l.icp_score} />
                    </TableCell>
                    <TableCell>
                      <LeadStatusBadge status={l.status} />
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {l.responsavel_nome || "—"}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {fmtDate(l.created_at)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Link href={`/finder/leads/${l.id}`} className="text-brand font-medium text-sm">
                        Abrir →
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}
    </div>
  )
}
