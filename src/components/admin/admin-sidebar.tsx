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

const MOBILE_HEADER_HEIGHT =
  "calc(3.5rem + env(safe-area-inset-top, 0px))"

export function AdminMobileNav() {
  const pathname = usePathname()

  return (
    <>
      <header
        className="lg:hidden fixed inset-x-0 top-0 z-40 border-b bg-background pt-safe shadow-sm"
        style={{ height: MOBILE_HEADER_HEIGHT }}
      >
        <div className="px-3 sm:px-4 h-14 flex items-center justify-between gap-2 min-w-0">
          <Link
            href="/admin"
            className="font-display font-bold text-brand-ink truncate min-w-0 touch-manipulation"
          >
            Azulli Admin
          </Link>
          <nav className="flex items-center gap-0.5 shrink-0">
            {NAV_ITEMS.map((item) => {
              const active = isActive(pathname, item.href, item.exact)
              const Icon = item.icon
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "inline-flex items-center justify-center rounded-lg min-h-11 min-w-11 touch-manipulation transition-colors",
                    active
                      ? "bg-brand/10 text-brand"
                      : "text-muted-foreground hover:bg-muted active:bg-muted"
                  )}
                  aria-label={item.label}
                  aria-current={active ? "page" : undefined}
                >
                  <Icon className="h-5 w-5" />
                </Link>
              )
            })}
            <Link
              href="/login"
              className="inline-flex items-center justify-center rounded-lg min-h-11 min-w-11 text-muted-foreground hover:bg-muted active:bg-muted touch-manipulation transition-colors"
              aria-label="Sair"
            >
              <LogOut className="h-5 w-5" />
            </Link>
          </nav>
        </div>
      </header>
      {/* Reserva espaço do header fixo — evita sobreposição e cliques bloqueados */}
      <div
        className="lg:hidden shrink-0"
        style={{ height: MOBILE_HEADER_HEIGHT }}
        aria-hidden
      />
    </>
  )
}
