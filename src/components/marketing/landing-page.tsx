import { LandingAbout } from "./landing/landing-about"
import { LandingFeatures } from "./landing/landing-features"
import { LandingFinalCta } from "./landing/landing-final-cta"
import { LandingFooter } from "./landing/landing-footer"
import { LandingHeader } from "./landing/landing-header"
import { LandingHero } from "./landing/landing-hero"
import { LandingPricing } from "./landing/landing-pricing"
import { LandingTrustBar } from "./landing/landing-trust-bar"
import { LandingWhatsAppFloat } from "./landing/landing-whatsapp-float"

export function LandingPage() {
  return (
    <div className="min-h-screen bg-surface text-foreground">
      <LandingHeader />
      <main>
        <LandingHero />
        <LandingTrustBar />
        <LandingAbout />
        <LandingFeatures />
        <LandingPricing />
        <LandingFinalCta />
      </main>
      <LandingFooter />
      <LandingWhatsAppFloat />
    </div>
  )
}
