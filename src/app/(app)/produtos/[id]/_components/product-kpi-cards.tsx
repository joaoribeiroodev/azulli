import {
  DollarSign,
  Box,
  TrendingUp,
  Receipt,
  AlertTriangle,
} from "lucide-react"
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card"
import { formatBRL } from "@/lib/utils/currency"
import type { ProductDetail } from "@/lib/products/queries"

export function ProductKPICards({ product }: { product: ProductDetail }) {
  const { kpis, track_stock, stock_quantity, low_stock_threshold, unit, kind } =
    product

  const isLowStock =
    track_stock &&
    low_stock_threshold !== null &&
    stock_quantity <= low_stock_threshold

  return (
    <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <Card>
        <CardHeader className="pb-2">
          <CardDescription>Total vendido</CardDescription>
          <CardTitle className="text-2xl font-display flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-success-ink" />
            {formatBRL(kpis.totalSold)}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <p className="text-xs text-muted-foreground">
            {kpis.unitsSold}{" "}
            {kpis.unitsSold === 1 ? "unidade vendida" : "unidades vendidas"}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardDescription>Preço médio de venda</CardDescription>
          <CardTitle className="text-2xl font-display flex items-center gap-2">
            <Receipt className="h-5 w-5 text-brand" />
            {formatBRL(kpis.avgSalePrice)}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <p className="text-xs text-muted-foreground">
            {kpis.avgSalePrice !== product.price
              ? `Preço atual: ${formatBRL(product.price)}`
              : "Igual ao preço cadastrado"}
          </p>
        </CardContent>
      </Card>

      {product.cost !== null ? (
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Margem estimada</CardDescription>
            <CardTitle
              className={`text-2xl font-display flex items-center gap-2 ${
                kpis.estimatedMargin >= 0
                  ? "text-success-ink"
                  : "text-destructive"
              }`}
            >
              <TrendingUp className="h-5 w-5" />
              {formatBRL(kpis.estimatedMargin)}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-xs text-muted-foreground">
              Custo: {formatBRL(kpis.totalCostValue)}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-dashed">
          <CardHeader className="pb-2">
            <CardDescription>Margem</CardDescription>
            <CardTitle className="text-base font-display text-muted-foreground">
              Não calculada
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-xs text-muted-foreground">
              Cadastre o custo para ver
            </p>
          </CardContent>
        </Card>
      )}

      {kind === "product" && track_stock ? (
        <Card className={isLowStock ? "border-amber-300" : ""}>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1">
              Estoque atual
              {isLowStock && (
                <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
              )}
            </CardDescription>
            <CardTitle
              className={`text-2xl font-display flex items-center gap-2 ${
                isLowStock ? "text-amber-600" : ""
              }`}
            >
              <Box className="h-5 w-5" />
              {stock_quantity} {unit}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {isLowStock ? (
              <p className="text-xs text-amber-600 font-medium">
                Abaixo do mínimo ({low_stock_threshold} {unit})
              </p>
            ) : low_stock_threshold !== null ? (
              <p className="text-xs text-muted-foreground">
                Mínimo: {low_stock_threshold} {unit}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                Sem alerta configurado
              </p>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card className="border-dashed">
          <CardHeader className="pb-2">
            <CardDescription>Estoque</CardDescription>
            <CardTitle className="text-base font-display text-muted-foreground">
              {kind === "service" ? "Não aplicável" : "Sem controle"}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-xs text-muted-foreground">
              {kind === "service"
                ? "Serviços não têm estoque"
                : "Ative no cadastro"}
            </p>
          </CardContent>
        </Card>
      )}
    </section>
  )
}
