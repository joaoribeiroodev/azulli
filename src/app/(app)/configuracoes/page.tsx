import { redirect } from "next/navigation"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"

import { getSettingsData } from "@/lib/settings/queries"
import { AccountTab } from "./_components/account-tab"
import { CompanyTab } from "./_components/company-tab"
import { BillingTab } from "./_components/billing-tab"

export const metadata = { title: "Configurações — Azulli" }

export default async function ConfiguracoesPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>
}) {
  const data = await getSettingsData()
  if (!data) redirect("/login")

  const sp = await searchParams
  const initialTab = ["conta", "empresa", "faturamento"].includes(sp.tab ?? "")
    ? sp.tab
    : "conta"

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto space-y-6">
      <header>
        <h1 className="text-2xl lg:text-3xl font-display font-bold text-brand-ink">
          Configurações
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Gerencie sua conta, sua empresa e seu faturamento.
        </p>
      </header>

      <Tabs defaultValue={initialTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 max-w-md">
          <TabsTrigger value="conta">Conta</TabsTrigger>
          <TabsTrigger value="empresa">Empresa</TabsTrigger>
          <TabsTrigger value="faturamento">Faturamento</TabsTrigger>
        </TabsList>

        <TabsContent value="conta" className="space-y-4">
          <AccountTab user={data.user} />
        </TabsContent>

        <TabsContent value="empresa" className="space-y-4">
          <CompanyTab tenant={data.tenant} />
        </TabsContent>

        <TabsContent value="faturamento" className="space-y-4">
          <BillingTab tenant={data.tenant} settings={data.settings} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
