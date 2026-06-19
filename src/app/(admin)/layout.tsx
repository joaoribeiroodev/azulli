import type { ReactNode } from "react"

import { AdminMobileNav, AdminSidebar } from "@/components/admin/admin-sidebar"

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-surface flex">
      <AdminSidebar />
      <div className="flex-1 min-w-0 flex flex-col min-h-dvh">
        <AdminMobileNav />
        <main className="flex-1 w-full p-4 sm:p-6 lg:p-8 xl:p-10">
          {children}
        </main>
      </div>
    </div>
  )
}
