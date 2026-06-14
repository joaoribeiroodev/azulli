"use client"

import { useState, useTransition } from "react"
import {
  ArrowDownRight,
  ArrowUpRight,
  MoreHorizontal,
  Check,
  Trash2,
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
import {
  deleteTransactionAction,
  markAsPaidAction,
} from "@/lib/financial/transactions.actions"

import { IssueInvoiceButton } from "./issue-invoice-button"

type Row = {
  id: string
  type: "income" | "expense"
  amount: number
  status: "pending" | "paid" | "overdue"
  due_date: string
  description: string | null
  category: string | null
  customer_name: string | null
  supplier_name: string | null
  has_invoice?: boolean
}

type Props = {
  rows: Row[]
  allowsNFe?: boolean
}

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

export function TransactionsTable({ rows, allowsNFe = false }: Props) {
  const [confirmDelete, setConfirmDelete] = useState<Row | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleMarkPaid(row: Row) {
    startTransition(async () => {
      const result = await markAsPaidAction(row.id)
      if (!result.success) return toast.error(result.error)
      toast.success("Pago! ✅ Boa, mais uma fechada.")
    })
  }

  function handleDelete() {
    if (!confirmDelete) return
    const row = confirmDelete
    setConfirmDelete(null)
    startTransition(async () => {
      const result = await deleteTransactionAction(row.id)
      if (!result.success) return toast.error(result.error)
      toast.success("Lançamento excluído.")
    })
  }

  if (rows.length === 0) {
    return (
      <div className="rounded-xl border bg-card py-16 text-center">
        <p className="text-sm text-muted-foreground">
          Nenhum lançamento encontrado.
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Ajuste os filtros ou registre uma nova receita.
        </p>
      </div>
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
              <TableHead className="text-right hidden lg:table-cell">
                Nota
              </TableHead>
              <TableHead className="w-12"></TableHead>
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
                  <TableCell className="font-medium">
                    {row.description || (isIncome ? "Receita" : "Despesa")}
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
                  <TableCell className="text-right hidden lg:table-cell">
                    {isIncome && (
                      <IssueInvoiceButton
                        transactionId={row.id}
                        transactionStatus={row.status}
                        transactionType={row.type}
                        allowsNFe={allowsNFe}
                        hasExistingInvoice={row.has_invoice ?? false}
                      />
                    )}
                  </TableCell>
                  <TableCell>
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
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      <AlertDialog
        open={!!confirmDelete}
        onOpenChange={(o) => !o && setConfirmDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir lançamento?</AlertDialogTitle>
            <AlertDialogDescription>
              Essa ação não pode ser desfeita. Se houver nota fiscal vinculada,
              a exclusão será bloqueada.
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
    </>
  )
}
