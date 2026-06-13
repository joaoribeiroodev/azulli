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

type Row = {
  id: string
  type: "income" | "expense"
  amount: number
  status: "pending" | "paid" | "overdue"
  due_date: string
  description: string | null
  customer_name: string | null
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

export function TransactionsTable({ rows }: { rows: Row[] }) {
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
              <TableHead className="hidden md:table-cell">Cliente</TableHead>
              <TableHead>Data</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Valor</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => {
              const isIncome = row.type === "income"
              const Icon = isIncome ? ArrowUpRight : ArrowDownRight
              const statusStyle = STATUS_STYLES[row.status]

              return (
                <TableRow key={row.id}>
                  <TableCell>
                    <div
                      className={`h-8 w-8 rounded-full flex items-center justify-center ${
                        isIncome
                          ? "bg-success-soft text-success-ink"
                          : "bg-red-50 text-destructive"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">
                    {row.description || (isIncome ? "Receita" : "Despesa")}
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-muted-foreground">
                    {row.customer_name ?? "—"}
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
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" disabled={isPending}>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {row.status !== "paid" && (
                          <DropdownMenuItem onClick={() => handleMarkPaid(row)}>
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
              Essa ação não pode ser desfeita. Se houver nota fiscal vinculada, a
              exclusão será bloqueada.
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
