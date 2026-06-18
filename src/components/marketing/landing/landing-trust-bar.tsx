import { CreditCard, Globe, Sparkles } from "lucide-react"

import { LANDING_TRUST_SIGNALS } from "./constants"
import { LandingContainer } from "./primitives"

const TRUST_ICONS = [Sparkles, CreditCard, Globe] as const

export function LandingTrustBar() {
  return (
    <div className="border-b border-border/40 bg-card/30">
      <LandingContainer className="py-6 sm:py-8">
        <ul
          className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4"
          aria-label="Por que começar hoje"
        >
          {LANDING_TRUST_SIGNALS.map((item, i) => {
            const Icon = TRUST_ICONS[i]
            return (
              <li
                key={item.title}
                className="flex items-start gap-3 rounded-xl border border-border/50 bg-background/80 px-4 py-3.5 sm:px-5 sm:py-4 transition-colors hover:border-brand/25"
              >
                <div
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand"
                  aria-hidden
                >
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 pt-0.5">
                  <p className="text-sm font-semibold text-brand-ink leading-snug">
                    {item.title}
                  </p>
                  <p className="mt-0.5 text-xs sm:text-sm text-muted-foreground leading-relaxed">
                    {item.description}
                  </p>
                </div>
              </li>
            )
          })}
        </ul>
      </LandingContainer>
    </div>
  )
}
