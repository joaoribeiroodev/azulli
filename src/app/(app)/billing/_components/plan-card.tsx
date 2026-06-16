"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Check, Loader2, Star } from "lucide-react"
import { toast } from "sonner"

import { type Plan, formatPlanPrice } from "@/lib/billing/plans"
import { startSubscriptionAction } from "@/lib/billing/actions"
import { cn } from "@/lib/utils"
import { BillingTypeSelector, type BillingType } from "./billing-type-selector"
import { CnpjRequiredDialog } from "./cnpj-required-dialog"
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"

type Props = {
  plan: Plan
}

export function PlanCard({ plan }: Props) {
  const [billingType, setBillingType] = useState<BillingType>("PIX")
  const [cnpjDialogOpen, setCnpjDialogOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function doSubscribe(type: BillingType) {
    startTransition(async () => {
      const result = await startSubscriptionAction({
        planId: plan.id,
        billingType: type,
      })

      if (!result.success) {
        if ("errorCode" in result && result.errorCode === "cnpj_required") {
          setCnpjDialogOpen(true)
          return
        }
        toast.error(result.error)
        return
      }

      toast.success("Assinatura criada! Abrindo link de pagamento...")
      window.open(result.data.invoiceUrl, "_blank")
      router.refresh()
    })
  }

  function handleSubscribe() {
    doSubscribe(billingType)
  }

  function handleCnpjSaved() {
    doSubscribe(billingType)
  }

  return (
    <>
      <Card className={cn("flex flex-col", plan.highlight && "border-brand shadow-md")}>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="text-xl">{plan.name}</CardTitle>
            {plan.highlight && (
              <Badge className="bg-brand text-white shrink-0 gap-1">
                <Star className="h-3 w-3" />
                Mais popular
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">{plan.description}</p>
          <div className="pt-1">
            <span className="text-3xl font-display font-bold text-brand-ink">
              {formatPlanPrice(plan.price)}
            </span>
            <span className="text-sm text-muted-foreground">/mês</span>
          </div>
        </CardHeader>

        <CardContent className="flex-1 space-y-4">
          <ul className="space-y-1.5">
            {plan.features.map((feature) => (
              <li key={feature} className="flex items-center gap-2 text-sm">
                <Check className="h-3.5 w-3.5 shrink-0 text-success" />
                {feature}
              </li>
            ))}
          </ul>

          <Separator />

          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Forma de pagamento
            </p>
            <BillingTypeSelector value={billingType} onChange={setBillingType} />
          </div>
        </CardContent>

        <CardFooter>
          <Button
            className="w-full bg-brand hover:bg-brand-hover"
            disabled={isPending}
            onClick={handleSubscribe}
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processando...
              </>
            ) : (
              `Assinar ${plan.name} — ${formatPlanPrice(plan.price)}`
            )}
          </Button>
        </CardFooter>
      </Card>

      <CnpjRequiredDialog
        open={cnpjDialogOpen}
        onOpenChange={setCnpjDialogOpen}
        onSuccess={handleCnpjSaved}
      />
    </>
  )
}
