import { Suspense } from "react"
import { Skeleton } from "@/components/ui/skeleton"
import { listEmployees } from "@/lib/employees/queries"

import { EmployeesHeader } from "./_components/employees-header"
import { EmployeesStats } from "./_components/employees-stats"
import { EmployeesTable } from "./_components/employees-table"

export const metadata = { title: "Funcionários — Azulli" }

export default async function FuncionariosPage() {
  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <EmployeesHeader />

      <Suspense fallback={<Skeleton className="h-28" />}>
        <EmployeesStats />
      </Suspense>

      <Suspense fallback={<Skeleton className="h-96" />}>
        <TableSection />
      </Suspense>
    </div>
  )
}

async function TableSection() {
  const rows = await listEmployees()
  return <EmployeesTable rows={rows} />
}
