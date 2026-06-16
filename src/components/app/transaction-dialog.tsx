"use client"

import { useEffect, useState, useTransition } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { Loader2, ShoppingBag } from "lucide-react"

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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import {
  createTransactionSchema,
  type CreateTransactionInput,
} from "@/lib/financial/schemas"
import { createTransactionAction } from "@/lib/financial/transactions.actions"
import { maskBRL, parseBRL } from "@/lib/utils/currency"
import { cn } from "@/lib/utils"

import { CategoryCombobox } from "@/components/app/category-combobox"
import { TransactionItemsBuilder } from "@/components/app/transaction-items-builder"
import type { ProductLite } from "@/lib/products/queries"

type Party = { id: string; name: string }

type Props = {
  open: boolean
  type: "income" | "expense"
  onOpenChange: (open: boolean) => void
  customers?: Party[]
  suppliers?: Party[]
  products?: ProductLite[]
  defaultCustomerId?: string | null
  defaultSupplierId?: string | null
  defaultProductId?: string | null
  recentCategories?: string[]
}

function formatProductLabel(p: ProductLite): string {
  if (p.track_stock) {
    return `${p.name} (${p.stock_quantity} ${p.unit})`
  }
  return p.name
}

export function TransactionDialog({
  open,
  type,
  onOpenChange,
  customers = [],
  suppliers = [],
  products = [],
  defaultCustomerId = null,
  defaultSupplierId = null,
  defaultProductId = null,
  recentCategories = [],
}: Props) {
  const [isPending, startTransition] = useTransition()
  const [amountDisplay, setAmountDisplay] = useState("")
  const [multiItem, setMultiItem] = useState(false)

  const form = useForm<CreateTransactionInput>({
    resolver: zodResolver(createTransactionSchema),
    defaultValues: {
      type,
      amount: 0,
      due_date: new Date().toISOString().slice(0, 10),
      description: "",
      customer_id: null,
      supplier_id: null,
      product_id: null,
      items: undefined,
      category: null,
      status: "pending",
    },
  })

  const watchedItems = form.watch("items")
  const watchedProductId = form.watch("product_id")

  useEffect(() => {
    if (multiItem) {
      form.setValue("product_id", null)
      if (!form.getValues("items")) {
        form.setValue("items", [])
      }
    } else {
      form.setValue("items", undefined)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [multiItem])

  useEffect(() => {
    if (multiItem && watchedItems) {
      const total = watchedItems.reduce(
        (sum, i) => sum + (i.quantity || 0) * (i.unit_price || 0),
        0
      )
      form.setValue("amount", total)
      setAmountDisplay(total > 0 ? formatToInput(total) : "")
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchedItems, multiItem])

  useEffect(() => {
    if (!multiItem && watchedProductId) {
      const product = products.find((p) => p.id === watchedProductId)
      if (product && form.getValues("amount") === 0) {
        form.setValue("amount", product.price)
        setAmountDisplay(formatToInput(product.price))
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchedProductId])

  useEffect(() => {
    if (open) {
      form.reset({
        type,
        amount: 0,
        due_date: new Date().toISOString().slice(0, 10),
        description: "",
        customer_id: type === "income" ? defaultCustomerId : null,
        supplier_id: type === "expense" ? defaultSupplierId : null,
        product_id: defaultProductId,
        items: undefined,
        category: null,
        status: "pending",
      })
      setAmountDisplay("")
      setMultiItem(false)
    }
  }, [
    open,
    type,
    defaultCustomerId,
    defaultSupplierId,
    defaultProductId,
    form,
  ])

  const isIncome = type === "income"

  function onSubmit(values: CreateTransactionInput) {
    startTransition(async () => {
      const result = await createTransactionAction(values)
      if (!result.success) {
        toast.error(result.error)
        return
      }
      toast.success(
        isIncome
          ? values.status === "paid"
            ? "Dinheiro na conta! 💰 Venda registrada."
            : "Receita agendada. ✅"
          : values.status === "paid"
            ? "Despesa paga registrada. 📝"
            : "Despesa registrada. 📝"
      )
      onOpenChange(false)
    })
  }

  const hasProducts = products.length > 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display">
            {isIncome ? "Nova receita" : "Nova despesa"}
          </DialogTitle>
          <DialogDescription>
            {isIncome
              ? "Registre uma entrada de dinheiro."
              : "Registre uma saída de dinheiro."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/*
              Switch "Múltiplos itens" com feedback visual claro:
              - OFF: bg-muted/30 (neutro)
              - ON: border-brand + bg-brand-soft (destacado, mostra que está ativo)
              - Transition de 300ms suave
            */}
            {hasProducts && (
              <div
                className={cn(
                  "flex flex-row items-center justify-between rounded-lg border p-3 transition-all duration-300",
                  multiItem
                    ? "border-brand bg-brand-soft/30"
                    : "border-border bg-muted/30 hover:bg-muted/50"
                )}
              >
                <label
                  htmlFor="multi-item-switch"
                  className="flex-1 cursor-pointer mr-3 space-y-1"
                >
                  <span className="flex items-center gap-1.5 text-sm font-medium leading-none">
                    <ShoppingBag
                      className={cn(
                        "h-4 w-4 transition-colors",
                        multiItem && "text-brand"
                      )}
                    />
                    Múltiplos itens
                    {multiItem && (
                      <span className="inline-flex items-center text-[10px] font-semibold uppercase tracking-wide text-brand bg-brand-soft px-1.5 py-0.5 rounded animate-in fade-in zoom-in-95 duration-200">
                        Ativo
                      </span>
                    )}
                  </span>
                  <span className="block text-[11px] text-muted-foreground">
                    {multiItem
                      ? "Adicione vários produtos. Valor é calculado."
                      : isIncome
                        ? "Para vendas com mais de um produto"
                        : "Para repor estoque de múltiplos produtos"}
                  </span>
                </label>
                <Switch
                  id="multi-item-switch"
                  checked={multiItem}
                  onCheckedChange={setMultiItem}
                />
              </div>
            )}

            {multiItem && hasProducts && (
              <div className="animate-in fade-in-50 slide-in-from-top-2 duration-300">
                <FormField
                  control={form.control}
                  name="items"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{isIncome ? "Itens da venda" : "Itens da compra (Estoque)"}</FormLabel>
                      <FormControl>
                        <TransactionItemsBuilder
                          products={products}
                          value={field.value ?? []}
                          onChange={field.onChange}
                          type={type}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            {!multiItem && (
              <div className="animate-in fade-in-50 duration-200">
                <FormField
                  control={form.control}
                  name="amount"
                  render={() => (
                    <FormItem>
                      <FormLabel>Valor</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                            R$
                          </span>
                          <Input
                            type="text"
                            inputMode="numeric"
                            placeholder="0,00"
                            className="pl-9"
                            value={amountDisplay}
                            onChange={(e) => {
                              const masked = maskBRL(e.target.value)
                              setAmountDisplay(masked)
                              form.setValue("amount", parseBRL(masked), {
                                shouldValidate: true,
                              })
                            }}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {hasProducts && (
                  <FormField
                    control={form.control}
                    name="product_id"
                    render={({ field }) => (
                      <FormItem className="mt-4">
                        <FormLabel>Produto / Serviço (opcional)</FormLabel>
                        <Select
                          value={field.value ?? "_none"}
                          onValueChange={(v) =>
                            field.onChange(v === "_none" ? null : v)
                          }
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="_none">Sem produto</SelectItem>
                            {products.map((p) => (
                              <SelectItem key={p.id} value={p.id}>
                                {formatProductLabel(p)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormDescription className="text-xs">
                          Selecionar atualiza estoque ao marcar como pago
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </div>
            )}

            <FormField
              control={form.control}
              name="due_date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Data</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={isIncome ? "Venda do mês" : "Conta de luz"}
                      {...field}
                      value={field.value ?? ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Categoria (opcional)</FormLabel>
                  <FormControl>
                    <CategoryCombobox
                      value={field.value ?? null}
                      onChange={field.onChange}
                      type={type}
                      recentCategories={recentCategories}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {isIncome && customers.length > 0 && (
              <FormField
                control={form.control}
                name="customer_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cliente (opcional)</FormLabel>
                    <Select
                      value={field.value ?? "_none"}
                      onValueChange={(v) =>
                        field.onChange(v === "_none" ? null : v)
                      }
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="_none">Sem cliente</SelectItem>
                        {customers.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {!isIncome && suppliers.length > 0 && (
              <FormField
                control={form.control}
                name="supplier_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fornecedor (opcional)</FormLabel>
                    <Select
                      value={field.value ?? "_none"}
                      onValueChange={(v) =>
                        field.onChange(v === "_none" ? null : v)
                      }
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="_none">Sem fornecedor</SelectItem>
                        {suppliers.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="pending">A receber/pagar</SelectItem>
                      <SelectItem value="paid">
                        {isIncome ? "Já recebi" : "Já paguei"}
                      </SelectItem>
                    </SelectContent>
                  </Select>
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
                disabled={isPending}
                className="bg-brand hover:bg-brand-hover"
              >
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Salvar
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

function formatToInput(value: number): string {
  return value
    .toFixed(2)
    .replace(".", ",")
    .replace(/\B(?=(\d{3})+(?!\d))/g, ".")
}
