"use client"

import { useState } from "react"
import Link from "next/link"
import { Menu } from "lucide-react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { ThemeToggle } from "@/components/theme-toggle"

import { SidebarNav } from "./sidebar-nav"
import { UserMenu } from "./user-menu"
import type { TenantRole } from "@/lib/team/queries"

type Props = {
  userName: string
  userEmail: string
  avatarUrl?: string | null
  tenantName?: string
  tenantTier?: "trial" | "pro" | "enterprise"
  trialEndsAt?: string
  userRole?: TenantRole
}

export function MobileNav({
  userName,
  userEmail,
  avatarUrl,
  tenantName,
  tenantTier,
  trialEndsAt,
  userRole = "owner",
}: Props) {
  const [open, setOpen] = useState(false)
  const initials = getInitials(userName || userEmail)

  return (
    <header className="lg:hidden sticky top-0 z-30 flex h-14 items-center justify-between gap-2 border-b bg-card px-4 pt-[env(safe-area-inset-top,0px)]">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Abrir menu"
            data-tour="dashboard-sidebar"
          >
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-[min(100%,18rem)] p-0 flex flex-col">
          <SheetHeader className="px-5 py-4 border-b">
            <SheetTitle className="text-xl font-display font-bold text-brand-ink text-left">
              Azulli
            </SheetTitle>
            {tenantName && (
              <p className="text-xs text-muted-foreground truncate text-left">
                {tenantName}
              </p>
            )}
          </SheetHeader>

          <div
            className="flex-1 overflow-y-auto py-4"
            onClick={() => setOpen(false)}
          >
            <SidebarNav tier={tenantTier} role={userRole} />
          </div>

          {tenantTier === "trial" && trialEndsAt && (
            <div className="mx-3 mb-3 rounded-lg bg-brand-soft px-3 py-2.5">
              <p className="text-xs font-medium text-brand-ink">
                Trial ativo 🚀
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Expira em {new Date(trialEndsAt).toLocaleDateString("pt-BR")}
              </p>
              <Link
                href="/billing"
                onClick={() => setOpen(false)}
                className="mt-2 inline-block text-xs font-medium text-brand hover:text-brand-hover"
              >
                Ver planos →
              </Link>
            </div>
          )}

          <div className="border-t p-2">
            <UserMenu
              name={userName}
              email={userEmail}
              avatarUrl={avatarUrl}
            />
          </div>
        </SheetContent>
      </Sheet>

      <Link
        href="/dashboard"
        className="text-lg font-display font-bold text-brand-ink"
      >
        Azulli
      </Link>

      <div className="flex items-center gap-1">
        <ThemeToggle />
        <Avatar className="h-8 w-8 border border-border">
          {avatarUrl ? (
            <AvatarImage
              src={avatarUrl}
              alt={userName}
              className="object-cover"
            />
          ) : null}
          <AvatarFallback className="bg-brand-soft text-brand text-xs font-semibold">
            {initials || "U"}
          </AvatarFallback>
        </Avatar>
      </div>
    </header>
  )
}

function getInitials(name: string): string {
  if (!name) return ""
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}
