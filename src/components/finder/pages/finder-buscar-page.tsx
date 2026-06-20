"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Download, ExternalLink, Loader2, Search } from "lucide-react"
import { toast } from "sonner"

import { useFinderContext, useFinderPageMeta } from "@/components/finder/finder-context"
import { EmptyState } from "@/components/finder/ui/empty-state"
import { IcpBadge } from "@/components/finder/ui/icp-badge"
import { LoadingState } from "@/components/finder/ui/loading-state"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { exportLeadsExcel } from "@/lib/finder/export-leads"
import { fmtPhone, mapsSearchLink, whatsappLink } from "@/lib/finder/format"
import { finderClient } from "@/lib/finder/client"
import type { Lead } from "@/lib/finder/types"

const SUGGESTIONS = [
  { termo: "Salão de Beleza", localizacao: "Vila Madalena SP" },
  { termo: "Oficina Mecânica", localizacao: "Pinheiros SP" },
  { termo: "Pet Shop", localizacao: "Tijuca RJ" },
  { termo: "Padaria", localizacao: "Savassi BH" },
  { termo: "Consultório Odontológico", localizacao: "Asa Sul DF" },
]

export function FinderBuscarPage() {
  useFinderPageMeta({
    title: "Buscar leads",
    subtitle:
      "MEIs e pequenas empresas no Simples Nacional — redes nacionais são filtradas automaticamente",
  })

  const searchParams = useSearchParams()
  const { config } = useFinderContext()
  const [termo, setTermo] = useState("")
  const [localizacao, setLocalizacao] = useState("")
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<Lead[] | null>(null)
  const [searchId, setSearchId] = useState<string | undefined>()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const t = searchParams.get("termo")
    const l = searchParams.get("localizacao")
    if (t) setTermo(t)
    if (l) setLocalizacao(l)
  }, [searchParams])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    const t = termo.trim()
    const loc = localizacao.trim()
    if (t.length < 2 || loc.length < 2) {
      toast.warning("Preencha segmento e localização (2+ caracteres).")
      return
    }

    setLoading(true)
    setError(null)
    setResults(null)

    try {
      const res = await finderClient.searches.create(t, loc)
      setResults(res.dados)
      setSearchId(res.searchId)
      const msg = res.excluidos_icp
        ? `${res.total} leads salvos (${res.excluidos_icp} redes nacionais filtradas).`
        : `${res.total} potenciais assinantes encontrados.`
      toast.success(msg)
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro na busca"
      setError(message)
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  const searchNotConfigured = config?.search && !config.search.configured

  return (
    <div className="space-y-6">
      {searchNotConfigured ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 text-amber-900 dark:bg-amber-950/30 dark:text-amber-200 dark:border-amber-800 p-4 text-sm">
          <strong>Busca indisponível em produção.</strong> Configure{" "}
          <code className="text-xs bg-amber-100 dark:bg-amber-900/50 px-1 rounded">
            GOOGLE_PLACES_API_KEY
          </code>{" "}
          na Vercel (Places API New no Google Cloud) para habilitar a prospecção.
        </div>
      ) : null}

      <Card>
        <CardContent className="pt-6">
          <form onSubmit={onSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="termo">Segmento (ICP)</Label>
              <Input
                id="termo"
                value={termo}
                onChange={(e) => setTermo(e.target.value)}
                placeholder="Ex.: Salão de Beleza, Oficina Mecânica, Pet Shop"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="localizacao">Localização</Label>
              <Input
                id="localizacao"
                value={localizacao}
                onChange={(e) => setLocalizacao(e.target.value)}
                placeholder="Ex.: Vila Madalena SP, Tijuca RJ"
                required
              />
            </div>
            <div className="flex items-end">
              <Button type="submit" className="w-full bg-brand hover:bg-brand-hover" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Buscando…
                  </>
                ) : (
                  <>
                    <Search className="h-4 w-4" />
                    Buscar
                  </>
                )}
              </Button>
            </div>
          </form>

          <div className="mt-4 flex flex-wrap gap-2 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">Sugestões:</span>
            {SUGGESTIONS.map((s) => (
              <button
                key={`${s.termo}-${s.localizacao}`}
                type="button"
                className="px-2.5 py-1 rounded-md bg-muted hover:bg-brand/10 hover:text-brand transition"
                onClick={() => {
                  setTermo(s.termo)
                  setLocalizacao(s.localizacao)
                }}
              >
                {s.termo} · {s.localizacao}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <LoadingState label="Coletando dados no Google Maps — pode levar 10–20 segundos." />
      ) : error ? (
        <div className="bg-destructive/10 border border-destructive/30 text-destructive p-4 rounded-lg text-sm">
          Erro: {error}
        </div>
      ) : results ? (
        results.length === 0 ? (
          <EmptyState
            titulo="Nenhum resultado"
            descricao='Tente um termo mais comum (ex.: "Pizzaria") ou uma localização mais ampla (ex.: "São Paulo SP").'
            icone="🙊"
          />
        ) : (
          <Card className="overflow-hidden">
            <div className="p-5 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold">
                  {results.length} potenciais assinantes encontrados
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Foco MEI / Simples Nacional. Segmento, porte e ICP calculados em segundo plano.
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => exportLeadsExcel(results)}
                >
                  <Download className="h-4 w-4" />
                  Exportar Excel
                </Button>
                <Button asChild size="sm" className="bg-brand hover:bg-brand-hover">
                  <Link href={`/finder/leads${searchId ? `?searchId=${encodeURIComponent(searchId)}` : ""}`}>
                    Ver na lista completa
                  </Link>
                </Button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Negócio</TableHead>
                    <TableHead>Telefone</TableHead>
                    <TableHead>Endereço</TableHead>
                    <TableHead className="text-center">Avaliação</TableHead>
                    <TableHead className="text-center">ICP</TableHead>
                    <TableHead className="text-center">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {results.map((l) => {
                    const wa = whatsappLink(l.telefone)
                    const maps = l.maps_url || mapsSearchLink(l)
                    return (
                      <TableRow key={l.id}>
                        <TableCell>
                          <Link
                            href={`/finder/leads/${l.id}`}
                            className="font-semibold hover:text-brand"
                          >
                            {l.nome}
                          </Link>
                          {l.segmento ? (
                            <div className="text-xs text-muted-foreground mt-0.5">{l.segmento}</div>
                          ) : null}
                        </TableCell>
                        <TableCell>
                          {l.telefone ? (
                            <a href={`tel:${l.telefone}`} className="text-brand font-medium">
                              {fmtPhone(l.telefone)}
                            </a>
                          ) : (
                            "—"
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground">{l.endereco || "—"}</TableCell>
                        <TableCell className="text-center">
                          {l.avaliacao ? `⭐ ${l.avaliacao}` : "—"}
                        </TableCell>
                        <TableCell className="text-center">
                          <IcpBadge score={l.icp_score} />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-center gap-2">
                            {maps ? (
                              <a
                                href={maps}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-muted-foreground hover:text-brand"
                                title="Abrir no Maps"
                              >
                                <ExternalLink className="h-4 w-4" />
                              </a>
                            ) : null}
                            {wa ? (
                              <a
                                href={wa}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-emerald-600 hover:text-emerald-800"
                                title="Abrir no WhatsApp"
                              >
                                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448L.057 24z" />
                                </svg>
                              </a>
                            ) : null}
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          </Card>
        )
      ) : !searchParams.get("termo") ? (
        <EmptyState
          titulo="Pronto para prospectar"
          descricao="Escolha um segmento com bom fit de ICP (MEI / Simples Nacional) e uma região. Lojas de rede nacional (ex.: grandes materiais de construção) são excluídas da base."
          icone="🎯"
        />
      ) : null}
    </div>
  )
}
