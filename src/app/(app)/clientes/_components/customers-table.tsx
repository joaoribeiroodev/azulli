"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import {
  Mail,
  Phone,
  MoreHorizontal,
  Pencil,
  Trash2,
  ChevronRight,
  Users,
} from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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

import { deleteCustomerAction } from "@/lib/financial/customers.actions"
import { formatBRL } from "@/lib/utils/currency"
import { ListEmptyState } from "@/components/app/list-empty-state"
import type { CustomerRowWithTotals } from "@/lib/financial/queries"
import { CustomerDialog } from "./customer-dialog"

export function CustomersTable({ rows }: { rows: CustomerRowWithTotals[] }) {
  const [editing, setEditing] = useState<CustomerRowWithTotals | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] =
    useState<CustomerRowWithTotals | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleDelete() {
    if (!confirmDelete) return
    const row = confirmDelete
    setConfirmDelete(null)
    startTransition(async () => {
      const result = await deleteCustomerAction(row.id)
      if (!result.success) {
        toast.error(result.error)
        return
      }
      toast.success("Cliente excluído.")
    })
  }

  if (rows.length === 0) {
    return (
      <>
        <ListEmptyState
          icon={Users}
          title="Sem clientes cadastrados"
          description="Cadastre clientes para vincular vendas e acompanhar quem mais compra de você."
          action={{
            label: "Novo cliente",
            onClick: () => setCreateOpen(true),
          }}
        />
        <CustomerDialog
          mode="create"
          open={createOpen}
          onOpenChange={setCreateOpen}
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
              <TableHead>Nome</TableHead>
              <TableHead className="hidden md:table-cell">E-mail</TableHead>
              <TableHead className="hidden lg:table-cell">Telefone</TableHead>
              <TableHead className="text-right">Total recebido</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.id} className="group">
                <TableCell className="font-medium">
                  <Link
                    href={`/clientes/${row.id}`}
                    className="inline-flex items-center gap-1 hover:text-brand transition-colors"
                  >
                    {row.name}
                    <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </Link>
                </TableCell>
                <TableCell className="hidden md:table-cell text-muted-foreground">
                  {row.email ? (
                    <span className="inline-flex items-center gap-1.5">
                      <Mail className="h-3.5 w-3.5" />
                      {row.email}
                    </span>
                  ) : (
                    "—"
                  )}
                </TableCell>
                <TableCell className="hidden lg:table-cell text-muted-foreground">
                  {row.phone ? (
                    <span className="inline-flex items-center gap-1.5">
                      <Phone className="h-3.5 w-3.5" />
                      {row.phone}
                    </span>
                  ) : (
                    "—"
                  )}
                </TableCell>
                <TableCell className="text-right">
                  {row.total_received > 0 ? (
                    <span className="font-semibold text-success-ink">
                      {formatBRL(row.total_received)}
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground">
                      Sem receitas
                    </span>
                  )}
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" disabled={isPending}>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link href={`/clientes/${row.id}`}>
                          Ver detalhes
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setEditing(row)}>
                        <Pencil className="mr-2 h-4 w-4" />
                        Editar
                      </DropdownMenuItem>
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
            ))}
          </TableBody>
        </Table>
      </div>

      {editing && (
        <CustomerDialog
          mode="edit"
          open={!!editing}
          onOpenChange={(o) => !o && setEditing(null)}
          customer={editing}
        />
      )}

      <AlertDialog
        open={!!confirmDelete}
        onOpenChange={(o) => !o && setConfirmDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir cliente?</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDelete?.name} será removido. Lançamentos vinculados
              perdem a referência ao cliente, mas continuam no histórico.
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