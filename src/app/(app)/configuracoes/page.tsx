import { redirect } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { createClient } from "@/lib/supabase/server"

export const metadata = { title: "Configurações — Azulli" }

export default async function ConfiguracoesPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: tenant } = await supabase
    .from("tenants")
    .select("name, document, tier, trial_ends_at")
    .limit(1)
    .maybeSingle()

  const { data: settings } = await supabase
    .from("tenant_settings")
    .select("default_tax_regime, whatsapp_connected, whatsapp_number")
    .limit(1)
    .maybeSingle()

  const userName =
    (user.user_metadata?.name as string | undefined) ?? "—"

  return (
    <div className="p-6 lg:p-8 max-w-3xl mx-auto space-y-6">
      <header>
        <h1 className="text-2xl lg:text-3xl font-display font-bold text-brand-ink">
          Configurações
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Dados da sua conta e empresa.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Sua conta</CardTitle>
          <CardDescription>Informações pessoais</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <InfoRow label="Nome" value={userName} />
          <Separator />
          <InfoRow label="E-mail" value={user.email ?? "—"} />
          <Separator />
          <InfoRow
            label="WhatsApp"
            value={(user.user_metadata?.phone as string) ?? "—"}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Empresa</CardTitle>
          <CardDescription>Dados do seu tenant</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <InfoRow label="Nome da empresa" value={tenant?.name ?? "—"} />
          <Separator />
          <InfoRow label="CNPJ/CPF" value={tenant?.document ?? "Não preenchido"} />
          <Separator />
          <InfoRow
            label="Plano atual"
            value={
              tenant?.tier === "trial"
                ? `Trial (expira em ${tenant.trial_ends_at ? new Date(tenant.trial_ends_at).toLocaleDateString("pt-BR") : "—"})`
                : tenant?.tier ?? "—"
            }
          />
          <Separator />
          <InfoRow
            label="Regime tributário"
            value={
              settings?.default_tax_regime === "mei"
                ? "MEI"
                : settings?.default_tax_regime === "simples_nacional"
                  ? "Simples Nacional"
                  : "—"
            }
          />
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground text-center">
        Edição completa de empresa e regime tributário virá na Fase 4.
      </p>
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-right">{value}</span>
    </div>
  )
}