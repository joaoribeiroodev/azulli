import { redirect } from "next/navigation"
import { Users } from "lucide-react"

import { createClient } from "@/lib/supabase/server"
import { isPlatformAdmin } from "@/lib/admin/platform-admin"

import { AdminLeadsClient } from "./_components/admin-leads-client"

export const metadata = { title: "Leads — Admin Azulli" }

export default async function AdminLeadsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/login?next=/admin/leads")

  const ok = await isPlatformAdmin(user.id, user.email)
  if (!ok) redirect("/login?error=admin_only")

  return (
    <div className="w-full space-y-6 xl:space-y-8">
      <header className="border-b border-border/60 pb-6">
        <h1 className="text-2xl xl:text-3xl font-display font-bold text-brand-ink flex items-center gap-2">
          <Users className="h-6 w-6 text-brand shrink-0" />
          Oportunidades
        </h1>
        <p className="text-sm text-muted-foreground mt-2 max-w-3xl">
          Leads capturados por campanhas (n8n). Acompanhe UTMs e mova o status do
          funil: novo → contatado → ativado.
        </p>
      </header>
      <AdminLeadsClient />
    </div>
  )
}
