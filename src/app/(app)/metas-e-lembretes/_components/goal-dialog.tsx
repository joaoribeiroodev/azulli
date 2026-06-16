"use client"

import { useEffect, useState, useTransition } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import {
  Loader2,
  TrendingUp,
  PiggyBank,
  ShoppingCart,
  Target,
} from "lucide-react"

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

import {
  createGoalSchema,
  GOAL_KIND_HINTS,
  type CreateGoalInput,
  type GoalKind,
} from "@/lib/goals/schemas"
import { createGoalAction, updateGoalAction } from "@/lib/goals/actions"
import { maskBRL, parseBRL } from "@/lib/utils/currency"
import { todayLocalBR } from "@/lib/utils/date"
import { cn } from "@/lib/utils"

import type { GoalRow } from "@/lib/goals/queries"

type Props =
  | {
      mode: "create"
      open: boolean
      onOpenChange: (open: boolean) => void
      goal?: never
    }
  | {
      mode: "edit"
      open: boolean
      onOpenChange: (open: boolean) => void
      goal: GoalRow
    }

const KIND_CARDS: Array<{
  value: GoalKind
  label: string
  icon: typeof TrendingUp
  iconColor: string
}> = [
  { value: "revenue", label: "Receita", icon: TrendingUp, iconColor: "text-success-ink" },
  { value: "profit", label: "Lucro", icon: PiggyBank, iconColor: "text-brand" },
  { value: "sales_count", label: "Vendas (qtd)", icon: ShoppingCart, iconColor: "text-amber-500" },
  { value: "custom", label: "Personalizada", icon: Target, iconColor: "text-purple-500" },
]

export function GoalDialog(props: Props) {
  const { mode, open, onOpenChange } = props
  const goal = mode === "edit" ? props.goal : undefined
  const [isPending, startTransition] = useTransition()
  const [targetDisplay, setTargetDisplay] = useState("")
  const [currentDisplay, setCurrentDisplay] = useState("")

  const form = useForm<CreateGoalInput>({
    resolver: zodResolver(createGoalSchema),
    defaultValues: {
      title: "",
      kind: "revenue",
      target_value: 0,
      current_value: 0,
      period_start: todayLocalBR(),
      period_end: todayLocalBR(),
      notes: "",
    },
  })

  const watchedKind = form.watch("kind")
  const isCustom = watchedKind === "custom"
  const isCount = watchedKind === "sales_count"

  useEffect(() => {
    if (open) {
      const today = todayLocalBR()
      const inThirty = addDays(today, 30)
      form.reset({
        title: goal?.title ?? "",
        kind: (goal?.kind as GoalKind) ?? "revenue",
        target_value: goal?.target_value ?? 0,
        current_value: goal?.current_value ?? 0,
        period_start: goal?.period_start ?? today,
        period_end: goal?.period_end ?? inThirty,
        notes: goal?.notes ?? "",
      })
      setTargetDisplay(goal?.target_value ? formatToInput(goal.target_value) : "")
      setCurrentDisplay(goal?.current_value ? formatToInput(goal.current_value) : "")
    }
  }, [open, goal, form])

  function onSubmit(values: CreateGoalInput) {
    startTransition(async () => {
      const result =
        mode === "create"
          ? await createGoalAction(values)
          : await updateGoalAction({
              id: goal!.id,
              ...values,
              is_archived: goal!.is_archived,
            })

      if (!result.success) {
        toast.error(result.error)
        return
      }
      toast.success(mode === "create" ? "Meta criada! 🎯" : "Meta atualizada ✅")
      onOpenChange(false)
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display">
            {mode === "create" ? "Nova meta" : "Editar meta"}
          </DialogTitle>
          <DialogDescription>
            Defina um alvo e o período. O progresso é calculado automaticamente
            (exceto em metas personalizadas).
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Tipo da meta — 4 cards */}
            <FormField
              control={form.control}
              name="kind"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de meta</FormLabel>
                  <div className="grid grid-cols-2 gap-2">
                    {KIND_CARDS.map((card) => {
                      const Icon = card.icon
                      const active = field.value === card.value
                      return (
                        <button
                          key={card.value}
                          type="button"
                          onClick={() => field.onChange(card.value)}
                          className={cn(
                            "flex flex-col items-center gap-1.5 rounded-lg border-2 p-3 transition-all duration-200",
                            active
                              ? "border-brand bg-brand-soft/30 scale-[1.02]"
                              : "border-border hover:border-muted-foreground"
                          )}
                        >
                          <Icon
                            className={cn(
                              "h-5 w-5 transition-colors",
                              active ? card.iconColor : "text-muted-foreground"
                            )}
                          />
                          <span className="text-xs font-medium">
                            {card.label}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                  <FormDescription className="text-xs">
                    {GOAL_KIND_HINTS[field.value]}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Título</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={
                        watchedKind === "sales_count"
                          ? "Bater 50 vendas em outubro"
                          : "Atingir R$ 10mil em outubro"
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
              name="target_value"
              render={() => (
                <FormItem>
                  <FormLabel>
                    {isCount ? "Quantidade de vendas" : "Valor da meta"}
                  </FormLabel>
                  <FormControl>
                    {isCount ? (
                      <Input
                        type="number"
                        min="1"
                        step="1"
                        placeholder="50"
                        value={targetDisplay}
                        onChange={(e) => {
                          setTargetDisplay(e.target.value)
                          const n = parseInt(e.target.value, 10)
                          form.setValue("target_value", isNaN(n) ? 0 : n, {
                            shouldValidate: true,
                          })
                        }}
                      />
                    ) : (
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                          R$
                        </span>
                        <Input
                          type="text"
                          inputMode="numeric"
                          placeholder="0,00"
                          className="pl-9"
                          value={targetDisplay}
                          onChange={(e) => {
                            const masked = maskBRL(e.target.value)
                            setTargetDisplay(masked)
                            form.setValue("target_value", parseBRL(masked), {
                              shouldValidate: true,
                            })
                          }}
                        />
                      </div>
                    )}
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {isCustom && (
              <FormField
                control={form.control}
                name="current_value"
                render={() => (
                  <FormItem>
                    <FormLabel>Progresso atual</FormLabel>
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
                          value={currentDisplay}
                          onChange={(e) => {
                            const masked = maskBRL(e.target.value)
                            setCurrentDisplay(masked)
                            form.setValue(
                              "current_value",
                              parseBRL(masked),
                              { shouldValidate: true }
                            )
                          }}
                        />
                      </div>
                    </FormControl>
                    <FormDescription className="text-xs">
                      Como esta meta é personalizada, você atualiza o
                      progresso manualmente.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="period_start"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Início</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="period_end"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fim</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Observações (opcional)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Estratégia, motivação..."
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

function formatToInput(value: number): string {
  return value
    .toFixed(2)
    .replace(".", ",")
    .replace(/\B(?=(\d{3})+(?!\d))/g, ".")
}

function addDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split("-").map(Number)
  const date = new Date(y, m - 1, d + days)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
}
