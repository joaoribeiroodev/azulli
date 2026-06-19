import { redirect } from "next/navigation"
import { Megaphone } from "lucide-react"

import { createClient } from "@/lib/supabase/server"
import { isPlatformAdmin } from "@/lib/admin/platform-admin"

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
    <div className="w-full space-y-6 xl:space-y-8">
      <header className="border-b border-border/60 pb-6">
        <h1 className="text-2xl xl:text-3xl font-display font-bold text-brand-ink flex items-center gap-2">
          <Megaphone className="h-6 w-6 text-brand shrink-0" />
          Avisos globais
        </h1>
        <p className="text-sm text-muted-foreground mt-2 max-w-3xl">
          Mensagens exibidas no sininho de notificações do app.
        </p>
      </header>
      <AdminAnnouncementsClient />
    </div>
  )
}
