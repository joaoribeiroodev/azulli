"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { ExternalLink, Loader2, RefreshCw } from "lucide-react"
import { toast } from "sonner"

import { refreshSubscriptionStatusAction } from "@/lib/billing/actions"
import { Button } from "@/components/ui/button"

type Props = {
  invoiceUrl: string | null
}

export function PendingPaymentActions({ invoiceUrl }: Props) {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function handleRefresh() {
    startTransition(async () => {
      const result = await refreshSubscriptionStatusAction()
      if (!result.success) {
        toast.error(result.error)
        return
      }
      if (result.data.invoiceUrl) {
        toast.info("Abrindo link de pagamento...")
        window.open(result.data.invoiceUrl, "_blank")
      } else {
        toast.success("Status atualizado!")
      }
      router.refresh()
    })
  }

  return (
    <div className="flex flex-wrap gap-3">
      {invoiceUrl && (
        <Button asChild className="bg-brand hover:bg-brand-hover gap-2">
          <a href={invoiceUrl} target="_blank" rel="noreferrer">
            <ExternalLink className="h-4 w-4" />
            Pagar agora
          </a>
        </Button>
      )}
      <Button
        variant="outline"
        className="gap-2"
        onClick={handleRefresh}
        disabled={isPending}
      >
        {isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <RefreshCw className="h-4 w-4" />
        )}
        Atualizar status
      </Button>
    </div>
  )
}
