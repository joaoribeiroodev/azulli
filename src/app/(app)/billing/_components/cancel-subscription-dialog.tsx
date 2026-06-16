"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { CheckCircle2, Loader2 } from "lucide-react"
import { toast } from "sonner"

import { cancelSubscriptionAction } from "@/lib/billing/actions"
import { formatDateBR } from "@/lib/utils/date"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"

type Props = {
  currentPeriodEnd: string | null
  /** true quando a assinatura ainda está em "pending" (nunca houve pagamento) */
  neverPaid?: boolean
}

const GUARANTEES_PAID = [
  "Seus dados continuam armazenados",
  "Acesso mantido até o fim do período pago",
  "Você pode reativar e voltar ao normal",
]

const GUARANTEES_PENDING = [
  "Seus dados continuam armazenados",
  "Nenhuma cobrança será gerada",
  "Você pode assinar novamente a qualquer momento",
]

export function CancelSubscriptionDialog({ currentPeriodEnd, neverPaid = false }: Props) {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()
  const endDate = currentPeriodEnd ? formatDateBR(currentPeriodEnd) : null
  const guarantees = neverPaid ? GUARANTEES_PENDING : GUARANTEES_PAID

  function handleCancel() {
    startTransition(async () => {
      const result = await cancelSubscriptionAction()
      if (!result.success) {
        toast.error(result.error)
        return
      }
      toast.success("Assinatura cancelada.")
      router.refresh()
    })
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="outline" className="text-destructive border-destructive/40 hover:text-destructive hover:border-destructive">
          Cancelar assinatura
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Cancelar assinatura?</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3 text-sm text-muted-foreground">
              <p>
                {neverPaid
                  ? "Sua assinatura pendente será cancelada. Como o pagamento ainda não foi realizado, nenhum valor será cobrado."
                  : endDate
                    ? <>
                        Sua assinatura será cancelada, mas você mantém acesso até{" "}
                        <strong className="text-foreground">{endDate}</strong>.
                        Depois disso, o acesso ao Azulli será bloqueado.
                      </>
                    : "Sua assinatura será cancelada ao fim do período pago. Depois disso, o acesso ao Azulli será bloqueado."
                }
              </p>
              <ul className="space-y-1.5">
                {guarantees.map((item) => (
                  <li key={item} className="flex items-center gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-success shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>
            {neverPaid ? "Voltar" : "Manter assinatura"}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleCancel}
            disabled={isPending}
            className="bg-destructive hover:bg-destructive/90"
          >
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Sim, cancelar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
