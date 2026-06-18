"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Download, Loader2, ShieldAlert, Trash2 } from "lucide-react"
import { toast } from "sonner"

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { deleteMyAccountAction } from "@/lib/lgpd/actions"
import { LEGAL_PATHS } from "@/lib/legal/paths"

const DELETE_CONFIRM_TEXT = "EXCLUIR"

type Props = {
  userEmail: string
  hasActiveSubscription: boolean
}

export function PrivacyDataCard({
  userEmail,
  hasActiveSubscription,
}: Props) {
  const router = useRouter()
  const [exporting, setExporting] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [confirmText, setConfirmText] = useState("")
  const [isPending, startTransition] = useTransition()

  async function handleExport() {
    setExporting(true)
    try {
      const res = await fetch("/api/export/my-data")
      if (!res.ok) {
        toast.error("Não foi possível exportar seus dados.")
        return
      }

      const blob = await res.blob()
      const disposition = res.headers.get("Content-Disposition") ?? ""
      const match = disposition.match(/filename="([^"]+)"/)
      const filename = match?.[1] ?? "azulli_meus_dados.json"

      const url = URL.createObjectURL(blob)
      const anchor = document.createElement("a")
      anchor.href = url
      anchor.download = filename
      anchor.click()
      URL.revokeObjectURL(url)

      toast.success("Exportação baixada com sucesso.")
    } catch {
      toast.error("Erro ao baixar os dados.")
    } finally {
      setExporting(false)
    }
  }

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteMyAccountAction()
      if (!result.success) {
        toast.error(result.error)
        return
      }
      toast.success("Conta excluída.")
      setDeleteOpen(false)
      router.push("/login")
      router.refresh()
    })
  }

  return (
    <>
      <Card className="border-border/80">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-brand" aria-hidden />
            Dados e privacidade
          </CardTitle>
          <CardDescription>
            Exercite seus direitos previstos na LGPD. Leia também nossa{" "}
            <Link
              href={LEGAL_PATHS.privacy}
              className="text-brand hover:underline underline-offset-4"
            >
              Política de privacidade
            </Link>
            .
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              type="button"
              variant="outline"
              className="gap-2"
              disabled={exporting}
              onClick={handleExport}
            >
              {exporting ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : (
                <Download className="h-4 w-4" aria-hidden />
              )}
              Baixar meus dados
            </Button>
            <Button
              type="button"
              variant="outline"
              className="gap-2 text-destructive hover:text-destructive border-destructive/30 hover:bg-destructive/5"
              onClick={() => {
                if (hasActiveSubscription) {
                  toast.error(
                    "Cancele sua assinatura em Faturamento antes de excluir a conta."
                  )
                  return
                }
                setConfirmText("")
                setDeleteOpen(true)
              }}
            >
              <Trash2 className="h-4 w-4" aria-hidden />
              Excluir minha conta
            </Button>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            A exportação inclui perfil, empresa e registros vinculados ao seu
            tenant em formato JSON. A exclusão é permanente: se você é o único
            administrador, todos os dados da empresa serão removidos.
          </p>
          {hasActiveSubscription && (
            <p className="text-xs text-warning leading-relaxed rounded-lg border border-warning/30 bg-warning-soft/30 p-3">
              Você tem assinatura ativa ou pendente.{" "}
              <Link
                href="/configuracoes?tab=faturamento"
                className="font-medium text-brand hover:underline underline-offset-4"
              >
                Cancele em Faturamento
              </Link>{" "}
              antes de excluir a conta para evitar cobranças futuras.
            </p>
          )}
        </CardContent>
      </Card>

      <AlertDialog
        open={deleteOpen}
        onOpenChange={(open) => {
          setDeleteOpen(open)
          if (!open) setConfirmText("")
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir sua conta?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 text-sm text-muted-foreground">
                <p>
                  Esta ação é irreversível. Você perderá acesso ao Azulli e,
                  se for o único administrador, todos os lançamentos, clientes e
                  demais dados da empresa serão apagados.
                </p>
                <p>
                  Se você tem assinatura ativa,{" "}
                  <Link
                    href="/configuracoes?tab=faturamento"
                    className="text-brand hover:underline underline-offset-4 font-medium"
                  >
                    cancele em Faturamento
                  </Link>{" "}
                  antes de excluir para evitar cobranças futuras.
                </p>
                <p>
                  Digite <strong className="text-foreground">{DELETE_CONFIRM_TEXT}</strong>{" "}
                  para confirmar ({userEmail}).
                </p>
                <Input
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder={DELETE_CONFIRM_TEXT}
                  autoComplete="off"
                  aria-label="Confirmação de exclusão"
                />
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancelar</AlertDialogCancel>
            <Button
              variant="destructive"
              disabled={
                hasActiveSubscription ||
                confirmText !== DELETE_CONFIRM_TEXT ||
                isPending
              }
              onClick={handleDelete}
            >
              {isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
              )}
              Excluir permanentemente
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
