import { redirect } from "next/navigation"
import { Megaphone } from "lucide-react"

import { createClient } from "@/lib/supabase/server"
import { isPlatformAdmin } from "@/lib/admin/platform-admin"
import { BackLink } from "@/components/app/back-link"

import { AdminAnnouncementsClient } from "./_components/admin-announcements-client"

export const metadata = { title: "Avisos — Admin Azulli" }

export default async function AdminAnnouncementsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/login?next=/admin/announcements")

  const ok = await isPlatformAdmin(user.id, user.email)
  if (!ok) redirect("/login?error=admin_only")

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto space-y-6">
      <BackLink href="/admin">Voltar ao painel</BackLink>
      <header>
        <h1 className="text-2xl font-display font-bold text-brand-ink flex items-center gap-2">
          <Megaphone className="h-6 w-6 text-brand" />
          Avisos globais
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Mensagens exibidas no sininho de notificações do app.
        </p>
      </header>
      <AdminAnnouncementsClient />
    </div>
  )
}
