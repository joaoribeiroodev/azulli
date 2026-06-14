"use client"

import { useState } from "react"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { SupplierDialog } from "./supplier-dialog"

export function SuppliersHeader() {
  const [open, setOpen] = useState(false)

  return (
    <header className="flex items-start justify-between gap-4 flex-wrap">
      <div>
        <h1 className="text-2xl lg:text-3xl font-display font-bold text-brand-ink">
          Fornecedores
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          De quem você compra. Mantenha contato e histórico de pagamentos.
        </p>
      </div>

      <Button
        onClick={() => setOpen(true)}
        className="bg-brand hover:bg-brand-hover gap-2"
      >
        <Plus className="h-4 w-4" />
        Novo fornecedor
      </Button>

      <SupplierDialog mode="create" open={open} onOpenChange={setOpen} />
    </header>
  )
}
