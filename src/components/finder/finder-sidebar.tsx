"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Clock,
  Columns2,
  ExternalLink,
  LayoutDashboard,
  LogOut,
  Menu,
  Search,
  Settings,
  Users,
  UsersRound,
  X,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { toast } from "sonner"

import { useFinderContext } from "@/components/finder/finder-context"
import { ThemeToggle } from "@/components/theme-toggle"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { getFinderRoleLabel } from "@/lib/finder/roles"
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
    "flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors touch-manipulation",
    active
      ? "bg-brand/10 text-brand"
      : "text-muted-foreground hover:bg-muted hover:text-foreground"
  )
}

function NavLink({
  item,
  pathname,
  onNavigate,
}: {
  item: NavItem
  pathname: string
  onNavigate?: () => void
}) {
  const active = isActive(pathname, item.href, item.exact)
  const Icon = item.icon

  return (
    <Link href={item.href} className={navLinkClass(active)} onClick={onNavigate}>
      <Icon className="h-4 w-4 shrink-0" />
      {item.label}
    </Link>
  )
}

function LogoutButton({ onLogout }: { onLogout: () => void }) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <button
          type="button"
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors touch-manipulation"
        >
          <LogOut className="h-4 w-4" />
          Sair
        </button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Sair da conta?</AlertDialogTitle>
          <AlertDialogDescription>
            Você precisará entrar novamente para acessar o Finder.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onClick={() => {
              onLogout()
              toast.info("Sessão encerrada.")
            }}
          >
            Sair
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

function UserChip() {
  const { user } = useFinderContext()
  const initial = (user?.nome || user?.email || "?").trim().charAt(0).toUpperCase()

  return (
    <div className="px-1 py-2 flex items-center gap-2 min-w-0">
      <div className="w-9 h-9 rounded-full bg-brand/10 text-brand font-semibold text-sm flex items-center justify-center shrink-0">
        {initial}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium truncate">{user?.nome || user?.email || "—"}</div>
        <div className="text-xs text-muted-foreground truncate">
          {user?.role ? getFinderRoleLabel(user.role) : "—"}
        </div>
      </div>
    </div>
  )
}

type FinderSidebarProps = {
  mobileOpen: boolean
  onNavigate?: () => void
}

export function FinderSidebar({ mobileOpen, onNavigate }: FinderSidebarProps) {
  const pathname = usePathname()
  const { adminUrl, logout } = useFinderContext()

  return (
    <aside
      className={cn(
        "finder-sidebar flex flex-col bg-card border-r z-50",
        "fixed inset-y-0 left-0 w-[min(100vw-2.5rem,17rem)] max-w-[85vw]",
        "transition-transform duration-200 ease-out pt-safe",
        "lg:static lg:w-64 lg:max-w-none lg:translate-x-0 lg:shrink-0 lg:min-h-dvh lg:pt-0",
        mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}
      aria-label="Menu principal"
    >
      <div className="px-4 sm:px-5 py-4 border-b flex items-start justify-between gap-2">
        <div className="min-w-0">
          <Link
            href="/finder/dashboard"
            className="font-display text-lg sm:text-xl font-bold text-brand-ink block truncate"
            onClick={onNavigate}
          >
            Azulli Finder
          </Link>
          <p className="text-xs text-muted-foreground mt-0.5">Prospecção comercial</p>
        </div>
        <button
          type="button"
          className="lg:hidden inline-flex items-center justify-center rounded-lg min-h-10 min-w-10 text-muted-foreground hover:bg-muted touch-manipulation"
          aria-label="Fechar menu"
          onClick={onNavigate}
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-0.5">
        {NAV_ITEMS.map((item) => (
          <NavLink key={item.href} item={item} pathname={pathname} onNavigate={onNavigate} />
        ))}
        {adminUrl ? (
          <a
            href={adminUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={navLinkClass(false)}
            onClick={onNavigate}
          >
            <Settings className="h-4 w-4 shrink-0" />
            Admin Azulli
            <ExternalLink className="h-3 w-3 ml-auto opacity-60" />
          </a>
        ) : null}
      </nav>

      <div className="mt-auto border-t px-3 py-3 space-y-2 pb-safe">
        <UserChip />
        <div className="flex items-center justify-between gap-2 px-1">
          <span className="text-xs text-muted-foreground">Tema</span>
          <ThemeToggle />
        </div>
        <LogoutButton onLogout={logout} />
      </div>
    </aside>
  )
}

type FinderMobileNavProps = {
  title: string
  aiEnabled: boolean
  onOpenMenu: () => void
}

export function FinderMobileNav({ title, aiEnabled, onOpenMenu }: FinderMobileNavProps) {
  return (
    <header className="finder-mobile-header lg:hidden sticky top-0 z-30 border-b bg-background/95 backdrop-blur pt-safe">
      <div className="h-14 px-3 sm:px-4 flex items-center gap-2 min-w-0">
        <button
          type="button"
          onClick={onOpenMenu}
          className="inline-flex items-center justify-center rounded-lg min-h-11 min-w-11 text-foreground hover:bg-muted touch-manipulation shrink-0"
          aria-label="Abrir menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="min-w-0 flex-1">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground leading-none">
            Azulli Finder
          </p>
          <h2 className="text-sm font-display font-bold text-brand-ink truncate leading-tight">
            {title}
          </h2>
        </div>

        <div className="hidden sm:inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] text-muted-foreground shrink-0">
          <span
            className={cn(
              "w-1.5 h-1.5 rounded-full",
              aiEnabled ? "bg-brand" : "bg-muted-foreground"
            )}
          />
          IA: {aiEnabled ? "ON" : "OFF"}
        </div>

        <ThemeToggle />
      </div>
    </header>
  )
}
