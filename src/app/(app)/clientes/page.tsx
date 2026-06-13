import { Suspense } from "react"
import { Skeleton } from "@/components/ui/skeleton"
import { listCustomersWithTotals } from "@/lib/financial/queries"
import { CustomersHeader } from "./_components/customers-header"
import { CustomersTable } from "./_components/customers-table"

export const metadata = { title: "Clientes — Azulli" }

export default async function ClientesPage() {
  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <CustomersHeader />
      <Suspense fallback={<Skeleton className="h-96" />}>
        <TableSection />
      </Suspense>
    </div>
  )
}

async function TableSection() {
  const rows = await listCustomersWithTotals()
  return <CustomersTable rows={rows} />
}