"use client"

import { useState } from "react"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ProductDialog } from "./product-dialog"

export function ProductsHeader() {
  const [open, setOpen] = useState(false)

  return (
    <header className="flex items-start justify-between gap-4 flex-wrap">
      <div>
        <h1 className="text-2xl lg:text-3xl font-display font-bold text-brand-ink">
          Produtos e Serviços
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Seu catálogo. Cadastre produtos com estoque ou serviços intangíveis.
        </p>
      </div>

      <Button
        onClick={() => setOpen(true)}
        className="bg-brand hover:bg-brand-hover gap-2"
      >
        <Plus className="h-4 w-4" />
        Novo item
      </Button>

      <ProductDialog mode="create" open={open} onOpenChange={setOpen} />
    </header>
  )
}
