"use client"

import { useEffect, useState, type ReactNode } from "react"
import { usePathname } from "next/navigation"

import { useFinderContext } from "@/components/finder/finder-context"
import { FinderMobileNav, FinderSidebar } from "@/components/finder/finder-sidebar"
import { cn } from "@/lib/utils"

export function FinderShell({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const { pageMeta, aiEnabled } = useFinderContext()
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  useEffect(() => {
    if (!mobileOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = prev
    }
  }, [mobileOpen])

  return (
    <div className="finder-shell min-h-dvh bg-surface flex">
      {mobileOpen ? (
        <button
          type="button"
          className="finder-overlay lg:hidden"
          aria-label="Fechar menu"
          onClick={() => setMobileOpen(false)}
        />
      ) : null}

      <FinderSidebar mobileOpen={mobileOpen} onNavigate={() => setMobileOpen(false)} />

      <div className="finder-main flex-1 min-w-0 flex flex-col min-h-dvh w-full">
        <FinderMobileNav
          title={pageMeta.title}
          aiEnabled={aiEnabled}
          onOpenMenu={() => setMobileOpen(true)}
        />

        <header className="finder-desktop-header hidden lg:flex sticky top-0 z-20 border-b bg-background/90 backdrop-blur px-6 xl:px-8 py-4 items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h1 className="text-lg font-display font-bold text-brand-ink truncate">
              {pageMeta.title}
            </h1>
            {pageMeta.subtitle ? (
              <p className="text-xs text-muted-foreground truncate">{pageMeta.subtitle}</p>
            ) : null}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <div
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs text-muted-foreground"
              )}
            >
              <span
                className={cn(
                  "w-1.5 h-1.5 rounded-full",
                  aiEnabled ? "bg-brand" : "bg-muted-foreground"
                )}
              />
              IA: {aiEnabled ? "ON" : "OFF"}
            </div>
            <div className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs text-emerald-700 dark:text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Online
            </div>
          </div>
        </header>

        <main className="finder-content flex-1 w-full min-w-0 p-4 sm:p-5 lg:p-8 xl:p-10 pb-safe">
          {children}
        </main>
      </div>
    </div>
  )
}
