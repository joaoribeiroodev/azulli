import Link from "next/link"
import { Trophy, ChevronRight, Package } from "lucide-react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card"
import { formatBRL } from "@/lib/utils/currency"
import {
  getTopCustomerOfMonth,
  getTopSupplierOfMonth,
} from "@/lib/financial/queries"
import { getTopProducts } from "@/lib/products/queries"

export async function TopOfMonthCards() {
  const [topCustomer, topSupplier, topProducts] = await Promise.all([
    getTopCustomerOfMonth(),
    getTopSupplierOfMonth(),
    getTopProducts("month", 1),
  ])

  const topProduct = topProducts[0] ?? null

  return (
    <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Top cliente */}
      <Card>
        <CardHeader className="pb-2">
          <CardDescription className="flex items-center gap-1.5">
            <Trophy className="h-3.5 w-3.5 text-success-ink" />
            Cliente top do mês
          </CardDescription>
        </CardHeader>
        <CardContent>
          {topCustomer ? (
            <Link
              href={`/clientes/${topCustomer.id}`}
              className="group flex items-end justify-between gap-3"
            >
              <div className="min-w-0">
                <p className="text-lg font-semibold truncate group-hover:text-brand transition-colors">
                  {topCustomer.name}
                </p>
                <p className="text-sm font-medium text-success-ink">
                  {formatBRL(topCustomer.total)}
                </p>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-brand group-hover:translate-x-0.5 transition-all shrink-0" />
            </Link>
          ) : (
            <p className="text-sm text-muted-foreground">
              Nenhuma venda paga este mês. Bora vender? 🚀
            </p>
          )}
        </CardContent>
      </Card>

      {/* Top fornecedor */}
      <Card>
        <CardHeader className="pb-2">
          <CardDescription className="flex items-center gap-1.5">
            <Trophy className="h-3.5 w-3.5 text-brand" />
            Fornecedor top do mês
          </CardDescription>
        </CardHeader>
        <CardContent>
          {topSupplier ? (
            <Link
              href={`/fornecedores/${topSupplier.id}`}
              className="group flex items-end justify-between gap-3"
            >
              <div className="min-w-0">
                <p className="text-lg font-semibold truncate group-hover:text-brand transition-colors">
                  {topSupplier.name}
                </p>
                <p className="text-sm font-medium text-foreground">
                  {formatBRL(topSupplier.total)}
                </p>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-brand group-hover:translate-x-0.5 transition-all shrink-0" />
            </Link>
          ) : (
            <p className="text-sm text-muted-foreground">
              Nenhuma despesa paga a fornecedor este mês.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Top produto */}
      <Card>
        <CardHeader className="pb-2">
          <CardDescription className="flex items-center gap-1.5">
            <Package className="h-3.5 w-3.5 text-amber-500" />
            Produto top do mês
          </CardDescription>
        </CardHeader>
        <CardContent>
          {topProduct ? (
            <Link
              href={`/produtos/${topProduct.id}`}
              className="group flex items-end justify-between gap-3"
            >
              <div className="min-w-0">
                <p className="text-lg font-semibold truncate group-hover:text-brand transition-colors">
                  {topProduct.name}
                </p>
                <p className="text-sm font-medium text-foreground">
                  {formatBRL(topProduct.total)}
                  <span className="ml-2 text-xs text-muted-foreground">
                    · {topProduct.units}{" "}
                    {topProduct.units === 1 ? "venda" : "vendas"}
                  </span>
                </p>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-brand group-hover:translate-x-0.5 transition-all shrink-0" />
            </Link>
          ) : (
            <p className="text-sm text-muted-foreground">
              Nenhum produto vendido este mês.
            </p>
          )}
        </CardContent>
      </Card>
    </section>
  )
}
