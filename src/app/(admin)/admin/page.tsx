import { redirect } from "next/navigation"
import { BarChart3 } from "lucide-react"

import { createClient } from "@/lib/supabase/server"
import { isPlatformAdmin } from "@/lib/admin/platform-admin"

import { AdminDashboardClient } from "./_components/admin-dashboard-client"

export const metadata = { title: "Admin — Azulli" }

export default async function AdminHomePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/login?next=/admin")

  const ok = await isPlatformAdmin(user.id, user.email)
  if (!ok) redirect("/login?error=admin_only")

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto space-y-6">
      <header>
        <h1 className="text-2xl lg:text-3xl font-display font-bold text-brand-ink flex items-center gap-2">
          <BarChart3 className="h-7 w-7 text-brand" />
          Painel Admin Azulli
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Saúde do SaaS: usuários, assinaturas, receita e cadastros recentes.
        </p>
      </header>
      <AdminDashboardClient />
    </div>
  )
}
