import { redirect } from "next/navigation"
import { AlertCircle, Clock, ExternalLink } from "lucide-react"

import { getBillingStateFull } from "@/lib/billing/queries"
import { PLANS, type Plan, formatPlanPrice } from "@/lib/billing/plans"
import { formatDateBR } from "@/lib/utils/date"
import { PlanCard } from "./_components/plan-card"
import { CurrentSubscriptionCard } from "./_components/current-subscription-card"
import { PendingPaymentActions } from "./_components/pending-payment-actions"
import { CancelSubscriptionDialog } from "./_components/cancel-subscription-dialog"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"

export const metadata = { title: "Assinatura — Azulli" }

export default async function BillingPage() {
  const state = await getBillingStateFull()
  if (!state) redirect("/login")

  const plans = Object.values(PLANS) as Plan[]

  return (
    <main className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto space-y-6">
      <header>
        <h1 className="text-2xl lg:text-3xl font-display font-bold text-brand-ink">
          Assinatura
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Gerencie seu plano e forma de pagamento.
        </p>
      </header>

      {/* ── TRIAL ATIVO ── */}
      {state.effective_status === "trial_active" && (
        <div className="space-y-6">
          <div className="flex items-center gap-3 rounded-lg border border-brand/30 bg-brand-soft px-4 py-3">
            <Clock className="h-5 w-5 text-brand shrink-0" />
            <div>
              <p className="font-medium text-brand-ink">
                {state.trial_days_left === 1
                  ? "1 dia restante no trial"
                  : `${state.trial_days_left} dias restantes no trial`}
              </p>
              <p className="text-sm text-muted-foreground">
                Escolha um plano para continuar após o trial.
              </p>
            </div>
          </div>
          <PlansGrid plans={plans} />
        </div>
      )}

      {/* ── TRIAL EXPIRADO / SEM SUBSCRIPTION ── */}
      {(state.effective_status === "trial_expired" ||
        state.effective_status === "no_subscription") && (
        <div className="space-y-6">
          <div className="flex items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3">
            <AlertCircle className="h-5 w-5 text-destructive shrink-0" />
            <p className="font-medium text-destructive">
              Seu trial expirou. Escolha um plano para continuar usando o Azulli.
            </p>
          </div>
          <PlansGrid plans={plans} />
        </div>
      )}

      {/* ── PENDENTE (aguardando pagamento) ── */}
      {state.effective_status === "pending" && (
        <Card>
          <CardHeader>
            <CardTitle>Aguardando pagamento</CardTitle>
            {state.plan_id && (
              <CardDescription>
                Plano {PLANS[state.plan_id].name} ·{" "}
                {formatPlanPrice(PLANS[state.plan_id].price)}/mês
              </CardDescription>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Após o pagamento, sua assinatura será ativada automaticamente.
              Você receberá um e-mail do Asaas com a confirmação.
            </p>
            <PendingPaymentActions invoiceUrl={state.invoice_url} />
            <div className="pt-2 border-t flex justify-end">
              <CancelSubscriptionDialog
                currentPeriodEnd={null}
                neverPaid
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── ATIVA ── */}
      {state.effective_status === "active" && (
        <CurrentSubscriptionCard
          planId={state.plan_id}
          billingType={state.billing_type}
          currentPeriodEnd={state.current_period_end}
        />
      )}

      {/* ── EM ATRASO ── */}
      {state.effective_status === "past_due" && (
        <div className="space-y-4">
          <div className="flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3">
            <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-amber-800">
                Pagamento em atraso.
              </p>
              <p className="text-sm text-amber-700 mt-0.5">
                Regularize para não perder o acesso. Você tem 7 dias de
                carência após o vencimento.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {state.invoice_url && (
              <Button asChild className="bg-brand hover:bg-brand-hover gap-2">
                <a href={state.invoice_url} target="_blank" rel="noreferrer">
                  <ExternalLink className="h-4 w-4" />
                  Pagar agora
                </a>
              </Button>
            )}
            <CancelSubscriptionDialog
              currentPeriodEnd={state.current_period_end}
            />
          </div>
        </div>
      )}

      {/* ── CANCELADA ── */}
      {state.effective_status === "canceled" && (
        <div className="space-y-6">
          <div className="rounded-lg border bg-muted/40 px-4 py-3">
            <p className="font-medium text-muted-foreground">
              Assinatura cancelada
              {state.canceled_at
                ? ` em ${formatDateBR(state.canceled_at)}`
                : ""}
              .
            </p>
            {state.current_period_end && (
              <p className="text-sm text-muted-foreground mt-0.5">
                Você ainda tem acesso até{" "}
                <span className="font-medium text-foreground">
                  {formatDateBR(state.current_period_end)}
                </span>
                . Você pode reativar a qualquer momento.
              </p>
            )}
          </div>
          <p className="text-sm font-medium">Escolha um plano para reativar:</p>
          <PlansGrid plans={plans} />
        </div>
      )}
    </main>
  )
}

function PlansGrid({ plans }: { plans: Plan[] }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {plans.map((plan) => (
        <PlanCard key={plan.id} plan={plan} />
      ))}
    </div>
  )
}
