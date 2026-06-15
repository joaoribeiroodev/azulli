import { notFound } from "next/navigation"
import { getEmployeeDetails } from "@/lib/employees/queries"
import { EmployeeHeader } from "./_components/employee-header"
import { EmployeeInfoCard } from "./_components/employee-info-card"

export const metadata = { title: "Funcionário — Azulli" }

export default async function FuncionarioDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const employee = await getEmployeeDetails(id)
  if (!employee) notFound()

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <EmployeeHeader employee={employee} />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Espaço reservado para futuro: histórico de pagamentos, contracheques, etc. */}
        </div>
        <div className="lg:col-span-1">
          <EmployeeInfoCard employee={employee} />
        </div>
      </div>
    </div>
  )
}
