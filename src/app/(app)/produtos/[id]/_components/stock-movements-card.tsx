import {
  ArrowUp,
  ArrowDown,
  Plus,
  Minus,
  Sparkles,
} from "lucide-react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatDateBR } from "@/lib/utils/date"
import type { StockMovement } from "@/lib/products/queries"

const KIND_CONFIG: Record<
  StockMovement["kind"],
  { label: string; Icon: typeof ArrowUp; className: string }
> = {
  sale: {
    label: "Venda",
    Icon: ArrowDown,
    className: "bg-red-50 text-destructive dark:bg-red-950/40",
  },
  purchase: {
    label: "Compra",
    Icon: ArrowUp,
    className: "bg-success-soft text-success-ink",
  },
  adjustment_in: {
    label: "Ajuste +",
    Icon: Plus,
    className: "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300",
  },
  adjustment_out: {
    label: "Ajuste −",
    Icon: Minus,
    className: "bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-200",
  },
  initial: {
    label: "Inicial",
    Icon: Sparkles,
    className: "bg-muted text-muted-foreground",
  },
}

export function StockMovementsCard({
  movements,
  unit,
}: {
  movements: StockMovement[]
  unit: string
}) {
  if (movements.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Histórico de movimentações
          </CardTitle>
        </CardHeader>
        <CardContent className="py-8 text-center">
          <p className="text-sm text-muted-foreground">
            Nenhum movimento de estoque registrado ainda.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          Histórico de movimentações
        </CardTitle>
        <CardDescription>
          Últimos {movements.length}{" "}
          {movements.length === 1 ? "movimento" : "movimentos"} de estoque
        </CardDescription>
      </CardHeader>
      <CardContent className="px-0 pb-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-6">Tipo</TableHead>
              <TableHead className="text-right">Quantidade</TableHead>
              <TableHead className="text-right">Estoque após</TableHead>
              <TableHead className="hidden md:table-cell">
                Observações
              </TableHead>
              <TableHead className="text-right pr-6">Data</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {movements.map((m) => {
              const config = KIND_CONFIG[m.kind]
              const Icon = config.Icon
              const isPositive = m.quantity > 0
              return (
                <TableRow key={m.id}>
                  <TableCell className="pl-6">
                    <span
                      className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded ${config.className}`}
                    >
                      <Icon className="h-3 w-3" />
                      {config.label}
                    </span>
                  </TableCell>
                  <TableCell
                    className={`text-right font-medium whitespace-nowrap ${
                      isPositive ? "text-success-ink" : "text-destructive"
                    }`}
                  >
                    {isPositive ? "+" : ""}
                    {m.quantity} {unit}
                  </TableCell>
                  <TableCell className="text-right whitespace-nowrap font-medium">
                    {m.stock_after} {unit}
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-muted-foreground text-xs">
                    {m.notes ?? (m.transaction_id ? "Lançamento vinculado" : "—")}
                  </TableCell>
                  <TableCell className="text-right whitespace-nowrap text-xs text-muted-foreground pr-6">
                    {formatDateBR(m.created_at)}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
