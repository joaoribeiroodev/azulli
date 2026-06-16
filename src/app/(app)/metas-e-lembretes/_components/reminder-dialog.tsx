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
import { Textarea } from "@/components/ui/textarea"

import {
  createReminderSchema,
  PRIORITY_LABELS,
  REMINDER_PRIORITIES,
  type CreateReminderInput,
  type ReminderPriority,
} from "@/lib/reminders/schemas"
import {
  createReminderAction,
  updateReminderAction,
} from "@/lib/reminders/actions"
import { todayLocalBR } from "@/lib/utils/date"
import { cn } from "@/lib/utils"

import type { ReminderRow } from "@/lib/reminders/queries"

type Props =
  | {
      mode: "create"
      open: boolean
      onOpenChange: (open: boolean) => void
      reminder?: never
    }
  | {
      mode: "edit"
      open: boolean
      onOpenChange: (open: boolean) => void
      reminder: ReminderRow
    }

const PRIORITY_STYLES: Record<
  ReminderPriority,
  { active: string; icon: string }
> = {
  low: {
    active: "border-muted-foreground/50 bg-muted text-foreground",
    icon: "text-muted-foreground",
  },
  medium: {
    active: "border-amber-500 bg-amber-50 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200",
    icon: "text-amber-500",
  },
  high: {
    active: "border-destructive bg-destructive/10 text-destructive",
    icon: "text-destructive",
  },
}

export function ReminderDialog(props: Props) {
  const { mode, open, onOpenChange } = props
  const reminder = mode === "edit" ? props.reminder : undefined
  const [isPending, startTransition] = useTransition()

  const form = useForm<CreateReminderInput>({
    resolver: zodResolver(createReminderSchema),
    defaultValues: {
      title: "",
      description: "",
      due_date: todayLocalBR(),
      priority: "medium",
    },
  })

  useEffect(() => {
    if (open) {
      form.reset({
        title: reminder?.title ?? "",
        description: reminder?.description ?? "",
        due_date: reminder?.due_date ?? todayLocalBR(),
        priority: reminder?.priority ?? "medium",
      })
    }
  }, [open, reminder, form])

  function onSubmit(values: CreateReminderInput) {
    startTransition(async () => {
      const result =
        mode === "create"
          ? await createReminderAction(values)
          : await updateReminderAction({
              id: reminder!.id,
              ...values,
              is_done: reminder!.is_done,
            })

      if (!result.success) {
        toast.error(result.error)
        return
      }
      toast.success(
        mode === "create" ? "Lembrete criado! 📌" : "Atualizado ✅"
      )
      onOpenChange(false)
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display">
            {mode === "create" ? "Novo lembrete" : "Editar lembrete"}
          </DialogTitle>
          <DialogDescription>
            Algo importante pra não esquecer.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Título</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Renovar alvará da prefeitura"
                      {...field}
                    />
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
              name="priority"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Prioridade</FormLabel>
                  <div className="grid grid-cols-3 gap-2">
                    {REMINDER_PRIORITIES.map((p) => {
                      const isActive = field.value === p
                      const styles = PRIORITY_STYLES[p]
                      return (
                        <button
                          key={p}
                          type="button"
                          onClick={() => field.onChange(p)}
                          className={cn(
                            "rounded-lg border-2 py-2 px-3 text-xs font-medium transition-all duration-200",
                            isActive
                              ? `${styles.active} scale-[1.03]`
                              : "border-border hover:border-muted-foreground text-muted-foreground"
                          )}
                        >
                          {PRIORITY_LABELS[p]}
                        </button>
                      )
                    })}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Detalhes (opcional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Observações, instruções, links..."
                      rows={3}
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
                {isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Salvar
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
