"use client"

import { useTransition } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { Loader2, Plus, Minus } from "lucide-react"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"

import {
  stockAdjustmentSchema,
  type StockAdjustmentInput,
} from "@/lib/products/schemas"
import { adjustStockAction } from "@/lib/products/actions"

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  productId: string
  productName: string
  currentStock: number
  unit: string
}

export function StockAdjustmentDialog({
  open,
  onOpenChange,
  productId,
  productName,
  currentStock,
  unit,
}: Props) {
  const [isPending, startTransition] = useTransition()

  const form = useForm<StockAdjustmentInput>({
    resolver: zodResolver(stockAdjustmentSchema),
    defaultValues: {
      product_id: productId,
      kind: "adjustment_in",
      quantity: 0,
      notes: "",
    },
  })

  const kind = form.watch("kind")
  const quantity = form.watch("quantity") || 0
  const newStock =
    kind === "adjustment_in" ? currentStock + quantity : currentStock - quantity

  function onSubmit(values: StockAdjustmentInput) {
    startTransition(async () => {
      const result = await adjustStockAction(values)
      if (!result.success) return toast.error(result.error)
      toast.success("Estoque ajustado! 📦")
      onOpenChange(false)
      form.reset({
        product_id: productId,
        kind: "adjustment_in",
        quantity: 0,
        notes: "",
      })
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">Ajustar estoque</DialogTitle>
          <DialogDescription>
            {productName} · atual: {currentStock} {unit}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="kind"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de ajuste</FormLabel>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => field.onChange("adjustment_in")}
                      className={`flex items-center justify-center gap-2 rounded-lg border-2 p-3 transition-colors ${
                        field.value === "adjustment_in"
                          ? "border-success bg-success-soft/30 text-success-ink"
                          : "border-border text-muted-foreground hover:border-muted-foreground"
                      }`}
                    >
                      <Plus className="h-4 w-4" />
                      <span className="text-sm font-medium">Entrada</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => field.onChange("adjustment_out")}
                      className={`flex items-center justify-center gap-2 rounded-lg border-2 p-3 transition-colors ${
                        field.value === "adjustment_out"
                          ? "border-destructive bg-red-50 text-destructive dark:bg-red-950/30"
                          : "border-border text-muted-foreground hover:border-muted-foreground"
                      }`}
                    >
                      <Minus className="h-4 w-4" />
                      <span className="text-sm font-medium">Saída</span>
                    </button>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="quantity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Quantidade ({unit})</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.001"
                      min="0"
                      placeholder="0"
                      {...field}
                      value={field.value ?? 0}
                      onChange={(e) =>
                        field.onChange(parseFloat(e.target.value) || 0)
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {quantity > 0 && (
              <div className="rounded-lg bg-muted px-3 py-2 text-sm">
                <p className="text-muted-foreground">
                  Estoque após ajuste:{" "}
                  <span
                    className={`font-semibold ${
                      newStock < 0 ? "text-destructive" : "text-foreground"
                    }`}
                  >
                    {newStock} {unit}
                  </span>
                </p>
                {newStock < 0 && (
                  <p className="text-xs text-destructive mt-0.5">
                    ⚠️ Estoque ficaria negativo. Operação será bloqueada.
                  </p>
                )}
              </div>
            )}

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Motivo (opcional)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Ex: perda por validade, contagem física..."
                      {...field}
                      value={field.value ?? ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isPending || quantity <= 0 || newStock < 0}
                className="bg-brand hover:bg-brand-hover"
              >
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Confirmar ajuste
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
