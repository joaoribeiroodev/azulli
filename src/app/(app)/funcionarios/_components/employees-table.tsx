"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import {
  User,
  Users,
  MoreHorizontal,
  Pencil,
  Trash2,
  ChevronRight,
} from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
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
  DropdownMenuSeparator,
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

import { deleteEmployeeAction } from "@/lib/employees/actions"
import { formatBRL } from "@/lib/utils/currency"
import { formatDateBR } from "@/lib/utils/date"
import type { EmployeeRow } from "@/lib/employees/queries"

import { EmployeeDialog } from "./employee-dialog"

export function EmployeesTable({ rows }: { rows: EmployeeRow[] }) {
  const [editing, setEditing] = useState<EmployeeRow | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<EmployeeRow | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleDelete() {
    if (!confirmDelete) return
    const row = confirmDelete
    setConfirmDelete(null)
    startTransition(async () => {
      const result = await deleteEmployeeAction(row.id)
      if (!result.success) {
        toast.error(result.error)
        return
      }
      toast.success("Funcionário excluído.")
    })
  }

  if (rows.length === 0) {
    return (
      <div className="rounded-xl border bg-card py-16 text-center">
        <Users className="h-10 w-10 text-muted-foreground/40 mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">
          Nenhum funcionário cadastrado.
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Comece adicionando o primeiro membro da equipe.
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
              <TableHead>Nome</TableHead>
              <TableHead className="hidden md:table-cell">Cargo</TableHead>
              <TableHead className="hidden lg:table-cell">Contato</TableHead>
              <TableHead className="hidden xl:table-cell">Admissão</TableHead>
              <TableHead className="text-right">Salário</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow
                key={row.id}
                className={!row.is_active ? "opacity-60" : "group"}
              >
                <TableCell>
                  <div className="h-8 w-8 rounded-full bg-brand-soft text-brand flex items-center justify-center">
                    <User className="h-4 w-4" />
                  </div>
                </TableCell>
                <TableCell className="font-medium">
                  <Link
                    href={`/funcionarios/${row.id}`}
                    className="inline-flex items-center gap-1.5 hover:text-brand transition-colors"
                  >
                    {row.name}
                    {!row.is_active && (
                      <Badge variant="secondary" className="text-[10px]">
                        Inativo
                      </Badge>
                    )}
                    <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </Link>
                </TableCell>
                <TableCell className="hidden md:table-cell text-muted-foreground">
                  {row.role ?? "—"}
                </TableCell>
                <TableCell className="hidden lg:table-cell text-muted-foreground text-xs">
                  {row.email ?? row.phone ?? "—"}
                </TableCell>
                <TableCell className="hidden xl:table-cell text-muted-foreground text-xs">
                  {row.hire_date ? formatDateBR(row.hire_date) : "—"}
                </TableCell>
                <TableCell className="text-right whitespace-nowrap">
                  {row.salary ? (
                    <span className="font-medium">{formatBRL(row.salary)}</span>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
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
                      <DropdownMenuItem asChild>
                        <Link href={`/funcionarios/${row.id}`}>
                          Ver detalhes
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setEditing(row)}>
                        <Pencil className="mr-2 h-4 w-4" />
                        Editar
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
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
        <EmployeeDialog
          mode="edit"
          open={!!editing}
          onOpenChange={(o) => !o && setEditing(null)}
          employee={editing}
        />
      )}

      <AlertDialog
        open={!!confirmDelete}
        onOpenChange={(o) => !o && setConfirmDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir {confirmDelete?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              Essa ação não pode ser desfeita. Para preservar histórico,
              considere inativar o funcionário em vez de excluir.
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
