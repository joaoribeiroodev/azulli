import Link from "next/link"
import { Clock, Sparkles } from "lucide-react"

import { getBillingStateLight } from "@/lib/billing/queries"
import { Button } from "@/components/ui/button"

export async function TrialEndingBanner() {
  const state = await getBillingStateLight()
  if (!state || state.effective_status !== "trial_active") return null

  const days = state.trial_days_left
  if (days === null || days > 3) return null

  const urgent = days <= 1

  return (
    <div
      className={`rounded-xl border p-4 flex flex-col sm:flex-row sm:items-center gap-3 ${
        urgent
          ? "border-warning/50 bg-warning-soft/40"
          : "border-brand/30 bg-brand-soft/40"
      }`}
    >
      <div className="flex items-start gap-3 flex-1 min-w-0">
        <div
          className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 ${
            urgent ? "bg-warning text-warning-foreground" : "bg-brand text-primary-foreground"
          }`}
        >
          {urgent ? (
            <Clock className="h-5 w-5" aria-hidden />
          ) : (
            <Sparkles className="h-5 w-5" aria-hidden />
          )}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-brand-ink">
            {days === 0
              ? "Seu trial acaba hoje"
              : days === 1
                ? "Último dia do trial grátis"
                : `Faltam ${days} dias do trial`}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Assine um plano para manter lançamentos, importação OFX e assistente
            IA sem interrupção.
          </p>
        </div>
      </div>
      <Button asChild size="sm" className="bg-brand hover:bg-brand-hover shrink-0">
        <Link href="/billing">Ver planos</Link>
      </Button>
    </div>
  )
}
