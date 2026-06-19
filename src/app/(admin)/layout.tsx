import type { ReactNode } from "react"

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-surface">
      <main className="min-h-dvh">{children}</main>
    </div>
  )
}
