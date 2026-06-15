import { Users, UserMinus, Wallet } from "lucide-react"
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { formatBRL } from "@/lib/utils/currency"
import { getEmployeeStats } from "@/lib/employees/queries"

export async function EmployeesStats() {
  const stats = await getEmployeeStats()

  return (
    <section className="grid grid-cols-2 lg:grid-cols-3 gap-4">
      <Card>
        <CardHeader className="pb-2">
          <CardDescription>Equipe ativa</CardDescription>
          <CardTitle className="text-2xl font-display flex items-center gap-2">
            <Users className="h-5 w-5 text-brand" />
            {stats.totalActive}
          </CardTitle>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardDescription>Inativos</CardDescription>
          <CardTitle className="text-2xl font-display flex items-center gap-2">
            <UserMinus className="h-5 w-5 text-muted-foreground" />
            {stats.totalInactive}
          </CardTitle>
        </CardHeader>
      </Card>

      <Card className="col-span-2 lg:col-span-1">
        <CardHeader className="pb-2">
          <CardDescription>Folha mensal estimada</CardDescription>
          <CardTitle className="text-2xl font-display flex items-center gap-2">
            <Wallet className="h-5 w-5 text-success-ink" />
            {formatBRL(stats.monthlyPayroll)}
          </CardTitle>
        </CardHeader>
      </Card>
    </section>
  )
}
