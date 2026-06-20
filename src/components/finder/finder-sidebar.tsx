"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
  Clock,
  Columns2,
  LayoutDashboard,
  LogOut,
  Search,
  Users,
  UsersRound,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"

import { ThemeToggle } from "@/components/theme-toggle"
import { cn } from "@/lib/utils"

type NavItem = {
  href: string
  label: string
  icon: LucideIcon
  exact?: boolean
}

const NAV_ITEMS: NavItem[] = [
  { href: "/finder/dashboard", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/finder/buscar", label: "Buscar leads", icon: Search },
  { href: "/finder/leads", label: "Leads", icon: Users },
  { href: "/finder/kanban", label: "Pipeline", icon: Columns2 },
  { href: "/finder/historico", label: "Histórico", icon: Clock },
  { href: "/finder/equipe", label: "Equipe", icon: UsersRound },
]

function isActive(pathname: string, href: string, exact?: boolean) {
  if (exact) return pathname === href
  return pathname === href || pathname.startsWith(`${href}/`)
}

function navLinkClass(active: boolean) {
  return cn(
    "flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
    active
      ? "bg-brand/10 text-brand"
      : "text-muted-foreground hover:bg-muted hover:text-foreground"
  )
}

function NavLink({ item, pathname }: { item: NavItem; pathname: string }) {
  const active = isActive(pathname, item.href, item.exact)
  const Icon = item.icon

  return (
    <Link href={item.href} className={navLinkClass(active)}>
      <Icon className="h-4 w-4 shrink-0" />
      {item.label}
    </Link>
  )
}

function LogoutButton() {
  const router = useRouter()

  return (
    <button
      type="button"
      onClick={() => {
        localStorage.removeItem("azulli_finder_token")
        localStorage.removeItem("azulli_finder_user")
        router.push("/finder/login")
      }}
      className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
    >
      <LogOut className="h-4 w-4" />
      Sair
    </button>
  )
}

const MOBILE_HEADER_HEIGHT =
  "calc(3.5rem + env(safe-area-inset-top, 0px))"

export function FinderSidebar() {
  const pathname = usePathname()

  return (
    <aside className="hidden lg:flex w-64 shrink-0 border-r bg-card flex-col min-h-dvh">
      <div className="px-5 py-5 border-b">
        <Link
          href="/finder/dashboard"
          className="font-display text-xl font-bold text-brand-ink"
        >
          Azulli Finder
        </Link>
        <p className="text-xs text-muted-foreground mt-1">Prospecção comercial</p>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV_ITEMS.map((item) => (
          <NavLink key={item.href} item={item} pathname={pathname} />
        ))}
      </nav>

      <div className="px-3 py-4 border-t space-y-1">
        <div className="px-1 py-2 flex items-center gap-2">
          <div
            id="user-avatar"
            className="w-8 h-8 rounded-full bg-brand/10 text-brand font-semibold text-sm flex items-center justify-center shrink-0"
          >
            A
          </div>
          <div className="min-w-0">
            <div id="user-nome" className="text-sm font-medium truncate">
              —
            </div>
            <div id="user-role" className="text-xs text-muted-foreground truncate">
              —
            </div>
          </div>
        </div>
        <div className="px-3 py-2 flex items-center justify-between gap-2">
          <ThemeToggle />
        </div>
        <LogoutButton />
      </div>
    </aside>
  )
}

export function FinderMobileNav() {
  const pathname = usePathname()

  return (
    <>
      <header
        className="lg:hidden fixed inset-x-0 top-0 z-40 border-b bg-background pt-safe shadow-sm"
        style={{ height: MOBILE_HEADER_HEIGHT }}
      >
        <div className="px-3 sm:px-4 h-14 flex items-center justify-between gap-2 min-w-0">
          <Link
            href="/finder/dashboard"
            className="font-display font-bold text-brand-ink truncate min-w-0 touch-manipulation"
          >
            Azulli Finder
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
            <ThemeToggle />
          </nav>
        </div>
      </header>
      <div
        className="lg:hidden shrink-0"
        style={{ height: MOBILE_HEADER_HEIGHT }}
        aria-hidden
      />
    </>
  )
}
