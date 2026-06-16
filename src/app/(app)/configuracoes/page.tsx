import { redirect } from "next/navigation"
import { User, Building2, CreditCard } from "lucide-react"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"

import { getSettingsData } from "@/lib/settings/queries"
import { getBillingStateLight } from "@/lib/billing/queries"
import { AccountTab } from "./_components/account-tab"
import { CompanyTab } from "./_components/company-tab"
import { BillingTab } from "./_components/billing-tab"

export const metadata = { title: "Configurações — Azulli" }

export default async function ConfiguracoesPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>
}) {
  const [data, billingState] = await Promise.all([
    getSettingsData(),
    getBillingStateLight(),
  ])
  if (!data) redirect("/login")

  const sp = await searchParams
  const initialTab = ["conta", "empresa", "faturamento"].includes(sp.tab ?? "")
    ? sp.tab
    : "conta"

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto">
      <header className="mb-4 sm:mb-6">
        <h1 className="text-2xl lg:text-3xl font-display font-bold text-brand-ink">
          Configurações
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Gerencie sua conta, sua empresa e seu faturamento.
        </p>
      </header>

      {/*
        IMPORTANTE: usamos "block" explícito + "!" (important) em várias classes
        pra GARANTIR que o shadcn Tabs não interprete como flex-row no mobile.
        Sintoma anterior: TabsList virava coluna à esquerda e TabsContent ficava
        espremido à direita.
      */}
      <Tabs defaultValue={initialTab} className="block w-full">
        {/* Wrapper do TabsList — bloco separado em cima */}
        <div className="block mb-4 sm:mb-6">
          <TabsList
            className="
              !grid !grid-cols-3 !w-full !h-auto
              gap-1 p-1.5
              bg-muted/40 border
              sm:max-w-md
            "
          >
            <TabsTrigger
              value="conta"
              className="
                flex flex-col sm:flex-row items-center justify-center
                gap-1 sm:gap-1.5
                py-2 px-1 sm:px-3
                text-[11px] sm:text-sm
                min-w-0
                data-[state=active]:shadow-sm
              "
            >
              <User className="h-4 w-4 sm:h-3.5 sm:w-3.5 shrink-0" />
              <span className="truncate">Conta</span>
            </TabsTrigger>

            <TabsTrigger
              value="empresa"
              className="
                flex flex-col sm:flex-row items-center justify-center
                gap-1 sm:gap-1.5
                py-2 px-1 sm:px-3
                text-[11px] sm:text-sm
                min-w-0
                data-[state=active]:shadow-sm
              "
            >
              <Building2 className="h-4 w-4 sm:h-3.5 sm:w-3.5 shrink-0" />
              <span className="truncate">Empresa</span>
            </TabsTrigger>

            <TabsTrigger
              value="faturamento"
              className="
                flex flex-col sm:flex-row items-center justify-center
                gap-1 sm:gap-1.5
                py-2 px-1 sm:px-3
                text-[11px] sm:text-sm
                min-w-0
                data-[state=active]:shadow-sm
              "
            >
              <CreditCard className="h-4 w-4 sm:h-3.5 sm:w-3.5 shrink-0" />
              <span className="hidden sm:inline truncate">Faturamento</span>
              <span className="sm:hidden truncate">Plano</span>
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Wrapper do TabsContent — bloco separado embaixo */}
        <div className="block w-full">
          <TabsContent value="conta" className="block mt-0 space-y-4">
            <AccountTab user={data.user} />
          </TabsContent>

          <TabsContent value="empresa" className="block mt-0 space-y-4">
            <CompanyTab tenant={data.tenant} />
          </TabsContent>

          <TabsContent value="faturamento" className="block mt-0 space-y-4">
            <BillingTab billingState={billingState} settings={data.settings} />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  )
}
