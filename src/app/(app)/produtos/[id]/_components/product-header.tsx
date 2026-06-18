"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  Pencil,
  Settings2,
  Package,
  Wrench,
  Trash2,
  MoreVertical,
} from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
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

import { ProductDialog } from "@/app/(app)/produtos/_components/product-dialog"
import { StockAdjustmentDialog } from "@/app/(app)/produtos/_components/stock-adjustment-dialog"
import { deleteProductAction } from "@/lib/products/actions"
import type { ProductDetail } from "@/lib/products/queries"

export function ProductHeader({ product }: { product: ProductDetail }) {
  const router = useRouter()
  const [editOpen, setEditOpen] = useState(false)
  const [adjustOpen, setAdjustOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  const isService = product.kind === "service"
  const Icon = isService ? Wrench : Package

  async function handleDelete() {
    const result = await deleteProductAction(product.id)
    if (!result.success) {
      toast.error(result.error)
      return
    }
    toast.success("Produto excluído.")
    router.push("/produtos")
  }

  return (
    <header className="flex items-start justify-between gap-3 flex-wrap">
      <div className="flex items-center gap-3 sm:gap-4 min-w-0">
        <div
          className={`h-12 w-12 sm:h-14 sm:w-14 rounded-full flex items-center justify-center shrink-0 ${
            isService
              ? "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-200"
              : "bg-brand-soft text-brand"
          }`}
        >
          <Icon className="h-5 w-5 sm:h-6 sm:w-6" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-display font-bold text-brand-ink truncate">
              {product.name}
            </h1>
            {!product.is_active && (
              <Badge variant="secondary">Inativo</Badge>
            )}
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 sm:mt-1">
            {isService ? "Serviço" : "Produto"}
            {product.sku && ` · SKU ${product.sku}`}
          </p>
        </div>
      </div>

      {/* Mobile: tudo num dropdown */}
      <div className="sm:hidden">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon" aria-label="Ações">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {product.track_stock && (
              <>
                <DropdownMenuItem onClick={() => setAdjustOpen(true)}>
                  <Settings2 className="mr-2 h-4 w-4" />
                  Ajustar estoque
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </>
            )}
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
        {product.track_stock && (
          <Button
            variant="outline"
            onClick={() => setAdjustOpen(true)}
            className="gap-2"
          >
            <Settings2 className="h-4 w-4" />
            Ajustar estoque
          </Button>
        )}
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

      <ProductDialog
        mode="edit"
        open={editOpen}
        onOpenChange={setEditOpen}
        product={product}
      />

      {product.track_stock && (
        <StockAdjustmentDialog
          open={adjustOpen}
          onOpenChange={setAdjustOpen}
          productId={product.id}
          productName={product.name}
          currentStock={product.stock_quantity}
          unit={product.unit}
        />
      )}

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir {product.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              Se houver vendas registradas, a exclusão será bloqueada — nesse
              caso, prefira inativá-lo. Inativos não aparecem em novas vendas.
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
