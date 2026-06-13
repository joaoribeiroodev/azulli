"use client"

import { useState } from "react"
import Link from "next/link"
import { Menu } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { SidebarNav } from "@/components/app/sidebar-nav"
import { UserMenu } from "@/components/app/user-menu"

type Props = {
  userName: string
  userEmail: string
  tenantName?: string | null
  tenantTier?: string | null
  trialEndsAt?: string | null
}

export function MobileNav({
  userName,
  userEmail,
  tenantName,
  tenantTier,
  trialEndsAt,
}: Props) {
  const [open, setOpen] = useState(false)

  return (
    <header className="lg:hidden sticky top-0 z-30 bg-card border-b px-4 py-3 flex items-center justify-between">
      <Link href="/dashboard" className="text-lg font-display font-bold text-brand-ink">
        Azulli
      </Link>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon">
            <Menu className="h-5 w-5" />
            <span className="sr-only">Abrir menu</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-72 p-0 flex flex-col">
          <SheetHeader className="px-5 py-5 border-b">
            <SheetTitle className="text-left text-xl font-display font-bold text-brand-ink">
              Azulli
            </SheetTitle>
            {tenantName && (
              <p className="text-xs text-muted-foreground text-left">{tenantName}</p>
            )}
          </SheetHeader>

          <div
            className="flex-1 overflow-y-auto py-4"
            onClick={() => setOpen(false)}
          >
            <SidebarNav />
          </div>

          {tenantTier === "trial" && trialEndsAt && (
            <div className="mx-3 mb-3 rounded-lg bg-brand-soft px-3 py-2.5">
              <p className="text-xs font-medium text-brand-ink">Trial ativo 🚀</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Expira em {new Date(trialEndsAt).toLocaleDateString("pt-BR")}
              </p>
              <Link
                href="/billing"
                className="mt-2 inline-block text-xs font-medium text-brand hover:text-brand-hover"
                onClick={() => setOpen(false)}
              >
                Ver planos →
              </Link>
            </div>
          )}

          <div className="border-t p-2">
            <UserMenu name={userName} email={userEmail} />
          </div>
        </SheetContent>
      </Sheet>
    </header>
  )
}