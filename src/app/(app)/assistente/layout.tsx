import { Suspense, type ReactNode } from "react"
import { redirect } from "next/navigation"
import { listConversations } from "@/lib/assistant/queries"
import { createClient } from "@/lib/supabase/server"
import { canUseAssistant, type PlanId } from "@/lib/billing/plans"
import { ConversationsSidebar } from "./_components/conversations-sidebar"

export const metadata = { title: "Assistente IA — Azulli" }

export default async function AssistenteLayout({
  children,
}: {
  children: ReactNode
}) {
  const supabase = await createClient()
  const { data: tenant } = await supabase
    .from("tenants")
    .select("tier")
    .limit(1)
    .maybeSingle()

  const tier = (tenant?.tier ?? null) as PlanId | null
  if (!tier || !canUseAssistant(tier)) {
    redirect("/billing?upsell=assistente")
  }

  return (
    <div className="flex">
      <aside className="hidden md:block w-64 shrink-0 border-r bg-card sticky top-0 self-start h-screen overflow-hidden">
        <Suspense fallback={null}>
          <SidebarServer />
        </Suspense>
      </aside>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  )
}

async function SidebarServer() {
  const conversations = await listConversations()
  return <ConversationsSidebar conversations={conversations} />
}
