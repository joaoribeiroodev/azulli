import { Suspense } from "react"
import { notFound } from "next/navigation"

import { Skeleton } from "@/components/ui/skeleton"
import {
  getSuppliersLite,
  getCategoriesUsed,
} from "@/lib/financial/queries"
import {
  getEmployeeDetail,
  getEmployeePayrollSeries,
  listPayrollTransactionsByEmployee,
} from "@/lib/employees/payroll-queries"

import { BackLink } from "@/components/app/back-link"

import { EmployeeHeader } from "./_components/employee-header"
import { EmployeeKPICards } from "./_components/employee-kpi-cards"
import { EmployeePayrollChartCard } from "./_components/employee-payroll-chart-card"
import { EmployeePayrollTransactions } from "./_components/employee-payroll-transactions"
import { EmployeePayrollAction } from "./_components/employee-payroll-action"
import {
  EmployeeContactCard,
  EmployeeTenureCard,
} from "./_components/employee-sidebar-cards"

type Params = { id: string }
type SP = { page?: string }

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>
}) {
  const { id } = await params
  const employee = await getEmployeeDetail(id)
  return {
    title: employee ? `${employee.name} — Azulli` : "Funcionário — Azulli",
  }
}

export default async function FuncionarioDetailPage({
  params,
  searchParams,
}: {
  params: Promise<Params>
  searchParams: Promise<SP>
}) {
  const { id } = await params
  const sp = await searchParams

  const employee = await getEmployeeDetail(id)
  if (!employee) notFound()

  const [payrollSeries, suppliers, expenseCategories] = await Promise.all([
    getEmployeePayrollSeries(employee.name, 6),
    getSuppliersLite(),
    getCategoriesUsed("expense"),
  ])

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <BackLink href="/funcionarios">Voltar para funcionários</BackLink>

      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <EmployeeHeader employee={employee} />
        <EmployeePayrollAction
          employee={employee}
          suppliers={suppliers}
          recentExpenseCategories={expenseCategories.map((c) => c.category)}
        />
      </div>

      <EmployeeKPICards employee={employee} />

      <EmployeePayrollChartCard
        employeeName={employee.name}
        initial={payrollSeries}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Suspense
            key={JSON.stringify(sp)}
            fallback={<Skeleton className="h-96" />}
          >
            <PayrollTransactionsSection
              employeeName={employee.name}
              page={sp.page ? parseInt(sp.page, 10) : 1}
            />
          </Suspense>
        </div>

        <div className="space-y-6">
          <EmployeeContactCard employee={employee} />
          <EmployeeTenureCard employee={employee} />
        </div>
      </div>
    </div>
  )
}

async function PayrollTransactionsSection({
  employeeName,
  page,
}: {
  employeeName: string
  page: number
}) {
  const result = await listPayrollTransactionsByEmployee(employeeName, page)
  return (
    <EmployeePayrollTransactions employeeName={employeeName} result={result} />
  )
}
