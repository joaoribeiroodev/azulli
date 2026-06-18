import Link from "next/link"

import { LEGAL_PATHS } from "@/lib/legal/paths"

export default function AuthLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <main className="min-h-screen flex flex-col bg-surface">
      <header className="px-6 py-5">
        <Link
          href="/"
          className="text-xl font-display font-bold text-brand-ink"
        >
          Azulli
        </Link>
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
        </p>
      </footer>
    </main>
  )
}