import Link from "next/link"
import { Sparkles } from "lucide-react"

import { PLANS, TRIAL_FEATURE_HIGHLIGHTS, formatPlanPrice } from "@/lib/billing/plans"
import { cn } from "@/lib/utils"

import { LANDING_LINKS } from "./constants"
import {
  CheckIcon,
  LandingContainer,
  LandingPrimaryCta,
  LandingSection,
  SectionHeader,
} from "./primitives"

export function LandingPricing() {
  return (
    <LandingSection id="planos" muted>
      <LandingContainer>
        <SectionHeader
          className="mb-8 sm:mb-10"
          title="Planos simples, sem surpresa"
          description="Teste tudo por 7 dias. Depois, escolha Pro ou Empresarial — cancele quando quiser."
        />

        <div
          className="mb-8 sm:mb-10 max-w-3xl mx-auto rounded-2xl border border-brand/25 bg-brand-soft/30 p-5 sm:p-6"
        >
          <div className="flex items-start gap-3">
            <Sparkles className="h-5 w-5 text-brand shrink-0 mt-0.5" aria-hidden />
            <div>
              <p className="font-display font-semibold text-brand-ink">
                Trial de 7 dias — degustação do Empresarial
              </p>
              <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
                Sem cartão no cadastro. Inclui tudo abaixo do Empresarial para
                você testar antes de assinar.
              </p>
              <ul className="mt-3 space-y-1.5">
                {TRIAL_FEATURE_HIGHLIGHTS.map((item) => (
                  <li
                    key={item}
                    className="flex gap-2 text-sm text-muted-foreground"
                  >
                    <CheckIcon />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <ul className="grid gap-5 md:grid-cols-2 max-w-3xl mx-auto">          {(["pro", "enterprise"] as const).map((id) => {
            const plan = PLANS[id]
            const highlighted = plan.highlight

            return (
              <li key={id}>
                <article
                  className={cn(
                    "relative flex h-full flex-col rounded-2xl border bg-card p-5 sm:p-7 transition-all duration-200",
                    highlighted
                      ? "border-brand shadow-lg shadow-brand/10 ring-1 ring-brand/15 md:-translate-y-1"
                      : "border-border/70 hover:border-border hover:shadow-md"
                  )}
                >
                  {highlighted && (
                    <span
                      className="absolute -top-2.5 left-5 rounded-full bg-brand px-2.5 py-0.5 text-[11px] font-semibold text-primary-foreground shadow-sm"
                    >
                      Mais popular
                    </span>
                  )}

                  <header>
                    <h3 className="font-display text-lg sm:text-xl font-bold text-brand-ink">
                      {plan.name}
                    </h3>
                    <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">
                      {plan.description}
                    </p>
                    <p className="mt-4 font-display text-3xl sm:text-4xl font-bold tracking-tight text-brand-ink">
                      {formatPlanPrice(plan.price)}
                      <span className="text-sm font-normal text-muted-foreground">
                        /mês
                      </span>
                    </p>
                  </header>

                  <ul className="mt-5 space-y-2.5 flex-1">
                    {plan.features.map((feat) => (
                      <li
                        key={feat}
                        className="flex gap-2 text-sm text-muted-foreground"
                      >
                        <CheckIcon />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>

                  <div className="mt-6">
                    <LandingPrimaryCta
                      href={LANDING_LINKS.register}
                      className="w-full"
                      showArrow={highlighted}
                    >
                      Começar trial grátis
                    </LandingPrimaryCta>
                  </div>
                </article>
              </li>
            )
          })}
        </ul>

        <p className="text-center text-sm text-muted-foreground mt-8 max-w-xl mx-auto leading-relaxed">
          O plano Pro cobre lançamentos, OFX, contador e relatórios. O
          Empresarial adiciona IA, previsão de caixa e e-mails automáticos.{" "}
          <Link
            href={LANDING_LINKS.register}
            className="font-medium text-brand hover:text-brand-hover underline-offset-4 hover:underline transition-colors"
          >
            Comece o trial grátis
          </Link>
          .
        </p>      </LandingContainer>
    </LandingSection>
  )
}
