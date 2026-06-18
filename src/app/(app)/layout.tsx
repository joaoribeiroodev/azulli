import { redirect } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { SidebarNav } from "@/components/app/sidebar-nav"
import { UserMenu } from "@/components/app/user-menu"
import { MobileNav } from "@/components/app/mobile-nav"
import { ThemeToggle } from "@/components/theme-toggle"
import { RegisterServiceWorker } from "@/components/pwa/register-sw"

import { getCurrentMembership } from "@/lib/team/queries"

export default async function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: tenant } = await supabase
    .from("tenants")
    .select("name, tier, trial_ends_at")
    .limit(1)
    .maybeSingle()

  const userName =
    (user.user_metadata?.name as string | undefined) ?? user.email ?? "Você"
  const userEmail = user.email ?? ""
  const avatarUrl =
    (user.user_metadata?.avatar_url as string | undefined) ?? null

  const membership = await getCurrentMembership()
  const userRole = membership?.role ?? "owner"

  return (
    <div className="min-h-screen bg-surface lg:flex">
      <MobileNav
        userName={userName}
        userEmail={userEmail}
        avatarUrl={avatarUrl}
        tenantName={tenant?.name}
        tenantTier={tenant?.tier}
        trialEndsAt={tenant?.trial_ends_at}
        userRole={userRole}
      />

      <aside
        className="hidden lg:flex w-64 shrink-0 bg-card border-r flex-col"
        data-tour="dashboard-sidebar"
      >
        <div className="px-5 py-5 border-b flex items-center justify-between gap-2">
          <Link
            href="/dashboard"
            className="text-xl font-display font-bold text-brand-ink"
          >
            Azulli
          </Link>
          <ThemeToggle />
        </div>
        {tenant?.name && (
          <p className="px-5 pt-2 text-xs text-muted-foreground truncate">
            {tenant.name}
          </p>
        )}

        <div className="flex-1 overflow-y-auto py-4">
          <SidebarNav tier={tenant?.tier} role={userRole} />
        </div>

        {tenant?.tier === "trial" &&
          tenant.trial_ends_at &&
          userRole !== "accountant" && (
          <div className="mx-3 mb-3 rounded-lg bg-brand-soft px-3 py-2.5">
            <p className="text-xs font-medium text-brand-ink">Trial ativo 🚀</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Expira em{" "}
              {new Date(tenant.trial_ends_at).toLocaleDateString("pt-BR")}
            </p>
            <Link
              href="/billing"
              className="mt-2 inline-block text-xs font-medium text-brand hover:text-brand-hover"
            >
              Ver planos →
            </Link>
          </div>
        )}

        <div className="border-t p-2">
          <UserMenu
            name={userName}
            email={userEmail}
            avatarUrl={avatarUrl}
          />
        </div>
      </aside>

      <main className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden">{children}</main>

      <RegisterServiceWorker />
    </div>
  )
}
