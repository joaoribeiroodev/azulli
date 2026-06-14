"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Pencil, Trash2, ArrowDownRight } from "lucide-react"
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

import { SupplierDialog } from "@/app/(app)/fornecedores/_components/supplier-dialog"
import { TransactionDialog } from "@/components/app/transaction-dialog"
import { deleteSupplierAction } from "@/lib/financial/suppliers.actions"
import type { SupplierDetail } from "@/lib/financial/queries"

export function SupplierHeader({ supplier }: { supplier: SupplierDetail }) {
  const router = useRouter()
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [newExpenseOpen, setNewExpenseOpen] = useState(false)

  const initials = supplier.name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase()

  async function handleDelete() {
    const result = await deleteSupplierAction(supplier.id)
    if (!result.success) {
      toast.error(result.error)
      return
    }
    toast.success("Fornecedor excluído.")
    router.push("/fornecedores")
  }

  return (
    <header className="flex items-start justify-between gap-4 flex-wrap">
      <div className="flex items-center gap-4">
        <Avatar className="h-14 w-14">
          <AvatarFallback className="bg-foreground text-background text-lg font-semibold">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div>
          <h1 className="text-2xl lg:text-3xl font-display font-bold text-brand-ink">
            {supplier.name}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Fornecedor desde{" "}
            {new Date(supplier.created_at).toLocaleDateString("pt-BR", {
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
          onClick={() => setNewExpenseOpen(true)}
          className="bg-brand hover:bg-brand-hover gap-2"
        >
          <ArrowDownRight className="h-4 w-4" />
          Nova despesa
        </Button>
      </div>

      <SupplierDialog
        mode="edit"
        open={editOpen}
        onOpenChange={setEditOpen}
        supplier={supplier}
      />

      <TransactionDialog
        open={newExpenseOpen}
        type="expense"
        onOpenChange={setNewExpenseOpen}
        suppliers={[{ id: supplier.id, name: supplier.name }]}
        defaultSupplierId={supplier.id}
      />

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir {supplier.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              O fornecedor será removido. Despesas vinculadas perdem a
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
