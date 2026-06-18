import { LANDING_FEATURES, type LandingFeature } from "./constants"
import { Badge } from "@/components/ui/badge"
import {
  LandingContainer,
  LandingSection,
  SectionHeader,
} from "./primitives"

export function LandingFeatures() {
  return (
    <LandingSection id="funcionalidades">
      <LandingContainer>
        <SectionHeader
          className="mb-10 sm:mb-14"
          title="Tudo que você precisa pra organizar o financeiro"
          description="O plano Pro cobre o dia a dia. O Empresarial adiciona IA, previsão e e-mails automáticos — todos liberados no trial de 7 dias."
        />

        <ul className="grid gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {LANDING_FEATURES.map((feature) => (
            <li key={feature.title}>
              <article
                className="group h-full rounded-xl sm:rounded-2xl border border-border/60 bg-card p-5 sm:p-6 transition-all duration-200 hover:border-brand/30 hover:shadow-md hover:shadow-brand/5 hover:-translate-y-0.5"
              >
                <div className="flex items-start justify-between gap-2 mb-3.5">
                  <div
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand transition-colors duration-200 group-hover:bg-brand group-hover:text-primary-foreground"
                    aria-hidden
                  >
                    <feature.icon className="h-5 w-5" />
                  </div>
                  <FeatureTierBadge tier={feature.tier} />
                </div>
                <h3 className="font-display font-semibold text-brand-ink text-base">
                  {feature.title}
                </h3>
                <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </article>
            </li>
          ))}
        </ul>
      </LandingContainer>
    </LandingSection>
  )
}

function FeatureTierBadge({ tier }: { tier: LandingFeature["tier"] }) {
  if (tier === "pro") {
    return (
      <Badge
        variant="secondary"
        className="shrink-0 text-[10px] font-semibold uppercase tracking-wide bg-muted text-muted-foreground border-0"
      >
        Pro
      </Badge>
    )
  }

  return (
    <Badge
      variant="secondary"
      className="shrink-0 text-[10px] font-semibold uppercase tracking-wide bg-brand-soft text-brand border-0"
    >
      Empresarial
    </Badge>
  )
}