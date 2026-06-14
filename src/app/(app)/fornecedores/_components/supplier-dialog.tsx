"use client"

import { useEffect, useTransition } from "react"
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
  createSupplierSchema,
  type CreateSupplierInput,
} from "@/lib/financial/schemas"
import {
  createSupplierAction,
  updateSupplierAction,
} from "@/lib/financial/suppliers.actions"

type Supplier = {
  id: string
  name: string
  email: string | null
  phone: string | null
  document: string | null
  notes: string | null
}

type Props =
  | {
      mode: "create"
      open: boolean
      onOpenChange: (open: boolean) => void
      supplier?: never
    }
  | {
      mode: "edit"
      open: boolean
      onOpenChange: (open: boolean) => void
      supplier: Supplier
    }

export function SupplierDialog(props: Props) {
  const { mode, open, onOpenChange } = props
  const supplier = mode === "edit" ? props.supplier : undefined
  const [isPending, startTransition] = useTransition()

  const form = useForm<CreateSupplierInput>({
    resolver: zodResolver(createSupplierSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      document: "",
      notes: "",
    },
  })

  useEffect(() => {
    if (open) {
      form.reset({
        name: supplier?.name ?? "",
        email: supplier?.email ?? "",
        phone: supplier?.phone ?? "",
        document: supplier?.document ?? "",
        notes: supplier?.notes ?? "",
      })
    }
  }, [open, supplier, form])

  function onSubmit(values: CreateSupplierInput) {
    startTransition(async () => {
      const result =
        mode === "create"
          ? await createSupplierAction(values)
          : await updateSupplierAction({ id: supplier!.id, ...values })

      if (!result.success) {
        toast.error(result.error)
        return
      }

      toast.success(
        mode === "create"
          ? "Fornecedor cadastrado! 🎉"
          : "Fornecedor atualizado."
      )
      onOpenChange(false)
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">
            {mode === "create" ? "Novo fornecedor" : "Editar fornecedor"}
          </DialogTitle>
          <DialogDescription>
            Nome é obrigatório. Os demais campos ajudam a manter contato.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome</FormLabel>
                  <FormControl>
                    <Input placeholder="Distribuidora Brasil" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>E-mail</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="contato@fornecedor.com"
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
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Telefone / WhatsApp</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="(71) 99999-9999"
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
              name="document"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>CPF / CNPJ</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="00.000.000/0000-00"
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
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Anotações (opcional)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Ex: pagamento na 1ª semana do mês"
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
