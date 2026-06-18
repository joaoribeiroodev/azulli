"use client"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { formatBRL } from "@/lib/utils/currency"
import { formatDateBR } from "@/lib/utils/date"

export type TransactionDetailData = {
  type: "income" | "expense"
  amount: number
  status?: "pending" | "paid" | "overdue"
  due_date: string
  paid_at?: string | null
  description: string | null
  category?: string | null
  customer_name?: string | null
  supplier_name?: string | null
  source?: string | null
}

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  transaction: TransactionDetailData | null
}

const STATUS_LABEL: Record<string, string> = {
  paid: "Pago",
  pending: "Pendente",
  overdue: "Vencido",
}

export function TransactionDetailDialog({
  open,
  onOpenChange,
  transaction,
}: Props) {
  if (!transaction) return null

  const isIncome = transaction.type === "income"
  const displayDate =
    transaction.status === "paid" && transaction.paid_at
      ? formatDateBR(transaction.paid_at.slice(0, 10))
      : formatDateBR(transaction.due_date)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-lg">
            Detalhes do lançamento
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 text-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">
                {isIncome ? "Receita" : "Despesa"}
              </p>
              <p
                className={`text-2xl font-display font-bold mt-1 ${
                  isIncome ? "text-success-ink" : "text-foreground"
                }`}
              >
                {isIncome ? "+" : "-"} {formatBRL(transaction.amount)}
              </p>
            </div>
            {transaction.status && (
              <Badge variant="secondary">{STATUS_LABEL[transaction.status]}</Badge>
            )}
          </div>

          <div className="rounded-lg border bg-muted/30 p-3 space-y-1">
            <p className="text-xs font-medium text-muted-foreground">Descrição</p>
            <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
              {transaction.description || (isIncome ? "Receita" : "Despesa")}
            </p>
          </div>

          <dl className="grid grid-cols-2 gap-3">
            <div>
              <dt className="text-xs text-muted-foreground">Data</dt>
              <dd className="font-medium mt-0.5">{displayDate}</dd>
            </div>
            {transaction.category && (
              <div>
                <dt className="text-xs text-muted-foreground">Categoria</dt>
                <dd className="font-medium mt-0.5">{transaction.category}</dd>
              </div>
            )}
            {transaction.customer_name && (
              <div className="col-span-2">
                <dt className="text-xs text-muted-foreground">Cliente</dt>
                <dd className="font-medium mt-0.5">{transaction.customer_name}</dd>
              </div>
            )}
            {transaction.supplier_name && (
              <div className="col-span-2">
                <dt className="text-xs text-muted-foreground">Fornecedor</dt>
                <dd className="font-medium mt-0.5">{transaction.supplier_name}</dd>
              </div>
            )}
            {transaction.due_date && transaction.status === "paid" && (
              <div>
                <dt className="text-xs text-muted-foreground">Vencimento</dt>
                <dd className="font-medium mt-0.5">
                  {formatDateBR(transaction.due_date)}
                </dd>
              </div>
            )}
            {transaction.source === "ofx_import" && (
              <div className="col-span-2">
                <Badge variant="outline" className="text-xs">
                  Importado via OFX
                </Badge>
              </div>
            )}
          </dl>
        </div>
      </DialogContent>
    </Dialog>
  )
}
