import { Sparkles } from "lucide-react"

import { LANDING_LINKS } from "./constants"
import {
  LandingContainer,
  LandingPrimaryCta,
  LandingSecondaryCta,
} from "./primitives"

function HeroPreview() {
  return (
    <div
      className="relative mx-auto mt-10 sm:mt-12 lg:mt-14 max-w-4xl landing-hero-glow"
      aria-hidden
    >
      <div
        className="rounded-2xl border border-border/70 bg-card/95 backdrop-blur-sm shadow-2xl shadow-brand/10 overflow-hidden transition-transform duration-500 hover:scale-[1.01]"
      >
        <div className="flex items-center gap-2 px-3 sm:px-4 py-2.5 border-b border-border/60 bg-muted/30">
          <div className="flex gap-1.5">
            <span className="h-2 w-2 rounded-full bg-border" />
            <span className="h-2 w-2 rounded-full bg-border" />
            <span className="h-2 w-2 rounded-full bg-border" />
          </div>
          <span className="text-[10px] sm:text-[11px] text-muted-foreground ml-1.5">
            Dashboard · Azulli
          </span>
        </div>
        <div className="p-3 sm:p-5 grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
          {[
            { label: "Entradas", value: "R$ 12.4k", tone: "success" },
            { label: "Saídas", value: "R$ 8.2k", tone: "muted" },
            { label: "Saldo", value: "R$ 4.2k", tone: "brand" },
            { label: "Pendentes", value: "3", tone: "muted" },
          ].map((kpi) => (
            <div
              key={kpi.label}
              className="rounded-lg border border-border/60 bg-background/80 p-2.5 sm:p-3.5"
            >
              <p className="text-[10px] sm:text-xs text-muted-foreground">
                {kpi.label}
              </p>
              <p
                className={
                  kpi.tone === "success"
                    ? "text-base sm:text-xl font-display font-bold text-success-ink mt-0.5"
                    : kpi.tone === "brand"
                      ? "text-base sm:text-xl font-display font-bold text-brand mt-0.5"
                      : "text-base sm:text-xl font-display font-bold text-brand-ink mt-0.5"
                }
              >
                {kpi.value}
              </p>
            </div>
          ))}
        </div>
        <div className="px-3 sm:px-5 pb-3 sm:pb-5">
          <div className="h-20 sm:h-28 rounded-xl bg-gradient-to-br from-brand-soft/80 to-muted/40 border border-border/40 flex items-end gap-1 px-2 pb-2">
            {[40, 65, 45, 80, 55, 90, 70].map((h, i) => (
              <div
                key={i}
                className="flex-1 rounded-t-md bg-brand/70"
                style={{ height: `${h}%` }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export function LandingHero() {
  return (
    <section className="relative overflow-hidden pt-6 sm:pt-8 pb-2 sm:pb-4">
      <div className="landing-hero-bg pointer-events-none absolute inset-0" />

      <LandingContainer className="relative">
        <div className="mx-auto max-w-3xl text-center">
          <p
            className="inline-flex items-center gap-1.5 rounded-full border border-brand/25 bg-brand-soft/50 px-3 py-1 text-xs sm:text-sm font-medium text-brand mb-5 sm:mb-6"
          >
            <Sparkles className="h-3.5 w-3.5 shrink-0" aria-hidden />
            7 dias grátis · sem cartão
          </p>

          <h1
            className="text-[2rem] leading-tight sm:text-5xl lg:text-[3.125rem] lg:leading-[1.08] font-display font-bold text-brand-ink tracking-tight text-balance"
          >
            Sua empresa no azul, sua mente em paz.
          </h1>

          <p className="mt-4 sm:mt-5 text-base sm:text-lg text-muted-foreground leading-relaxed max-w-2xl mx-auto text-pretty">
            Gestão financeira para MEIs e pequenas empresas: lançamentos, extrato
            OFX, área do contador e dashboard completo. No trial de 7 dias, você
            também testa previsão de caixa, assistente IA e e-mails automáticos.
          </p>
          <div
            className="mt-7 sm:mt-8 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 max-w-md sm:max-w-none mx-auto"
          >
            <LandingPrimaryCta href={LANDING_LINKS.register} className="sm:min-w-[200px]">
              Começar trial grátis
            </LandingPrimaryCta>
            <LandingSecondaryCta href={LANDING_LINKS.login} className="sm:min-w-[160px]">
              Já tenho conta
            </LandingSecondaryCta>
          </div>
        </div>

        <HeroPreview />
      </LandingContainer>
    </section>
  )
}
