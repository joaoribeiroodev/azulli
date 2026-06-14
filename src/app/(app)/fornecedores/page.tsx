import { Suspense } from "react"
import { Skeleton } from "@/components/ui/skeleton"
import { listSuppliersWithTotals } from "@/lib/financial/queries"
import { SuppliersHeader } from "./_components/suppliers-header"
import { SuppliersTable } from "./_components/suppliers-table"

export const metadata = { title: "Fornecedores — Azulli" }

export default async function FornecedoresPage() {
  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <SuppliersHeader />
      <Suspense fallback={<Skeleton className="h-96" />}>
        <TableSection />
      </Suspense>
    </div>
  )
}

async function TableSection() {
  const rows = await listSuppliersWithTotals()
  return <SuppliersTable rows={rows} />
}
