"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { ArrowRightLeft, Check, Loader2 } from "lucide-react"
import { toast } from "sonner"

import { PLANS, formatPlanPrice, type Plan } from "@/lib/billing/plans"
import { changePlanAction } from "@/lib/billing/actions"
import { formatDateBR } from "@/lib/utils/date"
import { CancelSubscriptionDialog } from "./cancel-subscription-dialog"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"

const BILLING_TYPE_LABELS: Record<string, string> = {
  BOLETO: "Boleto bancário",
  PIX: "PIX",
  CREDIT_CARD: "Cartão de crédito",
  UNDEFINED: "Não definido",
}

type Props = {
  planId: "pro" | "enterprise" | null
  billingType: string | null
  currentPeriodEnd: string | null
}

export function CurrentSubscriptionCard({
  planId,
  billingType,
  currentPeriodEnd,
}: Props) {
  const [showChangePlan, setShowChangePlan] = useState(false)
  const plan = planId ? PLANS[planId] : null
  const otherPlans = Object.values(PLANS).filter((p) => p.id !== planId)

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-2 flex-wrap">
            <div>
              <CardTitle className="flex items-center gap-2">
                Assinatura ativa
              </CardTitle>
              {plan && (
                <CardDescription className="mt-0.5">
                  Plano {plan.name} · {formatPlanPrice(plan.price)}/mês
                </CardDescription>
              )}
            </div>
            <Badge className="bg-success-soft text-success-ink">Ativa</Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            {currentPeriodEnd && (
              <div>
                <p className="text-muted-foreground">Próxima cobrança</p>
                <p className="font-medium">{formatDateBR(currentPeriodEnd)}</p>
              </div>
            )}
            {billingType && (
              <div>
                <p className="text-muted-foreground">Forma de pagamento</p>
                <p className="font-medium">
                  {BILLING_TYPE_LABELS[billingType] ?? billingType}
                </p>
              </div>
            )}
          </div>

          {plan && (
            <>
              <Separator />
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-y-1.5 gap-x-4">
                {plan.features.map((feature) => (
                  <li
                    key={feature}
                    className="flex items-center gap-2 text-sm text-muted-foreground"
                  >
                    <Check className="h-3.5 w-3.5 shrink-0 text-success" />
                    {feature}
                  </li>
                ))}
              </ul>
            </>
          )}

          <Separator />

          <div className="flex flex-wrap gap-2 justify-end">
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => setShowChangePlan((v) => !v)}
            >
              <ArrowRightLeft className="h-4 w-4" />
              {showChangePlan ? "Fechar" : "Trocar de plano"}
            </Button>
            <CancelSubscriptionDialog currentPeriodEnd={currentPeriodEnd} />
          </div>
        </CardContent>
      </Card>

      {showChangePlan && otherPlans.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm font-medium text-muted-foreground">
            Escolha o novo plano:
          </p>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {otherPlans.map((p) => (
              <ChangePlanCard key={p.id} plan={p} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function ChangePlanCard({ plan }: { plan: Plan }) {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function handleChange() {
    startTransition(async () => {
      const result = await changePlanAction({ newPlanId: plan.id })
      if (!result.success) {
        toast.error(result.error)
        return
      }
      toast.success("Plano alterado! Abrindo link de pagamento...")
      window.open(result.data.invoiceUrl, "_blank")
      router.refresh()
    })
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{plan.name}</CardTitle>
        <p className="text-sm text-muted-foreground">{plan.description}</p>
        <div className="pt-1">
          <span className="text-2xl font-display font-bold text-brand-ink">
            {formatPlanPrice(plan.price)}
          </span>
          <span className="text-sm text-muted-foreground">/mês</span>
        </div>
      </CardHeader>
      <CardContent>
        <Button
          className="w-full bg-brand hover:bg-brand-hover"
          onClick={handleChange}
          disabled={isPending}
        >
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Mudar para {plan.name}
        </Button>
      </CardContent>
    </Card>
  )
}
