import Link from "next/link"
import { MessageCircle } from "lucide-react"

import { LANDING_FOOTER_LINKS, LANDING_LINKS } from "./constants"
import { LEGAL_PATHS } from "@/lib/legal/paths"
import { InstagramIcon, LandingContainer } from "./primitives"

export function LandingFooter() {
  const year = new Date().getFullYear()

  return (
    <footer className="border-t border-border/50 bg-card/30">
      <LandingContainer className="py-8 sm:py-10">
        <div className="flex flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-xs">
            <Link
              href="/"
              className="text-lg font-display font-bold text-brand-ink hover:opacity-90 transition-opacity"
            >
              Azulli
            </Link>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
              Sua empresa no azul, sua mente em paz.
            </p>
          </div>

          <nav
            className="flex flex-col sm:flex-row gap-8 sm:gap-12"
            aria-label="Links e redes sociais"
          >
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Navegação
              </p>
              <ul className="space-y-1.5 text-sm">
                {LANDING_FOOTER_LINKS.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className="text-foreground/80 hover:text-brand transition-colors"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Contato
              </p>
              <ul className="space-y-1.5 text-sm">
                <li>
                  <a
                    href={LANDING_LINKS.whatsapp}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-foreground/80 hover:text-[#25D366] transition-colors"
                    aria-label="WhatsApp — mensagem pré-preenchida para trial"
                  >
                    <MessageCircle className="h-4 w-4 shrink-0" aria-hidden />
                    (71) 99162-4162
                  </a>
                </li>
                <li>
                  <a
                    href={LANDING_LINKS.instagram}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-foreground/80 hover:text-brand transition-colors"
                    aria-label="Instagram @useazulli"
                  >
                    <InstagramIcon className="h-4 w-4 shrink-0" />
                    @useazulli
                  </a>
                </li>
              </ul>
            </div>
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Legal
              </p>
              <ul className="space-y-1.5 text-sm">
                <li>
                  <Link
                    href={LEGAL_PATHS.terms}
                    className="text-foreground/80 hover:text-brand transition-colors"
                  >
                    Termos de uso
                  </Link>
                </li>
                <li>
                  <Link
                    href={LEGAL_PATHS.privacy}
                    className="text-foreground/80 hover:text-brand transition-colors"
                  >
                    Política de privacidade
                  </Link>
                </li>
              </ul>
            </div>
          </nav>
        </div>

        <div className="mt-8 pt-6 border-t border-border/50 text-xs text-muted-foreground">
          <p>© {year} Azulli — azulli.app.br</p>
        </div>
      </LandingContainer>
    </footer>
  )
}
