"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Pencil, Trash2, User, MoreVertical } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
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

import { CustomerDialog } from "@/app/(app)/clientes/_components/customer-dialog"
import { deleteCustomerAction } from "@/lib/financial/customers.actions"
import type { CustomerDetail } from "@/lib/financial/queries"

export function CustomerHeader({ customer }: { customer: CustomerDetail }) {
  const router = useRouter()
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  async function handleDelete() {
    const result = await deleteCustomerAction(customer.id)
    if (!result.success) {
      toast.error(result.error)
      return
    }
    toast.success("Cliente excluído.")
    router.push("/clientes")
  }

  return (
    <header className="flex items-start justify-between gap-3 flex-wrap">
      <div className="flex items-center gap-3 sm:gap-4 min-w-0">
        <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-full bg-success-soft text-success-ink flex items-center justify-center shrink-0">
          <User className="h-5 w-5 sm:h-6 sm:w-6" />
        </div>
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-display font-bold text-brand-ink truncate">
            {customer.name}
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 sm:mt-1">
            Cliente desde{" "}
            {new Date(customer.created_at).toLocaleDateString("pt-BR", {
              month: "long",
              year: "numeric",
            })}
          </p>
        </div>
      </div>

      {/* Mobile: dropdown ⋯ */}
      <div className="sm:hidden">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon" aria-label="Ações">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setEditOpen(true)}>
              <Pencil className="mr-2 h-4 w-4" />
              Editar
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => setDeleteOpen(true)}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Excluir
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Desktop: botões */}
      <div className="hidden sm:flex gap-2 flex-wrap">
        <Button
          variant="outline"
          onClick={() => setEditOpen(true)}
          className="gap-2"
        >
          <Pencil className="h-4 w-4" />
          Editar
        </Button>
        <Button
          variant="outline"
          onClick={() => setDeleteOpen(true)}
          className="gap-2 text-destructive hover:text-destructive"
        >
          <Trash2 className="h-4 w-4" />
          Excluir
        </Button>
      </div>

      <CustomerDialog
        mode="edit"
        open={editOpen}
        onOpenChange={setEditOpen}
        customer={customer}
      />

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir {customer.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              Se houver lançamentos vinculados, a exclusão será bloqueada.
              Considere apenas remover a vinculação dos lançamentos antes.
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
    </header>
  )
}
