import { LANDING_LINKS } from "./constants"
import {
  InstagramIcon,
  LandingContainer,
  LandingPrimaryCta,
  LandingSection,
} from "./primitives"

export function LandingFinalCta() {
  return (
    <LandingSection id="contato" className="py-12 sm:py-16 lg:py-20">
      <LandingContainer>
        <div
          className="relative overflow-hidden rounded-2xl sm:rounded-3xl border border-brand/20 bg-gradient-to-br from-brand-soft/40 via-card to-card px-5 py-10 sm:px-10 sm:py-14 text-center landing-cta-glow"
        >
          <div className="relative z-10 mx-auto max-w-xl">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-display font-bold text-brand-ink tracking-tight text-balance">
              Pronto para colocar sua empresa no azul?
            </h2>
            <p className="mt-3 sm:mt-4 text-base text-muted-foreground leading-relaxed">
              Crie sua conta em menos de 2 minutos.
            </p>
            <div className="mt-6 sm:mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
              <LandingPrimaryCta href={LANDING_LINKS.register}>
                Começar agora
              </LandingPrimaryCta>
              <LandingPrimaryCta
                href={LANDING_LINKS.whatsapp}
                external
                showArrow={false}
                className="bg-[#25D366] hover:bg-[#20bd5a] shadow-[#25D366]/25 hover:shadow-[#25D366]/35"
              >
                Falar no WhatsApp
              </LandingPrimaryCta>
              <a
                href={LANDING_LINKS.instagram}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-11 sm:h-12 w-full sm:w-auto items-center justify-center gap-2 rounded-lg border border-border bg-card px-6 text-base font-medium text-foreground hover:bg-muted/60 transition-colors duration-200"
                aria-label="Instagram @useazulli"
              >
                <InstagramIcon className="h-4 w-4 shrink-0" />
                @useazulli
              </a>
            </div>
          </div>
        </div>
      </LandingContainer>
    </LandingSection>
  )
}
