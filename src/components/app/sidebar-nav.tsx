"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  ArrowLeftRight,
  Users,
  Truck,
  Package,
  UserCog,
  Target,
  Settings,
  Sparkles,
  Lock,
  Calculator,
  BookOpen,
  type LucideIcon,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { canUseAssistant, type PlanId } from "@/lib/billing/plans"
import type { TenantRole } from "@/lib/team/queries"

type Item = {
  href: string
  label: string
  icon: LucideIcon
  tiers?: PlanId[]
  enterpriseOnly?: boolean
  /** Visível só para estas roles (undefined = todas exceto filtro accountant) */
  roles?: TenantRole[]
  accountantOnly?: boolean
}

const items: Item[] = [
  { href: "/dashboard", label: "Painel", icon: LayoutDashboard },
  { href: "/lancamentos", label: "Lançamentos", icon: ArrowLeftRight },
  {
    href: "/assistente",
    label: "Assistente IA",
    icon: Sparkles,
    enterpriseOnly: true,
  },
  { href: "/clientes", label: "Clientes", icon: Users },
  { href: "/fornecedores", label: "Fornecedores", icon: Truck },
  { href: "/produtos", label: "Produtos", icon: Package },
  { href: "/funcionarios", label: "Funcionários", icon: UserCog },
  { href: "/metas-e-lembretes", label: "Metas e lembretes", icon: Target },
  {
    href: "/contador",
    label: "Contador",
    icon: Calculator,
    roles: ["owner", "admin", "accountant"],
  },
  { href: "/manual", label: "Manual de uso", icon: BookOpen },
  { href: "/configuracoes", label: "Configurações", icon: Settings },
]

type Props = {
  tier?: PlanId
  role?: TenantRole
}

export function SidebarNav({ tier, role = "owner" }: Props) {
  const pathname = usePathname()
  const isAccountant = role === "accountant"

  const visibleItems = items.filter((item) => {
    if (isAccountant) {
      return (
        item.href === "/contador" ||
        item.href === "/configuracoes" ||
        item.href === "/manual"
      )
    }
    if (item.roles) {
      return item.roles.includes(role)
    }
    return true
  })

  return (
    <nav className="px-3 space-y-1">
      {visibleItems.map((item) => {
        const Icon = item.icon
        const isActive =
          pathname === item.href || pathname?.startsWith(item.href + "/")

        const locked =
          !isAccountant &&
          item.enterpriseOnly &&
          (!tier || !canUseAssistant(tier))

        const href = locked ? "/billing" : item.href

        return (
          <Link
            key={item.href}
            href={href}
            className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
              isActive
                ? "bg-brand-soft text-brand"
                : "text-foreground hover:bg-muted",
              locked && "text-muted-foreground"
            )}
            title={
              locked ? "Disponível no plano Empresarial" : undefined
            }
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span className="flex-1 truncate">{item.label}</span>
            {locked && <Lock className="h-3 w-3 shrink-0 opacity-70" />}
            {!locked && item.enterpriseOnly && tier === "trial" && (
              <span className="text-[9px] font-bold uppercase tracking-wider bg-brand text-primary-foreground rounded px-1 py-0.5">
                Beta
              </span>
            )}
          </Link>
        )
      })}
    </nav>
  )
}
