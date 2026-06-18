"use client"

import { useMemo, useState, useTransition } from "react"
import Link from "next/link"
import {
  User,
  Users,
  MoreHorizontal,
  Pencil,
  Trash2,
  ChevronRight,
  Search,
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
import { ListEmptyState } from "@/components/app/list-empty-state"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import type { EmployeeRow } from "@/lib/employees/queries"
import { EmployeeDialog } from "./employee-dialog"

export function EmployeesTable({ rows }: { rows: EmployeeRow[] }) {
  const [editing, setEditing] = useState<EmployeeRow | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<EmployeeRow | null>(null)
  const [search, setSearch] = useState("")
  const [filter, setFilter] = useState<"all" | "active" | "inactive">("all")
  const [isPending, startTransition] = useTransition()

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return rows.filter((row) => {
      if (filter === "active" && !row.is_active) return false
      if (filter === "inactive" && row.is_active) return false
      if (!q) return true
      return (
        row.name.toLowerCase().includes(q) ||
        (row.role?.toLowerCase().includes(q) ?? false) ||
        (row.email?.toLowerCase().includes(q) ?? false)
      )
    })
  }, [rows, search, filter])
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
      <>
        <ListEmptyState
          icon={Users}
          title="Sem funcionários cadastrados"
          description="Adicione sua equipe para estimar a folha de pagamento e manter contatos."
          action={{
            label: "Novo funcionário",
            onClick: () => setCreateOpen(true),
          }}
        />
        <EmployeeDialog
          mode="create"
          open={createOpen}
          onOpenChange={setCreateOpen}
        />
      </>
    )
  }

  return (
    <>
      <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div className="relative max-w-sm w-full">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
            aria-hidden
          />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome, cargo ou e-mail…"
            className="pl-9"
            aria-label="Buscar funcionários"
          />
        </div>
        <div className="flex gap-1 rounded-lg border bg-muted/30 p-1">
          {(["all", "active", "inactive"] as const).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              className={cn(
                "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                filter === key
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {key === "all" ? "Todos" : key === "active" ? "Ativos" : "Inativos"}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border bg-muted/20 p-8 text-center text-sm text-muted-foreground">
          Nenhum funcionário encontrado com esse filtro.
        </div>
      ) : (
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
            {filtered.map((row) => (
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
      )}
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
