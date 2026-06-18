"use client"

import { useCallback, useState } from "react"
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
import { cn } from "@/lib/utils"

import { LANDING_NAV } from "./constants"

const HEADER_OFFSET = 72

export function LandingMobileMenu() {
  const [open, setOpen] = useState(false)

  const scrollToSection = useCallback((href: string) => {
    const id = href.replace("#", "")
    const el = document.getElementById(id)
    if (!el) return

    const top =
      el.getBoundingClientRect().top + window.scrollY - HEADER_OFFSET + 4

    window.scrollTo({ top, behavior: "smooth" })
    window.history.pushState(null, "", href)
    setOpen(false)
  }, [])

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden h-9 w-9 shrink-0"
          aria-label="Abrir menu de seções"
        >
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[min(100%,280px)]">
        <SheetHeader>
          <SheetTitle className="font-display text-brand-ink">Azulli</SheetTitle>
        </SheetHeader>
        <nav className="mt-6 flex flex-col gap-1" aria-label="Seções">
          {LANDING_NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={(e) => {
                e.preventDefault()
                scrollToSection(item.href)
              }}
              className={cn(
                "rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground",
                "hover:text-brand-ink hover:bg-brand-soft/50 transition-colors"
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </SheetContent>
    </Sheet>
  )
}
