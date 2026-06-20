import type { ReactNode } from "react"

import { FinderShell } from "@/components/finder/finder-shell"

export const metadata = {
  title: "Azulli Finder — Prospecção",
}

export default function FinderShellLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <link rel="stylesheet" href="/finder/css/app.css" />
      <FinderShell>{children}</FinderShell>
    </>
  )
}
