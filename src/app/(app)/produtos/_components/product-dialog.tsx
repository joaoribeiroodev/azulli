"use client"

import { useEffect, useState, useTransition } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { Loader2, Package, Wrench } from "lucide-react"

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
import { Separator } from "@/components/ui/separator"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import {
  createProductSchema,
  type CreateProductInput,
  type ProductKind,
} from "@/lib/products/schemas"
import {
  createProductAction,
  updateProductAction,
} from "@/lib/products/actions"
import { maskBRL, parseBRL } from "@/lib/utils/currency"

type Product = {
  id: string
  name: string
  kind: "product" | "service"
  description: string | null
  sku: string | null
  price: number
  cost: number | null
  track_stock: boolean
  stock_quantity: number
  low_stock_threshold: number | null
  unit: string
  ncm: string | null
  cfop: string | null
  is_active: boolean
}

type Props =
  | {
      mode: "create"
      open: boolean
      onOpenChange: (open: boolean) => void
      product?: never
    }
  | {
      mode: "edit"
      open: boolean
      onOpenChange: (open: boolean) => void
      product: Product
    }

const UNIT_OPTIONS = [
  { value: "un", label: "un (unidade)" },
  { value: "kg", label: "kg (quilo)" },
  { value: "g", label: "g (grama)" },
  { value: "L", label: "L (litro)" },
  { value: "mL", label: "mL (mililitro)" },
  { value: "m", label: "m (metro)" },
  { value: "cm", label: "cm (centímetro)" },
  { value: "m²", label: "m² (metro quadrado)" },
  { value: "h", label: "h (hora)" },
  { value: "cx", label: "cx (caixa)" },
  { value: "pct", label: "pct (pacote)" },
]

export function ProductDialog(props: Props) {
  const { mode, open, onOpenChange } = props
  const product = mode === "edit" ? props.product : undefined
  const [isPending, startTransition] = useTransition()
  const [priceDisplay, setPriceDisplay] = useState("")
  const [costDisplay, setCostDisplay] = useState("")
  const [stockDisplay, setStockDisplay] = useState("")
  const [thresholdDisplay, setThresholdDisplay] = useState("")

  const form = useForm<CreateProductInput>({
    resolver: zodResolver(createProductSchema),
    defaultValues: {
      name: "",
      kind: "product",
      description: "",
      sku: "",
      price: 0,
      cost: null,
      track_stock: false,
      stock_quantity: 0,
      low_stock_threshold: null,
      unit: "un",
      ncm: "",
      cfop: "",
      is_active: true,
    },
  })

  const watchedKind = form.watch("kind")
  const watchedTrackStock = form.watch("track_stock")
  const isService = watchedKind === "service"

  useEffect(() => {
    if (isService) {
      form.setValue("track_stock", false)
      form.setValue("stock_quantity", 0)
    }
  }, [isService, form])

  useEffect(() => {
    if (open) {
      const defaults: CreateProductInput = {
        name: product?.name ?? "",
        kind: (product?.kind ?? "product") as ProductKind,
        description: product?.description ?? "",
        sku: product?.sku ?? "",
        price: product?.price ?? 0,
        cost: product?.cost ?? null,
        track_stock: product?.track_stock ?? false,
        stock_quantity: product?.stock_quantity ?? 0,
        low_stock_threshold: product?.low_stock_threshold ?? null,
        unit: product?.unit ?? "un",
        ncm: product?.ncm ?? "",
        cfop: product?.cfop ?? "",
        is_active: product?.is_active ?? true,
      }
      form.reset(defaults)
      setPriceDisplay(product?.price ? formatToInput(product.price) : "")
      setCostDisplay(product?.cost ? formatToInput(product.cost) : "")
      setStockDisplay(
        product?.stock_quantity ? String(product.stock_quantity) : ""
      )
      setThresholdDisplay(
        product?.low_stock_threshold !== null &&
          product?.low_stock_threshold !== undefined
          ? String(product.low_stock_threshold)
          : ""
      )
    }
  }, [open, product, form])

  function onSubmit(values: CreateProductInput) {
    startTransition(async () => {
      const result =
        mode === "create"
          ? await createProductAction(values)
          : await updateProductAction({ id: product!.id, ...values })

      if (!result.success) {
        toast.error(result.error)
        return
      }

      toast.success(
        mode === "create"
          ? values.kind === "service"
            ? "Serviço cadastrado! 🛠️"
            : "Produto cadastrado! 📦"
          : "Atualizado com sucesso ✅"
      )
      onOpenChange(false)
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display">
            {mode === "create"
              ? `Novo ${isService ? "serviço" : "produto"}`
              : `Editar ${isService ? "serviço" : "produto"}`}
          </DialogTitle>
          <DialogDescription>
            {isService
              ? "Serviços são intangíveis — não controlam estoque."
              : "Produtos podem ter controle de estoque ativado."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Tipo */}
            <FormField
              control={form.control}
              name="kind"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo</FormLabel>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => field.onChange("product")}
                      className={`flex flex-col items-center gap-1.5 rounded-lg border-2 p-3 transition-colors ${
                        field.value === "product"
                          ? "border-brand bg-brand-soft/30"
                          : "border-border hover:border-muted-foreground"
                      }`}
                    >
                      <Package
                        className={`h-5 w-5 ${
                          field.value === "product"
                            ? "text-brand"
                            : "text-muted-foreground"
                        }`}
                      />
                      <span className="text-sm font-medium">Produto</span>
                      <span className="text-[10px] text-muted-foreground">
                        Tangível, com estoque
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => field.onChange("service")}
                      className={`flex flex-col items-center gap-1.5 rounded-lg border-2 p-3 transition-colors ${
                        field.value === "service"
                          ? "border-brand bg-brand-soft/30"
                          : "border-border hover:border-muted-foreground"
                      }`}
                    >
                      <Wrench
                        className={`h-5 w-5 ${
                          field.value === "service"
                            ? "text-brand"
                            : "text-muted-foreground"
                        }`}
                      />
                      <span className="text-sm font-medium">Serviço</span>
                      <span className="text-[10px] text-muted-foreground">
                        Intangível, sem estoque
                      </span>
                    </button>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={
                        isService ? "Corte de cabelo" : "Camiseta básica"
                      }
                      {...field}
                    />
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
                  <FormLabel>Descrição (opcional)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Detalhes sobre o item"
                      {...field}
                      value={field.value ?? ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="sku"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>SKU (opcional)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="PROD-001"
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
                name="unit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Unidade</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {UNIT_OPTIONS.map((u) => (
                          <SelectItem key={u.value} value={u.value}>
                            {u.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="price"
                render={() => (
                  <FormItem>
                    <FormLabel>Preço de venda</FormLabel>
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
                          value={priceDisplay}
                          onChange={(e) => {
                            const masked = maskBRL(e.target.value)
                            setPriceDisplay(masked)
                            form.setValue("price", parseBRL(masked), {
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

              <FormField
                control={form.control}
                name="cost"
                render={() => (
                  <FormItem>
                    <FormLabel>Custo (opcional)</FormLabel>
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
                          value={costDisplay}
                          onChange={(e) => {
                            const masked = maskBRL(e.target.value)
                            setCostDisplay(masked)
                            const v = parseBRL(masked)
                            form.setValue("cost", v > 0 ? v : null, {
                              shouldValidate: true,
                            })
                          }}
                        />
                      </div>
                    </FormControl>
                    <FormDescription className="text-xs">
                      Calcula margem
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Estoque — só pra produtos */}
            {!isService && (
              <>
                <Separator />

                {/*
                  FIX: pattern correto sem onClick custom.
                  O FormLabel do shadcn auto-vincula com o FormControl via formItemId.
                  Clicar no FormLabel dispara click no Switch nativamente.
                  Pra área clicável grande, FormLabel ocupa flex-1.
                */}
                <FormField
                  control={form.control}
                  name="track_stock"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 hover:bg-muted/40 transition-colors">
                      <FormLabel className="flex-1 cursor-pointer mr-3 space-y-1">
                        <span className="block text-sm font-medium">
                          Controlar estoque
                        </span>
                        <span className="block text-xs text-muted-foreground font-normal">
                          Atualiza automaticamente ao marcar venda como paga
                        </span>
                      </FormLabel>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                {watchedTrackStock && (
                  <div className="grid grid-cols-2 gap-3">
                    <FormField
                      control={form.control}
                      name="stock_quantity"
                      render={() => (
                        <FormItem>
                          <FormLabel>
                            Estoque {mode === "edit" ? "atual" : "inicial"}
                          </FormLabel>
                          <FormControl>
                            <Input
                              type="text"
                              inputMode="decimal"
                              placeholder="0"
                              value={stockDisplay}
                              onChange={(e) => {
                                const v = e.target.value.replace(",", ".")
                                if (v === "" || /^\d*\.?\d{0,3}$/.test(v)) {
                                  setStockDisplay(e.target.value)
                                  const num = parseFloat(v)
                                  form.setValue(
                                    "stock_quantity",
                                    isNaN(num) ? 0 : num,
                                    { shouldValidate: true }
                                  )
                                }
                              }}
                              disabled={mode === "edit"}
                            />
                          </FormControl>
                          {mode === "edit" && (
                            <FormDescription className="text-xs">
                              Use &quot;Ajustar estoque&quot; para alterar
                            </FormDescription>
                          )}
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="low_stock_threshold"
                      render={() => (
                        <FormItem>
                          <FormLabel>Alerta de baixo estoque</FormLabel>
                          <FormControl>
                            <Input
                              type="text"
                              inputMode="decimal"
                              placeholder="Ex: 5"
                              value={thresholdDisplay}
                              onChange={(e) => {
                                const v = e.target.value.replace(",", ".")
                                if (v === "" || /^\d*\.?\d{0,3}$/.test(v)) {
                                  setThresholdDisplay(e.target.value)
                                  if (v === "") {
                                    form.setValue("low_stock_threshold", null)
                                  } else {
                                    const num = parseFloat(v)
                                    form.setValue(
                                      "low_stock_threshold",
                                      isNaN(num) ? null : num,
                                      { shouldValidate: true }
                                    )
                                  }
                                }
                              }}
                            />
                          </FormControl>
                          <FormDescription className="text-xs">
                            Avisa se chegar nesse valor
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}
              </>
            )}

            {/* Status ativo — pattern idêntico ao track_stock */}
            {mode === "edit" && (
              <>
                <Separator />
                <FormField
                  control={form.control}
                  name="is_active"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 hover:bg-muted/40 transition-colors">
                      <FormLabel className="flex-1 cursor-pointer mr-3 space-y-1">
                        <span className="block text-sm font-medium">
                          Produto ativo
                        </span>
                        <span className="block text-xs text-muted-foreground font-normal">
                          Inativos não aparecem em novas vendas
                        </span>
                      </FormLabel>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </>
            )}

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
