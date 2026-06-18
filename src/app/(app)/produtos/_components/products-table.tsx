"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import {
  Package,
  Wrench,
  MoreHorizontal,
  Pencil,
  Trash2,
  ChevronRight,
  AlertTriangle,
  Settings2,
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

import { deleteProductAction } from "@/lib/products/actions"
import { formatBRL } from "@/lib/utils/currency"
import { ListEmptyState } from "@/components/app/list-empty-state"
import type { ProductRowWithStats } from "@/lib/products/queries"

import { ProductDialog } from "./product-dialog"
import { StockAdjustmentDialog } from "./stock-adjustment-dialog"

export function ProductsTable({ rows }: { rows: ProductRowWithStats[] }) {
  const [editing, setEditing] = useState<ProductRowWithStats | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [adjusting, setAdjusting] = useState<ProductRowWithStats | null>(null)
  const [confirmDelete, setConfirmDelete] =
    useState<ProductRowWithStats | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleDelete() {
    if (!confirmDelete) return
    const row = confirmDelete
    setConfirmDelete(null)
    startTransition(async () => {
      const result = await deleteProductAction(row.id)
      if (!result.success) {
        toast.error(result.error)
        return
      }
      toast.success("Produto excluído.")
    })
  }

  if (rows.length === 0) {
    return (
      <>
        <ListEmptyState
          icon={Package}
          title="Sem produtos ou serviços"
          description="Cadastre itens do seu catálogo para registrar vendas com estoque e preço."
          action={{
            label: "Novo item",
            onClick: () => setCreateOpen(true),
          }}
        />
        <ProductDialog mode="create" open={createOpen} onOpenChange={setCreateOpen} />
      </>
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
              <TableHead className="hidden md:table-cell">SKU</TableHead>
              <TableHead className="text-right">Preço</TableHead>
              <TableHead className="text-right hidden lg:table-cell">
                Estoque
              </TableHead>
              <TableHead className="text-right hidden xl:table-cell">
                Vendido (total)
              </TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => {
              const isService = row.kind === "service"
              const Icon = isService ? Wrench : Package

              return (
                <TableRow
                  key={row.id}
                  className={!row.is_active ? "opacity-60" : "group"}
                >
                  <TableCell>
                    <div
                      className={`h-8 w-8 rounded-full flex items-center justify-center ${
                        isService
                          ? "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-200"
                          : "bg-brand-soft text-brand"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">
                    <Link
                      href={`/produtos/${row.id}`}
                      className="inline-flex items-center gap-1.5 hover:text-brand transition-colors"
                    >
                      {row.name}
                      {!row.is_active && (
                        <Badge variant="secondary" className="text-[10px]">
                          Inativo
                        </Badge>
                      )}
                      {row.is_low_stock && (
                        <span title="Estoque baixo">
                          <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                        </span>
                      )}
                      <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </Link>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-muted-foreground">
                    {row.sku ?? "—"}
                  </TableCell>
                  <TableCell className="text-right font-semibold whitespace-nowrap">
                    {formatBRL(row.price)}
                  </TableCell>
                  <TableCell className="text-right hidden lg:table-cell whitespace-nowrap">
                    {row.track_stock ? (
                      <span
                        className={
                          row.is_low_stock
                            ? "text-amber-600 font-medium"
                            : "text-foreground"
                        }
                      >
                        {row.stock_quantity} {row.unit}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        {isService ? "—" : "Sem controle"}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-right hidden xl:table-cell whitespace-nowrap">
                    {row.total_sold > 0 ? (
                      <span className="text-success-ink font-medium">
                        {formatBRL(row.total_sold)}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        Sem vendas
                      </span>
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
                          <Link href={`/produtos/${row.id}`}>
                            Ver detalhes
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setEditing(row)}>
                          <Pencil className="mr-2 h-4 w-4" />
                          Editar
                        </DropdownMenuItem>
                        {row.track_stock && (
                          <DropdownMenuItem onClick={() => setAdjusting(row)}>
                            <Settings2 className="mr-2 h-4 w-4" />
                            Ajustar estoque
                          </DropdownMenuItem>
                        )}
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
              )
            })}
          </TableBody>
        </Table>
      </div>

      {editing && (
        <ProductDialog
          mode="edit"
          open={!!editing}
          onOpenChange={(o) => !o && setEditing(null)}
          product={editing}
        />
      )}

      {adjusting && (
        <StockAdjustmentDialog
          open={!!adjusting}
          onOpenChange={(o) => !o && setAdjusting(null)}
          productId={adjusting.id}
          productName={adjusting.name}
          currentStock={adjusting.stock_quantity}
          unit={adjusting.unit}
        />
      )}

      <AlertDialog
        open={!!confirmDelete}
        onOpenChange={(o) => !o && setConfirmDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Excluir {confirmDelete?.name}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Se este produto tem vendas registradas, a exclusão será
              bloqueada — prefira inativá-lo nesses casos. Inativos não
              aparecem em novas vendas, mas o histórico permanece.
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
