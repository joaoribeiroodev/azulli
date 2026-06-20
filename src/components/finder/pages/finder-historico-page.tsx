"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"

import { useFinderPageMeta } from "@/components/finder/finder-context"
import { EmptyState } from "@/components/finder/ui/empty-state"
import { LoadingState } from "@/components/finder/ui/loading-state"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { fmtDate } from "@/lib/finder/format"
import { finderClient, ApiError } from "@/lib/finder/client"
import type { Search } from "@/lib/finder/types"

export function FinderHistoricoPage() {
  useFinderPageMeta({
    title: "Histórico de buscas",
    subtitle: "Tudo o que o time já prospectou",
  })

  const [mineOnly, setMineOnly] = useState(false)
  const [searches, setSearches] = useState<Search[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<{ message: string; status?: number; payload?: unknown } | null>(
    null
  )

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { searches: list } = await finderClient.searches.list({
        mine: mineOnly ? "1" : undefined,
        limit: 200,
      })
      setSearches(list)
    } catch (err) {
      if (err instanceof ApiError) {
        setError({ message: err.message, status: err.status, payload: err.payload })
      } else {
        setError({ message: err instanceof Error ? err.message : "Erro desconhecido" })
      }
    } finally {
      setLoading(false)
    }
  }, [mineOnly])

  useEffect(() => {
    load()
  }, [load])

  return (
    <div className="space-y-4">
      <Card className="p-4 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <Checkbox
            id="hist-mine"
            checked={mineOnly}
            onCheckedChange={(v) => setMineOnly(v === true)}
          />
          <Label htmlFor="hist-mine" className="text-sm font-normal cursor-pointer">
            Apenas minhas buscas
          </Label>
        </div>
        <Button type="button" size="sm" className="bg-brand hover:bg-brand-hover" onClick={load}>
          Aplicar
        </Button>
      </Card>

      {loading ? (
        <LoadingState />
      ) : error ? (
        <div className="bg-destructive/10 border border-destructive/30 text-destructive p-4 rounded-lg text-sm">
          <div className="font-semibold">
            Não foi possível carregar o histórico
            {error.status ? ` (HTTP ${error.status})` : ""}
          </div>
          <div className="mt-1">{error.message}</div>
          {error.payload ? (
            <pre className="mt-2 text-[11px] bg-destructive/5 p-2 rounded overflow-auto max-h-40">
              {JSON.stringify(error.payload, null, 2)}
            </pre>
          ) : null}
        </div>
      ) : searches.length === 0 ? (
        <EmptyState
          titulo="Sem buscas no histórico"
          descricao='Faça uma busca na aba "Buscar leads" para começar.'
          icone="🕓"
        />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Busca</TableHead>
                  <TableHead>Usuário</TableHead>
                  <TableHead className="text-center">Resultados</TableHead>
                  <TableHead>Duração</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {searches.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell>
                      <span className="font-medium">{s.termo}</span>
                      <span className="text-muted-foreground"> · {s.localizacao}</span>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {s.user_nome || "—"}
                    </TableCell>
                    <TableCell className="text-center font-semibold">
                      {s.total_results ?? "—"}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {s.duracao_ms != null ? `${Math.round(s.duracao_ms / 1000)}s` : "—"}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {fmtDate(s.created_at)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Link
                        href={`/finder/buscar?termo=${encodeURIComponent(s.termo)}&localizacao=${encodeURIComponent(s.localizacao)}`}
                        className="text-brand font-medium text-sm"
                      >
                        Repetir →
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
