"use client"

import { useEffect, useState, type ReactNode } from "react"
import { usePathname } from "next/navigation"

import { FinderMobileNav, FinderSidebar } from "@/components/finder/finder-sidebar"

export function FinderShell({ children }: { children: ReactNode }) {
  const pathname = usePathname()
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
    <>
      <div id="app-view" className="finder-shell min-h-dvh bg-surface flex">
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
          <FinderMobileNav onOpenMenu={() => setMobileOpen(true)} />

          <header className="finder-desktop-header hidden lg:flex sticky top-0 z-20 border-b bg-background/90 backdrop-blur px-6 xl:px-8 py-4 items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <h1
                id="page-title"
                className="text-lg font-display font-bold text-brand-ink truncate"
              >
                Dashboard
              </h1>
              <p id="page-subtitle" className="text-xs text-muted-foreground truncate">
                Visão geral da prospecção
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <div
                id="ai-status"
                className="hidden lg:inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs text-muted-foreground"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground" />
                IA: --
              </div>
              <div className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs text-emerald-700 dark:text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Online
              </div>
            </div>
          </header>

          <main id="page-content" className="finder-content flex-1 w-full min-w-0 p-4 sm:p-5 lg:p-8 xl:p-10 pb-safe">
            {children}
          </main>
        </div>
      </div>

      <div id="toast-container" className="finder-toasts" />
      <div id="modal-root" />
      <nav id="nav" className="hidden" aria-hidden />
    </>
  )
}
