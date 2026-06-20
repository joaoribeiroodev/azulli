import type { ReactNode } from "react"

import { FinderMobileNav, FinderSidebar } from "@/components/finder/finder-sidebar"

export const metadata = {
  title: "Azulli Finder — Prospecção",
}

export default function FinderShellLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <link rel="stylesheet" href="/finder/css/app.css" />
      <div id="app-view" className="min-h-dvh bg-surface flex">
        <FinderSidebar />
        <div className="flex-1 min-w-0 flex flex-col min-h-dvh isolate">
          <FinderMobileNav />
          <header className="hidden lg:flex sticky top-0 z-30 border-b bg-background/80 backdrop-blur px-6 xl:px-8 py-4 items-center justify-between gap-3">
            <div className="min-w-0">
              <h1 id="page-title" className="text-lg font-display font-bold text-brand-ink truncate">
                Dashboard
              </h1>
              <p id="page-subtitle" className="text-xs text-muted-foreground truncate">
                Visão geral da prospecção
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <div id="ai-status" className="hidden items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs text-muted-foreground">
                <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground" />
                IA: --
              </div>
              <div className="flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs text-emerald-700 dark:text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Online
              </div>
            </div>
          </header>
          <main id="page-content" className="flex-1 p-4 lg:p-8 xl:p-10 pb-safe">
            {children}
          </main>
        </div>
      </div>
      <div id="toast-container" className="fixed top-4 z-[60] space-y-2 pointer-events-none" />
      <div id="modal-root" />
      <nav id="nav" className="hidden" aria-hidden />
    </>
  )
}
