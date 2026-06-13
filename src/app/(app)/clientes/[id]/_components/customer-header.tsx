"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Pencil, Trash2, Plus } from "lucide-react"
import { toast } from "sonner"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
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
import { TransactionDialog } from "@/components/app/transaction-dialog"
import { deleteCustomerAction } from "@/lib/financial/customers.actions"
import type { CustomerDetail } from "@/lib/financial/queries"

export function CustomerHeader({ customer }: { customer: CustomerDetail }) {
  const router = useRouter()
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [newIncomeOpen, setNewIncomeOpen] = useState(false)

  const initials = customer.name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase()

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
    <header className="flex items-start justify-between gap-4 flex-wrap">
      <div className="flex items-center gap-4">
        <Avatar className="h-14 w-14">
          <AvatarFallback className="bg-brand text-primary-foreground text-lg font-semibold">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div>
          <h1 className="text-2xl lg:text-3xl font-display font-bold text-brand-ink">
            {customer.name}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Cliente desde{" "}
            {new Date(customer.created_at).toLocaleDateString("pt-BR", {
              month: "long",
              year: "numeric",
            })}
          </p>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
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
        <Button
          onClick={() => setNewIncomeOpen(true)}
          className="bg-brand hover:bg-brand-hover gap-2"
        >
          <Plus className="h-4 w-4" />
          Nova receita
        </Button>
      </div>

      <CustomerDialog
        mode="edit"
        open={editOpen}
        onOpenChange={setEditOpen}
        customer={customer}
      />

      <TransactionDialog
        open={newIncomeOpen}
        type="income"
        onOpenChange={setNewIncomeOpen}
        customers={[{ id: customer.id, name: customer.name }]}
        defaultCustomerId={customer.id}
      />

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir {customer.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              O cliente será removido. Lançamentos vinculados perdem a
              referência, mas continuam no histórico.
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
