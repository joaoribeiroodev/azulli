import Link from "next/link"

export default function OnboardingLayout({
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
        <div className="w-full max-w-lg">{children}</div>
      </div>

      <footer className="px-6 py-4 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Azulli — Sua empresa no azul, sua mente em
        paz.
      </footer>
    </main>
  )
}
