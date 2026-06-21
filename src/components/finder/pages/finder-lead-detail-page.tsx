"use client"

import { useCallback, useEffect, useState, type ReactNode } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"

import { useFinderContext, useFinderPageMeta } from "@/components/finder/finder-context"
import { useFinderPermissions } from "@/components/finder/use-finder-permissions"
import { FinderReadOnlyNotice } from "@/components/finder/ui/read-only-notice"
import { hasPosOptinMessage, PitchPanel } from "@/components/finder/pitch-panel"
import { IcpBadge } from "@/components/finder/ui/icp-badge"
import { LeadStatusBadge } from "@/components/finder/ui/lead-status-badge"
import { LoadingState } from "@/components/finder/ui/loading-state"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { STATUS_LABEL } from "@/lib/finder/constants"
import { getFinderRoleLabel } from "@/lib/finder/roles"
import { getPitchCopyText } from "@/lib/finder/pitch"
import { fmtDate, fmtPhone, mapsSearchLink, whatsappLink } from "@/lib/finder/format"
import { finderClient } from "@/lib/finder/client"
import type { Lead, LeadHistoryItem, LeadStatus, PitchCanal, User } from "@/lib/finder/types"

type Props = {
  leadId: string
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
        {label}
      </div>
      <div className="text-sm mt-0.5">{children}</div>
    </div>
  )
}

export function FinderLeadDetailPage({ leadId }: Props) {
  useFinderPageMeta({
    title: "Detalhe do lead",
    subtitle: "Materiais comerciais e ações do pipeline",
  })

  const router = useRouter()
  const { plans } = useFinderContext()
  const { canWriteLeads, canDeleteLeads, canConvertLeads, isReadOnly } =
    useFinderPermissions()

  const [lead, setLead] = useState<Lead | null>(null)
  const [history, setHistory] = useState<LeadHistoryItem[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [notas, setNotas] = useState("")
  const [savingNotas, setSavingNotas] = useState(false)

  const [pitchCanal, setPitchCanal] = useState<PitchCanal>("whatsapp")
  const [pitchData, setPitchData] = useState<{ whatsapp: string; email: string }>({
    whatsapp: "",
    email: "",
  })
  const [regerating, setRegerating] = useState(false)
  const [enriching, setEnriching] = useState(false)

  const [statusOpen, setStatusOpen] = useState(false)
  const [assignOpen, setAssignOpen] = useState(false)
  const [convertOpen, setConvertOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  const [newStatus, setNewStatus] = useState<LeadStatus>("novo")
  const [motivo, setMotivo] = useState("")
  const [responsavelId, setResponsavelId] = useState("")
  const [plano, setPlano] = useState(plans[0]?.id ?? "pro")
  const [converting, setConverting] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [data, usersRes] = await Promise.all([
        finderClient.leads.get(leadId),
        finderClient.users.list().catch(() => ({ users: [] as User[] })),
      ])
      setLead(data.lead)
      setHistory(data.history || [])
      setUsers(usersRes.users)
      setNotas(data.lead.notas || "")
      setNewStatus(data.lead.status)
      setResponsavelId(data.lead.responsavel_id || "")
      setPitchData({
        whatsapp: data.lead.pitch_whatsapp || "",
        email: data.lead.pitch_email || "",
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar")
    } finally {
      setLoading(false)
    }
  }, [leadId])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    if (plans[0]?.id) setPlano(plans[0].id)
  }, [plans])

  async function saveNotas() {
    if (!lead) return
    setSavingNotas(true)
    try {
      await finderClient.leads.update(lead.id, { notas })
      toast.success("Notas salvas.")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar")
    } finally {
      setSavingNotas(false)
    }
  }

  async function pegarLead() {
    if (!lead) return
    try {
      await finderClient.leads.pegar(lead.id)
      toast.success("Você agora é responsável por este lead.")
      load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro")
    }
  }

  async function regerarPitch() {
    if (!lead) return
    setRegerating(true)
    try {
      const { pitch } = await finderClient.leads.regerarPitch(lead.id, pitchCanal)
      setPitchData((prev) => ({ ...prev, [pitchCanal]: pitch }))
      toast.success("Material atualizado.")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao regerar")
    } finally {
      setRegerating(false)
    }
  }

  function copyPitch(variant: "default" | "pos_optin" = "default") {
    const stored = pitchCanal === "email" ? pitchData.email : pitchData.whatsapp
    const txt = getPitchCopyText(stored, pitchCanal, variant)
    if (!txt) return
    navigator.clipboard.writeText(txt).then(() => {
      toast.success(
        variant === "pos_optin"
          ? "Mensagem pós opt-in copiada."
          : "Copiado para a área de transferência."
      )
    })
  }

  async function enriquecer() {
    if (!lead) return
    setEnriching(true)
    try {
      await finderClient.leads.enriquecer(lead.id)
      toast.success("Lead enriquecido.")
      load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao enriquecer")
    } finally {
      setEnriching(false)
    }
  }

  async function saveStatus() {
    if (!lead) return
    try {
      await finderClient.leads.status(lead.id, newStatus, motivo)
      toast.success("Status atualizado.")
      setStatusOpen(false)
      load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao atualizar status")
    }
  }

  async function saveAssign() {
    if (!lead) return
    try {
      await finderClient.leads.atribuir(lead.id, responsavelId || null)
      toast.success("Lead atribuído.")
      setAssignOpen(false)
      load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao atribuir")
    }
  }

  async function convertLead() {
    if (!lead) return
    setConverting(true)
    try {
      const { conversao } = await finderClient.leads.converter(lead.id, plano)
      if (conversao.status === "linked") {
        toast.success(conversao.message || "Lead vinculado ao tenant Azulli.")
      } else {
        toast.info(conversao.message || "Cadastro pendente — envie o link de registro.")
        if (conversao.registerUrl) {
          window.open(conversao.registerUrl, "_blank", "noopener")
        }
      }
      setConvertOpen(false)
      load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro na conversão")
    } finally {
      setConverting(false)
    }
  }

  async function deleteLead() {
    if (!lead) return
    try {
      await finderClient.leads.destroy(lead.id)
      toast.success("Lead removido.")
      router.push("/finder/leads")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao excluir")
    }
  }

  if (loading) return <LoadingState />
  if (error || !lead) {
    return (
      <div className="bg-destructive/10 border border-destructive/30 text-destructive p-4 rounded-lg text-sm">
        {error || "Lead não encontrado"}
      </div>
    )
  }

  const wa = whatsappLink(lead.telefone)
  const showPosOptin = pitchCanal === "whatsapp" && hasPosOptinMessage(pitchData.whatsapp)

  return (
    <div className="space-y-6">
      {isReadOnly ? <FinderReadOnlyNotice /> : null}
      <Link href="/finder/leads" className="text-xs text-muted-foreground hover:text-brand">
        ← Voltar para a lista
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <LeadStatusBadge status={lead.status} />
                    <IcpBadge score={lead.icp_score} />
                    {lead.segmento ? (
                      <Badge variant="secondary" className="capitalize text-xs">
                        {lead.segmento}
                      </Badge>
                    ) : null}
                  </div>
                  <h2 className="text-xl font-bold">{lead.nome}</h2>
                  <div className="text-sm text-muted-foreground mt-1">{lead.endereco || "—"}</div>
                </div>
                <div className="flex flex-col gap-2 items-end shrink-0">
                  {canWriteLeads ? (
                    <>
                      <Button
                        type="button"
                        size="sm"
                        className="bg-brand hover:bg-brand-hover"
                        onClick={() => setStatusOpen(true)}
                      >
                        Mudar status
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => setAssignOpen(true)}
                      >
                        Atribuir
                      </Button>
                    </>
                  ) : null}
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                <Field label="Telefone">
                  {lead.telefone ? (
                    <a href={`tel:${lead.telefone}`} className="text-brand font-medium">
                      {fmtPhone(lead.telefone)}
                    </a>
                  ) : (
                    "—"
                  )}
                </Field>
                <Field label="WhatsApp">
                  {wa ? (
                    <a href={wa} target="_blank" rel="noopener noreferrer" className="text-emerald-700 font-medium">
                      Abrir conversa
                    </a>
                  ) : (
                    "—"
                  )}
                </Field>
                <Field label="Email">{lead.email || "—"}</Field>
                <Field label="Cidade/UF">
                  {lead.cidade || "—"}
                  {lead.uf ? ` / ${lead.uf}` : ""}
                </Field>
                <Field label="Avaliação Google">
                  {lead.avaliacao ? `⭐ ${lead.avaliacao} (${lead.total_avaliacoes ?? "—"})` : "—"}
                </Field>
                <Field label="Maps">
                  {lead.maps_url ? (
                    <a href={lead.maps_url} target="_blank" rel="noopener noreferrer" className="text-brand">
                      Abrir
                    </a>
                  ) : (
                    <a
                      href={mapsSearchLink(lead)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-brand"
                    >
                      Buscar
                    </a>
                  )}
                </Field>
                <Field label="Responsável">
                  {lead.responsavel_nome || (
                    <span className="text-muted-foreground">não atribuído</span>
                  )}
                </Field>
                <Field label="Criado em">{fmtDate(lead.created_at)}</Field>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
                <div>
                  <h3 className="text-sm font-bold">Materiais comerciais (IA)</h3>
                  <p className="text-xs text-muted-foreground">
                    Personalizados com dados captados (Maps). WhatsApp em conformidade com Meta: 1º
                    contato pede permissão, pitch só após opt-in.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => copyPitch("default")}>
                    Copiar 1º contato
                  </Button>
                  {showPosOptin ? (
                    <Button type="button" variant="outline" size="sm" onClick={() => copyPitch("pos_optin")}>
                      Copiar pós opt-in
                    </Button>
                  ) : null}
                  {canWriteLeads ? (
                    <Button
                      type="button"
                      size="sm"
                      className="bg-brand hover:bg-brand-hover"
                      disabled={regerating}
                      onClick={regerarPitch}
                    >
                      {regerating ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                      Regerar
                    </Button>
                  ) : null}
                </div>
              </div>

              <Tabs value={pitchCanal} onValueChange={(v) => setPitchCanal(v as PitchCanal)} className="mb-4">
                <TabsList>
                  <TabsTrigger value="whatsapp">WhatsApp</TabsTrigger>
                  <TabsTrigger value="email">E-mail</TabsTrigger>
                </TabsList>
              </Tabs>

              <PitchPanel canal={pitchCanal} stored={pitchData[pitchCanal]} />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <h3 className="text-sm font-bold mb-3">Notas comerciais</h3>
              <Textarea
                placeholder="Anotações da abordagem, próximos passos, objeções…"
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
                rows={4}
                disabled={!canWriteLeads}
              />
              {canWriteLeads ? (
                <div className="mt-3 flex justify-end">
                  <Button
                    type="button"
                    className="bg-brand hover:bg-brand-hover"
                    disabled={savingNotas}
                    onClick={saveNotas}
                  >
                    {savingNotas ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    Salvar notas
                  </Button>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardContent className="pt-5">
              <h3 className="text-sm font-bold mb-3">Ações rápidas</h3>
              <div className="space-y-2">
                {canConvertLeads ? (
                  <Button
                    type="button"
                    className="w-full bg-brand hover:bg-brand-hover"
                    onClick={() => setConvertOpen(true)}
                  >
                    ✅ Converter em assinante
                  </Button>
                ) : null}
                {canWriteLeads ? (
                  <>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full"
                      disabled={enriching}
                      onClick={enriquecer}
                    >
                      {enriching ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                      ⚙️ Re-enriquecer com IA
                    </Button>
                    <Button type="button" variant="outline" className="w-full" onClick={pegarLead}>
                      📍 Pegar para mim
                    </Button>
                  </>
                ) : null}
                {canDeleteLeads ? (
                  <Button
                    type="button"
                    variant="destructive"
                    className="w-full"
                    onClick={() => setDeleteOpen(true)}
                  >
                    Excluir lead
                  </Button>
                ) : null}
              </div>
              {lead.azulli_account_id ? (
                <div className="mt-4 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-200">
                  <div className="font-semibold">Vinculado ao Azulli</div>
                  <div className="mt-1 font-mono break-all">{lead.azulli_account_id}</div>
                  {lead.plano_contratado ? (
                    <div className="mt-1">Plano: {lead.plano_contratado}</div>
                  ) : null}
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-5">
              <h3 className="text-sm font-bold mb-3">Histórico de status</h3>
              {history.length === 0 ? (
                <div className="text-xs text-muted-foreground">Sem mudanças registradas.</div>
              ) : (
                <ol className="space-y-3">
                  {history.map((h, i) => (
                    <li key={i} className="text-xs">
                      <div className="flex items-center gap-2 flex-wrap">
                        <LeadStatusBadge status={h.status_anterior || "novo"} />
                        <span className="text-muted-foreground">→</span>
                        <LeadStatusBadge status={h.status_novo} />
                      </div>
                      <div className="text-muted-foreground mt-1">
                        {h.user_nome || "Sistema"} · {fmtDate(h.created_at)}
                      </div>
                      {h.motivo ? (
                        <div className="text-foreground mt-1 italic">&quot;{h.motivo}&quot;</div>
                      ) : null}
                    </li>
                  ))}
                </ol>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={statusOpen} onOpenChange={setStatusOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mudar status</DialogTitle>
            <p className="text-xs text-muted-foreground">{lead.nome}</p>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Novo status</Label>
              <Select value={newStatus} onValueChange={(v) => setNewStatus(v as LeadStatus)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(STATUS_LABEL).map(([k, v]) => (
                    <SelectItem key={k} value={k}>
                      {v}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Motivo (opcional)</Label>
              <Textarea
                placeholder="Ex.: cliente respondeu interessado, agendou call…"
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setStatusOpen(false)}>
              Cancelar
            </Button>
            <Button type="button" className="bg-brand hover:bg-brand-hover" onClick={saveStatus}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Atribuir lead</DialogTitle>
            <p className="text-xs text-muted-foreground">{lead.nome}</p>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Responsável</Label>
            <Select
              value={responsavelId || "none"}
              onValueChange={(v) => setResponsavelId(v === "none" ? "" : v)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">— não atribuído —</SelectItem>
                {users.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.nome} ({getFinderRoleLabel(u.role)})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setAssignOpen(false)}>
              Cancelar
            </Button>
            <Button type="button" className="bg-brand hover:bg-brand-hover" onClick={saveAssign}>
              Atribuir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={convertOpen} onOpenChange={setConvertOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Converter em assinante</DialogTitle>
            <p className="text-xs text-muted-foreground">{lead.nome}</p>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Busca uma conta existente no Azulli pelo e-mail, CNPJ ou owner. Se não encontrar,
              retorna link de cadastro.
            </p>
            <div className="space-y-2">
              <Label>Plano contratado</Label>
              <Select value={plano} onValueChange={setPlano}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {plans.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} — R$ {Number(p.price).toFixed(2).replace(".", ",")}/mês
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setConvertOpen(false)}>
              Cancelar
            </Button>
            <Button
              type="button"
              className="bg-brand hover:bg-brand-hover"
              disabled={converting}
              onClick={convertLead}
            >
              {converting ? "Consultando Azulli…" : "Converter"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir este lead?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação é definitiva e remove também o histórico de status.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={deleteLead}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
