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
  createEmployeeSchema,
  type CreateEmployeeInput,
} from "@/lib/employees/schemas"
import {
  createEmployeeAction,
  updateEmployeeAction,
} from "@/lib/employees/actions"
import { maskBRL, parseBRL } from "@/lib/utils/currency"
import { formatWhatsAppBR } from "@/lib/utils/format"
import { cn } from "@/lib/utils"

import type { EmployeeRow } from "@/lib/employees/queries"

type Props =
  | {
      mode: "create"
      open: boolean
      onOpenChange: (open: boolean) => void
      employee?: never
    }
  | {
      mode: "edit"
      open: boolean
      onOpenChange: (open: boolean) => void
      employee: EmployeeRow
    }

export function EmployeeDialog(props: Props) {
  const { mode, open, onOpenChange } = props
  const employee = mode === "edit" ? props.employee : undefined
  const [isPending, startTransition] = useTransition()
  const [salaryDisplay, setSalaryDisplay] = useState("")

  const form = useForm<CreateEmployeeInput>({
    resolver: zodResolver(createEmployeeSchema),
    defaultValues: {
      name: "",
      role: "",
      email: "",
      phone: "",
      document: "",
      hire_date: "",
      salary: null,
      notes: "",
      is_active: true,
    },
  })

  const watchedIsActive = form.watch("is_active")

  useEffect(() => {
    if (open) {
      const defaults: CreateEmployeeInput = {
        name: employee?.name ?? "",
        role: employee?.role ?? "",
        email: employee?.email ?? "",
        phone: employee?.phone ? formatWhatsAppBR(employee.phone) : "",
        document: employee?.document ?? "",
        hire_date: employee?.hire_date ?? "",
        salary: employee?.salary ?? null,
        notes: employee?.notes ?? "",
        is_active: employee?.is_active ?? true,
      }
      form.reset(defaults)
      setSalaryDisplay(
        employee?.salary ? formatToInput(employee.salary) : ""
      )
    }
  }, [open, employee, form])

  function onSubmit(values: CreateEmployeeInput) {
    startTransition(async () => {
      const result =
        mode === "create"
          ? await createEmployeeAction(values)
          : await updateEmployeeAction({ id: employee!.id, ...values })

      if (!result.success) {
        toast.error(result.error)
        return
      }

      if (mode === "edit" && employee) {
        if (employee.is_active && !values.is_active) {
          toast.success("Funcionário inativado 🔒", {
            description: "Removido da equipe ativa (histórico preservado).",
          })
        } else if (!employee.is_active && values.is_active) {
          toast.success("Funcionário reativado ✨")
        } else {
          toast.success("Atualizado com sucesso ✅")
        }
      } else {
        toast.success("Funcionário cadastrado! 👤")
      }
      onOpenChange(false)
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display">
            {mode === "create" ? "Novo funcionário" : "Editar funcionário"}
          </DialogTitle>
          <DialogDescription>
            Cadastre dados básicos e folha de pagamento.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome completo</FormLabel>
                  <FormControl>
                    <Input placeholder="João da Silva" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cargo (opcional)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Ex: Vendedor, Administrativo..."
                      {...field}
                      value={field.value ?? ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>E-mail</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="joao@email.com"
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
                    <FormLabel>WhatsApp</FormLabel>
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
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="document"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>CPF (opcional)</FormLabel>
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

              <FormField
                control={form.control}
                name="hire_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data de admissão</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        {...field}
                        value={field.value ?? ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="salary"
              render={() => (
                <FormItem>
                  <FormLabel>Salário base (opcional)</FormLabel>
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
                        value={salaryDisplay}
                        onChange={(e) => {
                          const masked = maskBRL(e.target.value)
                          setSalaryDisplay(masked)
                          const v = parseBRL(masked)
                          form.setValue("salary", v > 0 ? v : null, {
                            shouldValidate: true,
                          })
                        }}
                      />
                    </div>
                  </FormControl>
                  <FormDescription className="text-xs">
                    Usado pra calcular folha mensal estimada
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Observações (opcional)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Notas internas, horário, condições..."
                      {...field}
                      value={field.value ?? ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {mode === "edit" && (
              <>
                <Separator />
                <FormField
                  control={form.control}
                  name="is_active"
                  render={({ field }) => (
                    <FormItem
                      className={cn(
                        "flex flex-row items-center justify-between rounded-lg border p-3 transition-all duration-300",
                        field.value
                          ? "border-brand bg-brand-soft/30"
                          : "border-amber-300 bg-amber-50 dark:border-amber-900/60 dark:bg-amber-950/30"
                      )}
                    >
                      <FormLabel className="flex-1 cursor-pointer mr-3 space-y-1">
                        <span className="block text-sm font-medium">
                          {field.value
                            ? "Funcionário ativo"
                            : "Funcionário inativo"}
                        </span>
                        <span
                          className={cn(
                            "block text-xs font-normal transition-colors",
                            field.value
                              ? "text-muted-foreground"
                              : "text-amber-700 dark:text-amber-300"
                          )}
                        >
                          {field.value
                            ? "Faz parte da equipe atual"
                            : "🔒 Não conta na folha de pagamento"}
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
                className={cn(
                  "transition-colors",
                  mode === "edit" && !watchedIsActive
                    ? "bg-amber-600 hover:bg-amber-700"
                    : "bg-brand hover:bg-brand-hover"
                )}
              >
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {mode === "edit" && employee?.is_active && !watchedIsActive
                  ? "Inativar"
                  : "Salvar"}
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
