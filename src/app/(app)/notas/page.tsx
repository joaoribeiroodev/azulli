import { Suspense } from "react"
import { FileText, Sparkles } from "lucide-react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

import {
  listInvoices,
  getTenantInvoiceContext,
} from "@/lib/invoices/queries"
import { InvoicesTable } from "./_components/invoices-table"

export const metadata = { title: "Notas Fiscais — Azulli" }

export default async function NotasPage() {
  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <header>
        <h1 className="text-2xl lg:text-3xl font-display font-bold text-brand-ink">
          Notas Fiscais
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Histórico de NF-e e NFS-e emitidas pela sua empresa.
        </p>
      </header>

      <Suspense fallback={<Skeleton className="h-32" />}>
        <QuotaCard />
      </Suspense>

      <Suspense fallback={<Skeleton className="h-96" />}>
        <InvoicesSection />
      </Suspense>
    </div>
  )
}

async function QuotaCard() {
  const ctx = await getTenantInvoiceContext()
  const pct =
    ctx.nfseLimit !== null
      ? Math.min(100, Math.round((ctx.nfseUsed / ctx.nfseLimit) * 100))
      : 0

  const tierLabel = {
    trial: "Trial",
    pro: "Pro",
    enterprise: "Empresarial",
  }[ctx.tier]

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="text-base font-display flex items-center gap-2">
              Seu plano: {tierLabel}
              {ctx.tier === "enterprise" && (
                <Sparkles className="h-4 w-4 text-brand" />
              )}
            </CardTitle>
            <CardDescription>
              {ctx.tier === "enterprise"
                ? "NF-e e NFS-e ilimitadas. 🚀"
                : ctx.allowsNFe
                  ? "Inclui NF-e e NFS-e."
                  : "Apenas NFS-e está disponível neste plano."}
            </CardDescription>
          </div>
          <FileText className="h-5 w-5 text-muted-foreground" />
        </div>
      </CardHeader>
      <CardContent>
        {ctx.nfseLimit !== null ? (
          <div className="space-y-2">
            <div className="flex items-end justify-between text-sm">
              <span className="text-muted-foreground">NFS-e este mês</span>
              <span className="font-semibold">
                {ctx.nfseUsed} / {ctx.nfseLimit}
              </span>
            </div>
            <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
              <div
                className={`h-full transition-all ${
                  pct >= 90
                    ? "bg-destructive"
                    : pct >= 70
                      ? "bg-amber-500"
                      : "bg-brand"
                }`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Sem limites mensais.</p>
        )}
      </CardContent>
    </Card>
  )
}

async function InvoicesSection() {
  const invoices = await listInvoices()
  return <InvoicesTable rows={invoices} />
}
