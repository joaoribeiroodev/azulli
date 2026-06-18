import Link from "next/link"

import { LEGAL_PATHS } from "@/lib/legal/paths"

export function LegalLayoutShell({
  children,
}: {
  children: React.ReactNode
}) {
  const year = new Date().getFullYear()

  return (
    <div className="min-h-screen bg-surface text-foreground">
      <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
          <Link
            href="/"
            className="text-lg font-display font-bold text-brand-ink hover:opacity-90 transition-opacity"
          >
            Azulli
          </Link>
          <Link
            href="/login"
            className="text-sm font-medium text-muted-foreground hover:text-brand transition-colors"
          >
            Entrar
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 sm:px-6 py-10 sm:py-14">
        {children}
      </main>

      <footer className="border-t border-border/50 px-4 py-8 text-center text-xs text-muted-foreground space-y-2">
        <p className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
          <Link href={LEGAL_PATHS.terms} className="hover:text-brand transition-colors">
            Termos de uso
          </Link>
          <span className="text-border">·</span>
          <Link
            href={LEGAL_PATHS.privacy}
            className="hover:text-brand transition-colors"
          >
            Política de privacidade
          </Link>
        </p>
        <p>© {year} Azulli — azulli.app.br</p>
      </footer>
    </div>
  )
}
