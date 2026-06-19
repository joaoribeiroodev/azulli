"use client"

import { useEffect, useState, useTransition } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"

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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import {
  updateTransactionSchema,
  type UpdateTransactionInput,
} from "@/lib/financial/schemas"
import { updateTransactionAction } from "@/lib/financial/transactions.actions"
import { maskBRL, parseBRL } from "@/lib/utils/currency"

import { CategoryCombobox } from "@/components/app/category-combobox"

type Party = { id: string; name: string }

export type EditableTransaction = {
  id: string
  type: "income" | "expense"
  amount: number
  due_date: string
  description: string | null
  category: string | null
  customer_id: string | null
  supplier_id: string | null
  status: "pending" | "paid" | "overdue"
  raw_status?: "pending" | "paid"
}

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  transaction: EditableTransaction | null
  customers?: Party[]
  suppliers?: Party[]
  recentCategories?: string[]
}

function formatToInput(value: number): string {
  return value
    .toFixed(2)
    .replace(".", ",")
    .replace(/\B(?=(\d{3})+(?!\d))/g, ".")
}

export function EditTransactionDialog({
  open,
  onOpenChange,
  transaction,
  customers = [],
  suppliers = [],
  recentCategories = [],
}: Props) {
  const [isPending, startTransition] = useTransition()
  const [amountDisplay, setAmountDisplay] = useState("")

  const form = useForm<UpdateTransactionInput>({
    resolver: zodResolver(updateTransactionSchema),
    defaultValues: {
      id: "",
      amount: 0,
      due_date: "",
      description: "",
      customer_id: null,
      supplier_id: null,
      category: null,
      status: "pending",
    },
  })

  useEffect(() => {
    if (open && transaction) {
      const status =
        transaction.raw_status ??
        (transaction.status === "paid" ? "paid" : "pending")
      form.reset({
        id: transaction.id,
        type: transaction.type,
        amount: transaction.amount,
        due_date: transaction.due_date,
        description: transaction.description ?? "",
        customer_id: transaction.customer_id,
        supplier_id: transaction.supplier_id,
        category: transaction.category,
        status,
      })
      setAmountDisplay(formatToInput(transaction.amount))
    }
  }, [open, transaction, form])

  const isIncome = transaction?.type === "income"

  function onSubmit(values: UpdateTransactionInput) {
    startTransition(async () => {
      const result = await updateTransactionAction(values)
      if (!result.success) {
        toast.error(result.error)
        return
      }
      toast.success("Lançamento atualizado.")
      onOpenChange(false)
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display">Editar lançamento</DialogTitle>
          <DialogDescription>
            Altere valor, data, descrição ou status.
          </DialogDescription>
        </DialogHeader>

        {transaction && (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                        placeholder={
                          isIncome ? "Venda do mês" : "Conta de luz"
                        }
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
                        type={transaction.type}
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
                        <SelectItem value="pending">
                          A receber/pagar
                        </SelectItem>
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
                  {isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Salvar alterações
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  )
}
