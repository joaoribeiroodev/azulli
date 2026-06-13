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
  createCustomerSchema,
  type CreateCustomerInput,
} from "@/lib/financial/schemas"
import {
  createCustomerAction,
  updateCustomerAction,
} from "@/lib/financial/customers.actions"

type Customer = {
  id: string
  name: string
  email: string | null
  phone: string | null
  document: string | null
}

type Props =
  | {
      mode: "create"
      open: boolean
      onOpenChange: (open: boolean) => void
      customer?: never
    }
  | {
      mode: "edit"
      open: boolean
      onOpenChange: (open: boolean) => void
      customer: Customer
    }

export function CustomerDialog(props: Props) {
  const { mode, open, onOpenChange } = props
  const customer = mode === "edit" ? props.customer : undefined
  const [isPending, startTransition] = useTransition()

  const form = useForm<CreateCustomerInput>({
    resolver: zodResolver(createCustomerSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      document: "",
    },
  })

  useEffect(() => {
    if (open) {
      form.reset({
        name: customer?.name ?? "",
        email: customer?.email ?? "",
        phone: customer?.phone ?? "",
        document: customer?.document ?? "",
      })
    }
  }, [open, customer, form])

  function onSubmit(values: CreateCustomerInput) {
    startTransition(async () => {
      const result =
        mode === "create"
          ? await createCustomerAction(values)
          : await updateCustomerAction({ id: customer!.id, ...values })

      if (!result.success) {
        toast.error(result.error)
        return
      }

      toast.success(
        mode === "create"
          ? "Cliente cadastrado! 🎉"
          : "Cliente atualizado."
      )
      onOpenChange(false)
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">
            {mode === "create" ? "Novo cliente" : "Editar cliente"}
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
                    <Input placeholder="João Silva" {...field} />
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
                      placeholder="cliente@email.com"
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
                      placeholder="000.000.000-00"
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