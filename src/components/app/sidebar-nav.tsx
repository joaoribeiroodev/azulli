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
} from "lucide-react"
import { cn } from "@/lib/utils"

const items = [
  { href: "/dashboard", label: "Painel", icon: LayoutDashboard },
  { href: "/lancamentos", label: "Lançamentos", icon: ArrowLeftRight },
  { href: "/clientes", label: "Clientes", icon: Users },
  { href: "/fornecedores", label: "Fornecedores", icon: Truck },
  { href: "/produtos", label: "Produtos", icon: Package },
  { href: "/funcionarios", label: "Funcionários", icon: UserCog },
  { href: "/metas-e-lembretes", label: "Metas e lembretes", icon: Target },
  { href: "/configuracoes", label: "Configurações", icon: Settings },
]

export function SidebarNav() {
  const pathname = usePathname()

  return (
    <nav className="px-3 space-y-1">
      {items.map((item) => {
        const Icon = item.icon
        const isActive =
          pathname === item.href || pathname?.startsWith(item.href + "/")

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
              isActive
                ? "bg-brand-soft text-brand"
                : "text-foreground hover:bg-muted"
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}
