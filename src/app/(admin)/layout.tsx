import type { ReactNode } from "react"
import Link from "next/link"
import { BarChart3, Megaphone } from "lucide-react"

import { cn } from "@/lib/utils"

function AdminNavLink({
  href,
  children,
  active,
}: {
  href: string
  children: ReactNode
  active?: boolean
}) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
        active
          ? "bg-brand/10 text-brand"
          : "text-muted-foreground hover:bg-muted hover:text-foreground"
      )}
    >
      {children}
    </Link>
  )
}

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-surface">
      <header className="border-b bg-background/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between gap-4">
          <Link href="/admin" className="font-display font-bold text-brand-ink">
            Azulli Admin
          </Link>
          <nav className="flex items-center gap-1">
            <AdminNavLink href="/admin">
              <BarChart3 className="h-4 w-4" />
              Painel
            </AdminNavLink>
            <AdminNavLink href="/admin/announcements">
              <Megaphone className="h-4 w-4" />
              Avisos
            </AdminNavLink>
          </nav>
        </div>
      </header>
      <main className="min-h-[calc(100dvh-3.5rem)]">{children}</main>
    </div>
  )
}
