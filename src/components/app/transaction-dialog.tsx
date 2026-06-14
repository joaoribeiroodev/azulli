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
  createTransactionSchema,
  type CreateTransactionInput,
} from "@/lib/financial/schemas"
import { createTransactionAction } from "@/lib/financial/transactions.actions"
import { maskBRL, parseBRL } from "@/lib/utils/currency"

type Party = { id: string; name: string }

type Props = {
  open: boolean
  type: "income" | "expense"
  onOpenChange: (open: boolean) => void
  customers?: Party[]
  suppliers?: Party[]
  defaultCustomerId?: string | null
  defaultSupplierId?: string | null
}

export function TransactionDialog({
  open,
  type,
  onOpenChange,
  customers = [],
  suppliers = [],
  defaultCustomerId = null,
  defaultSupplierId = null,
}: Props) {
  const [isPending, startTransition] = useTransition()
  const [amountDisplay, setAmountDisplay] = useState("")

  const form = useForm<CreateTransactionInput>({
    resolver: zodResolver(createTransactionSchema),
    defaultValues: {
      type,
      amount: 0,
      due_date: new Date().toISOString().slice(0, 10),
      description: "",
      customer_id: null,
      supplier_id: null,
      status: "pending",
    },
  })

  useEffect(() => {
    if (open) {
      form.reset({
        type,
        amount: 0,
        due_date: new Date().toISOString().slice(0, 10),
        description: "",
        customer_id: type === "income" ? defaultCustomerId : null,
        supplier_id: type === "expense" ? defaultSupplierId : null,
        status: "pending",
      })
      setAmountDisplay("")
    }
  }, [open, type, defaultCustomerId, defaultSupplierId, form])

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
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
                      placeholder={isIncome ? "Venda do mês" : "Conta de luz"}
                      {...field}
                      value={field.value ?? ""}
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
