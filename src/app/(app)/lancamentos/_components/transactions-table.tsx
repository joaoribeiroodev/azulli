"use client"

import { useState, useTransition } from "react"
import {
  ArrowDownRight,
  ArrowUpRight,
  MoreHorizontal,
  Check,
  Trash2,
  Receipt,
} from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

import { formatBRL } from "@/lib/utils/currency"
import { formatDateBR } from "@/lib/utils/date"
import { ListEmptyState } from "@/components/app/list-empty-state"
import { TransactionDialog } from "@/components/app/transaction-dialog"
import {
  TransactionDetailDialog,
  type TransactionDetailData,
} from "@/components/app/transaction-detail-dialog"
import type { ProductLite } from "@/lib/products/queries"
import {
  deleteTransactionAction,
  markAsPaidAction,
} from "@/lib/financial/transactions.actions"

type Row = {
  id: string
  type: "income" | "expense"
  amount: number
  status: "pending" | "paid" | "overdue"
  due_date: string
  paid_at?: string | null
  description: string | null
  category: string | null
  customer_name: string | null
  supplier_name: string | null
  source?: string | null
}

type Party = { id: string; name: string }

type Props = {
  rows: Row[]
  hasActiveFilters?: boolean
  customers?: Party[]
  suppliers?: Party[]
  products?: ProductLite[]
  recentIncomeCategories?: string[]
  recentExpenseCategories?: string[]
  readOnly?: boolean
}

const DESC_PREVIEW_LEN = 48

const STATUS_STYLES: Record<
  Row["status"],
  { label: string; className: string }
> = {
  paid: {
    label: "Pago",
    className: "bg-success-soft text-success-ink hover:bg-success-soft",
  },
  pending: {
    label: "Pendente",
    className: "bg-amber-100 text-amber-800 hover:bg-amber-100",
  },
  overdue: {
    label: "Vencido",
    className: "bg-red-100 text-red-800 hover:bg-red-100",
  },
}

export function TransactionsTable({
  rows,
  hasActiveFilters = false,
  customers = [],
  suppliers = [],
  products = [],
  recentIncomeCategories = [],
  recentExpenseCategories = [],
  readOnly = false,
}: Props) {
  const [confirmDelete, setConfirmDelete] = useState<Row | null>(null)
  const [detailRow, setDetailRow] = useState<TransactionDetailData | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [createOpen, setCreateOpen] = useState<"income" | "expense" | null>(
    null
  )
  const [isPending, startTransition] = useTransition()

  function openDetail(row: Row) {
    setDetailRow({
      type: row.type,
      amount: row.amount,
      status: row.status,
      due_date: row.due_date,
      paid_at: row.paid_at,
      description: row.description,
      category: row.category,
      customer_name: row.customer_name,
      supplier_name: row.supplier_name,
      source: row.source,
    })
    setDetailOpen(true)
  }

  function handleMarkPaid(row: Row) {
    startTransition(async () => {
      const result = await markAsPaidAction(row.id)
      if (!result.success) {
        toast.error(result.error)
        return
      }
      toast.success("Pago! ✅ Boa, mais uma fechada.")
    })
  }

  function handleDelete() {
    if (!confirmDelete) return
    const row = confirmDelete
    setConfirmDelete(null)
    startTransition(async () => {
      const result = await deleteTransactionAction(row.id)
      if (!result.success) {
        toast.error(result.error)
        return
      }
      toast.success("Lançamento excluído.")
    })
  }

  if (rows.length === 0) {
    if (hasActiveFilters) {
      return (
        <ListEmptyState
          icon={Receipt}
          title="Nenhum lançamento encontrado"
          description="Nenhum resultado com os filtros atuais. Tente ampliar o período ou limpar os filtros."
        />
      )
    }

    return (
      <>
        <ListEmptyState
          icon={Receipt}
          title="Sem lançamentos ainda"
          description="Registre receitas e despesas para ver o fluxo de caixa e relatórios."
          action={{
            label: "Nova receita",
            onClick: () => setCreateOpen("income"),
          }}
          secondaryAction={{
            label: "Importar OFX",
            href: "/lancamentos/importar",
          }}
        />
        <TransactionDialog
          open={createOpen !== null}
          type={createOpen ?? "income"}
          onOpenChange={(open) => !open && setCreateOpen(null)}
          customers={customers}
          suppliers={suppliers}
          products={products}
          recentCategories={
            createOpen === "income"
              ? recentIncomeCategories
              : recentExpenseCategories
          }
        />
      </>
    )
  }

  return (
    <>
      <div className="rounded-xl border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12"></TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead className="hidden md:table-cell">
                Cliente / Fornecedor
              </TableHead>
              <TableHead className="hidden xl:table-cell">Categoria</TableHead>
              <TableHead>Data</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Valor</TableHead>
              {!readOnly && <TableHead className="w-12"></TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => {
              const isIncome = row.type === "income"
              const Icon = isIncome ? ArrowUpRight : ArrowDownRight
              const statusStyle = STATUS_STYLES[row.status]
              const partyName = isIncome
                ? row.customer_name
                : row.supplier_name
              const desc = row.description || (isIncome ? "Receita" : "Despesa")
              const showDetailLink =
                desc.length > DESC_PREVIEW_LEN || row.source === "ofx_import"

              return (
                <TableRow key={row.id}>
                  <TableCell>
                    <div
                      className={`h-8 w-8 rounded-full flex items-center justify-center ${
                        isIncome
                          ? "bg-success-soft text-success-ink"
                          : "bg-red-50 text-destructive dark:bg-red-950/40"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="max-w-[200px] md:max-w-[280px]">
                      <p className="font-medium truncate">{desc}</p>
                      {showDetailLink && (
                        <button
                          type="button"
                          onClick={() => openDetail(row)}
                          className="text-xs text-brand hover:text-brand-hover hover:underline mt-0.5"
                        >
                          Ver detalhes
                        </button>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-muted-foreground">
                    {partyName ? (
                      <span className="inline-flex items-center gap-1.5">
                        <span
                          className={`text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded ${
                            isIncome
                              ? "bg-success-soft text-success-ink"
                              : "bg-brand-soft text-brand"
                          }`}
                        >
                          {isIncome ? "Cliente" : "Forn."}
                        </span>
                        {partyName}
                      </span>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell className="hidden xl:table-cell">
                    {row.category ? (
                      <Badge
                        variant="secondary"
                        className="bg-muted text-foreground hover:bg-muted font-normal"
                      >
                        {row.category}
                      </Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground whitespace-nowrap">
                    {formatDateBR(row.due_date)}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className={statusStyle.className}>
                      {statusStyle.label}
                    </Badge>
                  </TableCell>
                  <TableCell
                    className={`text-right font-semibold whitespace-nowrap ${
                      isIncome ? "text-success-ink" : "text-foreground"
                    }`}
                  >
                    {isIncome ? "+" : "-"} {formatBRL(row.amount)}
                  </TableCell>
                  <TableCell>
                    {readOnly ? null : (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={isPending}
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {row.status !== "paid" && (
                            <DropdownMenuItem
                              onClick={() => handleMarkPaid(row)}
                            >
                              <Check className="mr-2 h-4 w-4" />
                              Marcar como pago
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => setConfirmDelete(row)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      <TransactionDetailDialog
        open={detailOpen}
        onOpenChange={setDetailOpen}
        transaction={detailRow}
      />

      {!readOnly && (
      <AlertDialog
        open={!!confirmDelete}
        onOpenChange={(o) => !o && setConfirmDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir lançamento?</AlertDialogTitle>
            <AlertDialogDescription>
              Essa ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      )}
    </>
  )
}
