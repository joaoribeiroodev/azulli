"use client"

import { useState, useEffect } from "react"
import { Plus, Trash2, AlertTriangle } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { formatBRL, maskBRL, parseBRL } from "@/lib/utils/currency"
import { cn } from "@/lib/utils"

import type { ProductLite } from "@/lib/products/queries"
import type { TransactionItemInput } from "@/lib/products/schemas"

type Props = {
  products: ProductLite[]
  value: TransactionItemInput[]
  onChange: (items: TransactionItemInput[]) => void
  type: "income" | "expense"
}

type ItemUI = TransactionItemInput & {
  _uid: string
  _priceDisplay: string
}

function formatProductLabel(p: ProductLite): string {
  if (p.track_stock) {
    return `${p.name} (${p.stock_quantity} ${p.unit})`
  }
  return p.name
}

export function TransactionItemsBuilder({
  products,
  value,
  onChange,
  type,
}: Props) {
  const [items, setItems] = useState<ItemUI[]>(() =>
    value.map((v, i) => ({
      ...v,
      _uid: `item-${i}-${Date.now()}`,
      _priceDisplay: formatPriceInput(v.unit_price),
    }))
  )

  useEffect(() => {
    if (items.length === 0) {
      setItems([
        {
          _uid: `item-${Date.now()}`,
          product_id: "",
          quantity: 1,
          unit_price: 0,
          _priceDisplay: "",
        },
      ])
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const valid = items
      .filter((i) => i.product_id && i.quantity > 0 && i.unit_price >= 0)
      .map(({ _uid: _u, _priceDisplay: _p, ...rest }) => rest)
    onChange(valid)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items])

  function addItem() {
    setItems((prev) => [
      ...prev,
      {
        _uid: `item-${Date.now()}-${Math.random()}`,
        product_id: "",
        quantity: 1,
        unit_price: 0,
        _priceDisplay: "",
      },
    ])
  }

  function removeItem(uid: string) {
    setItems((prev) => prev.filter((i) => i._uid !== uid))
  }

  function updateItem(uid: string, patch: Partial<ItemUI>) {
    setItems((prev) =>
      prev.map((i) => (i._uid === uid ? { ...i, ...patch } : i))
    )
  }

  function selectProduct(uid: string, productId: string) {
    const product = products.find((p) => p.id === productId)
    if (!product) return
    updateItem(uid, {
      product_id: productId,
      unit_price: product.price,
      _priceDisplay: formatPriceInput(product.price),
    })
  }

  const total = items.reduce(
    (sum, i) => sum + (i.quantity || 0) * (i.unit_price || 0),
    0
  )

  const stockWarnings =
    type === "income"
      ? items
          .map((item) => {
            const product = products.find((p) => p.id === item.product_id)
            if (!product || !product.track_stock) return null
            if (product.stock_quantity < item.quantity) {
              return {
                uid: item._uid,
                productName: product.name,
                available: product.stock_quantity,
                requested: item.quantity,
                unit: product.unit,
              }
            }
            return null
          })
          .filter((x): x is NonNullable<typeof x> => x !== null)
      : []

  return (
    <div className="space-y-3 rounded-lg border bg-muted/30 p-3">
      <div className="space-y-2">
        {items.map((item, index) => {
          const product = products.find((p) => p.id === item.product_id)
          const hasWarning = stockWarnings.some((w) => w.uid === item._uid)

          return (
            <div
              key={item._uid}
              className={cn(
                "rounded-lg border bg-card p-3 space-y-2",
                hasWarning && "border-amber-300"
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <Label className="text-xs font-medium text-muted-foreground">
                  Item {index + 1}
                </Label>
                {items.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive hover:text-destructive"
                    onClick={() => removeItem(item._uid)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>

              <div className="space-y-2">
                <Select
                  value={item.product_id || undefined}
                  onValueChange={(v) => selectProduct(item._uid, v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecionar produto/serviço" />
                  </SelectTrigger>
                  <SelectContent>
                    {products.length === 0 ? (
                      <div className="px-3 py-2 text-sm text-muted-foreground">
                        Nenhum produto cadastrado.
                      </div>
                    ) : (
                      // FIX: SelectItem com STRING simples (não JSX aninhado)
                      products.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {formatProductLabel(p)}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-[10px] text-muted-foreground">
                      Quantidade {product ? `(${product.unit})` : ""}
                    </Label>
                    <Input
                      type="number"
                      step="0.001"
                      min="0.001"
                      value={item.quantity ?? 1}
                      onChange={(e) =>
                        updateItem(item._uid, {
                          quantity: parseFloat(e.target.value) || 0,
                        })
                      }
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[10px] text-muted-foreground">
                      Preço unitário
                    </Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                        R$
                      </span>
                      <Input
                        type="text"
                        inputMode="numeric"
                        className="pl-8"
                        value={item._priceDisplay}
                        onChange={(e) => {
                          const masked = maskBRL(e.target.value)
                          updateItem(item._uid, {
                            _priceDisplay: masked,
                            unit_price: parseBRL(masked),
                          })
                        }}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px] text-muted-foreground">
                    Subtotal:
                  </span>
                  <span className="text-sm font-semibold">
                    {formatBRL((item.quantity || 0) * (item.unit_price || 0))}
                  </span>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {stockWarnings.length > 0 && (
        <div className="rounded-lg bg-amber-50 border border-amber-200 p-2.5 dark:bg-amber-950/30 dark:border-amber-900/50">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <p className="text-xs font-medium text-amber-900 dark:text-amber-200">
                Estoque insuficiente
              </p>
              {stockWarnings.map((w) => (
                <p
                  key={w.uid}
                  className="text-xs text-amber-800 dark:text-amber-200"
                >
                  {w.productName}: pedido {w.requested}, disponível{" "}
                  {w.available} {w.unit}
                </p>
              ))}
              <p className="text-[10px] text-amber-700 dark:text-amber-300 pt-1">
                Será bloqueado se você marcar como pago agora.
              </p>
            </div>
          </div>
        </div>
      )}

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={addItem}
        className="w-full gap-2"
      >
        <Plus className="h-3.5 w-3.5" />
        Adicionar item
      </Button>

      <div className="flex items-center justify-between border-t pt-2 px-1">
        <span className="text-sm font-medium">Total</span>
        <span className="text-lg font-bold text-brand-ink">
          {formatBRL(total)}
        </span>
      </div>
    </div>
  )
}

function formatPriceInput(value: number): string {
  if (!value) return ""
  return value
    .toFixed(2)
    .replace(".", ",")
    .replace(/\B(?=(\d{3})+(?!\d))/g, ".")
}
