import type { ReactNode } from "react"

import { FinderProvider } from "@/components/finder/finder-context"
import { FinderShell } from "@/components/finder/finder-shell"

export const metadata = {
  title: "Azulli Finder — Prospecção",
}

export default function FinderShellLayout({ children }: { children: ReactNode }) {
  return (
    <FinderProvider>
      <FinderShell>{children}</FinderShell>
    </FinderProvider>
  )
}
