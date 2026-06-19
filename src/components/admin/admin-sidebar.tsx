"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { BarChart3, LogOut, Megaphone } from "lucide-react"

import { cn } from "@/lib/utils"

const NAV_ITEMS = [
  { href: "/admin", label: "Painel", icon: BarChart3, exact: true },
  { href: "/admin/announcements", label: "Avisos", icon: Megaphone, exact: false },
] as const

function isActive(pathname: string, href: string, exact: boolean) {
  if (exact) return pathname === href
  return pathname === href || pathname.startsWith(`${href}/`)
}

export function AdminSidebar() {
  const pathname = usePathname()

  return (
    <aside className="hidden lg:flex w-64 shrink-0 border-r bg-card flex-col min-h-dvh">
      <div className="px-5 py-5 border-b">
        <Link href="/admin" className="font-display text-xl font-bold text-brand-ink">
          Azulli Admin
        </Link>
        <p className="text-xs text-muted-foreground mt-1">Operação do SaaS</p>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV_ITEMS.map((item) => {
          const active = isActive(pathname, item.href, item.exact)
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-brand/10 text-brand"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {item.label}
            </Link>
          )
        })}
      </nav>

      <div className="px-3 py-4 border-t">
        <Link
          href="/login"
          className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Sair
        </Link>
      </div>
    </aside>
  )
}

export function AdminMobileNav() {
  const pathname = usePathname()

  return (
    <header className="lg:hidden border-b bg-background/95 backdrop-blur sticky top-0 z-10">
      <div className="px-4 h-14 flex items-center justify-between gap-3">
        <Link href="/admin" className="font-display font-bold text-brand-ink truncate">
          Azulli Admin
        </Link>
        <nav className="flex items-center gap-1 shrink-0">
          {NAV_ITEMS.map((item) => {
            const active = isActive(pathname, item.href, item.exact)
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "inline-flex items-center justify-center rounded-lg p-2 transition-colors",
                  active
                    ? "bg-brand/10 text-brand"
                    : "text-muted-foreground hover:bg-muted"
                )}
                aria-label={item.label}
              >
                <Icon className="h-5 w-5" />
              </Link>
            )
          })}
        </nav>
      </div>
    </header>
  )
}
