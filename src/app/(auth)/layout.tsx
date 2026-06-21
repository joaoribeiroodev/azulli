import Link from "next/link"
import { headers } from "next/headers"

import { isTrialHost } from "@/lib/app/domain-hosts"
import { getLoginUrl } from "@/lib/app/public-urls"
import { LEGAL_PATHS } from "@/lib/legal/paths"

export default async function AuthLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const host = (await headers()).get("host") ?? ""
  const trialHost = isTrialHost(host)
  const logoHref = trialHost ? "/register" : "/"

  return (
    <main className="min-h-screen flex flex-col bg-surface">
      <header className="px-6 py-5">
        <Link
          href={logoHref}
          className="text-xl font-display font-bold text-brand-ink"
        >
          Azulli
        </Link>
        {trialHost ? (
          <p className="mt-1 text-xs text-muted-foreground">
            Trial grátis de 7 dias — sem cartão de crédito
          </p>
        ) : null}
      </header>

      <div className="flex-1 flex items-center justify-center px-4 pb-12">
        <div className="w-full max-w-md">{children}</div>
      </div>

      <footer className="px-6 py-4 text-center text-xs text-muted-foreground space-y-1">
        <p>
          © {new Date().getFullYear()} Azulli — Sua empresa no azul, sua mente em paz.
        </p>
        <p className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
          <Link href={LEGAL_PATHS.terms} className="hover:text-brand transition-colors">
            Termos de uso
          </Link>
          <Link href={LEGAL_PATHS.privacy} className="hover:text-brand transition-colors">
            Política de privacidade
          </Link>
          {trialHost ? (
            <Link href={getLoginUrl()} className="hover:text-brand transition-colors">
              Já tenho conta
            </Link>
          ) : null}
        </p>
      </footer>
    </main>
  )
}
