import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { signOutAction } from "@/lib/auth/actions"
import { Button } from "@/components/ui/button"

export const metadata = {
  title: "Dashboard — Azulli",
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  // Busca o tenant do usuário (RLS já filtra)
  const { data: tenant } = await supabase
    .from("tenants")
    .select("name, tier, trial_ends_at")
    .limit(1)
    .maybeSingle()

  return (
    <main className="min-h-screen p-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-display font-bold text-brand-ink">
            Olá, {user.user_metadata?.name ?? "empreendedor"} 👋
          </h1>
          <p className="text-muted-foreground mt-1">
            {tenant ? `Empresa: ${tenant.name}` : "Carregando empresa..."}
          </p>
        </div>

        <form action={signOutAction}>
          <Button type="submit" variant="outline">
            Sair
          </Button>
        </form>
      </div>

      <div className="rounded-xl border bg-card p-6">
        <h2 className="text-lg font-semibold mb-2">Fase 2 ✅</h2>
        <p className="text-sm text-muted-foreground">
          Autenticação funcionando. Trial:{" "}
          <span className="font-medium text-foreground">
            {tenant?.tier === "trial" ? "Ativo" : tenant?.tier}
          </span>
          {tenant?.trial_ends_at && (
            <>
              {" "}
              · Expira em{" "}
              {new Date(tenant.trial_ends_at).toLocaleDateString("pt-BR")}
            </>
          )}
        </p>
        <p className="text-sm text-muted-foreground mt-2">
          Próxima fase: construir o financeiro completo.
        </p>
      </div>
    </main>
  )
}