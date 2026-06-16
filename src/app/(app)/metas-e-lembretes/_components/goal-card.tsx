"use client"

import { useState, useTransition } from "react"
import {
  Pencil,
  Trash2,
  Archive,
  ArchiveRestore,
  TrendingUp,
  PiggyBank,
  ShoppingCart,
  Target,
  Trophy,
  Edit2,
  MoreVertical,
} from "lucide-react"
import { toast } from "sonner"

import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

import {
  deleteGoalAction,
  toggleArchiveGoalAction,
  updateCustomProgressAction,
} from "@/lib/goals/actions"
import { GOAL_KIND_LABELS } from "@/lib/goals/schemas"
import { formatBRL, maskBRL, parseBRL } from "@/lib/utils/currency"
import { formatDateBR, todayLocalBR } from "@/lib/utils/date"
import { cn } from "@/lib/utils"
import type { GoalRow } from "@/lib/goals/queries"

import { GoalDialog } from "./goal-dialog"

const KIND_ICONS = {
  revenue: TrendingUp,
  profit: PiggyBank,
  sales_count: ShoppingCart,
  custom: Target,
} as const

export function GoalCard({ goal }: { goal: GoalRow }) {
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [editingProgress, setEditingProgress] = useState(false)
  const [progressInput, setProgressInput] = useState("")
  const [isPending, startTransition] = useTransition()

  const Icon = KIND_ICONS[goal.kind]
  const achieved = goal.progress_percent >= 100
  const halfwayPlus = goal.progress_percent >= 50 && !achieved
  const isCount = goal.kind === "sales_count"
  const isCustom = goal.kind === "custom"

  // Cor da barra: verde se >=100%, âmbar se 50-99%, brand se <50%
  const barColor = achieved
    ? "bg-success"
    : halfwayPlus
      ? "bg-amber-500"
      : "bg-brand"

  // Cor da borda do card
  const borderColor = achieved
    ? "border-success/40"
    : goal.is_archived
      ? "border-muted opacity-60"
      : "border-border"

  // Calcula dias restantes
  const today = todayLocalBR()
  const daysLeft = daysBetween(today, goal.period_end)
  const isExpired = daysLeft < 0
  const isLastWeek = daysLeft >= 0 && daysLeft <= 7

  function handleDelete() {
    setDeleteOpen(false)
    startTransition(async () => {
      const result = await deleteGoalAction(goal.id)
      if (!result.success) {
        toast.error(result.error)
        return
      }
      toast.success("Meta excluída.")
    })
  }

  function handleArchive() {
    startTransition(async () => {
      const result = await toggleArchiveGoalAction(goal.id, !goal.is_archived)
      if (!result.success) {
        toast.error(result.error)
        return
      }
      toast.success(
        goal.is_archived ? "Meta desarquivada." : "Meta arquivada."
      )
    })
  }

  function startEditProgress() {
    setProgressInput(goal.current_value > 0 ? formatToInput(goal.current_value) : "")
    setEditingProgress(true)
  }

  function saveProgress() {
    const value = parseBRL(progressInput)
    startTransition(async () => {
      const result = await updateCustomProgressAction(goal.id, value)
      if (!result.success) {
        toast.error(result.error)
        return
      }
      toast.success("Progresso atualizado.")
      setEditingProgress(false)
    })
  }

  return (
    <Card className={cn("relative transition-all", borderColor)}>
      {achieved && (
        <div className="absolute -top-2 -right-2 bg-success text-white text-xs font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow animate-in zoom-in-95 duration-300">
          <Trophy className="h-3 w-3" />
          Atingida!
        </div>
      )}

      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-3 min-w-0 flex-1">
            <div
              className={cn(
                "shrink-0 h-9 w-9 rounded-lg flex items-center justify-center",
                achieved
                  ? "bg-success-soft text-success-ink"
                  : "bg-brand-soft text-brand"
              )}
            >
              <Icon className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-medium text-sm truncate">{goal.title}</h3>
              <p className="text-xs text-muted-foreground">
                {GOAL_KIND_LABELS[goal.kind]}
              </p>
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0"
                disabled={isPending}
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setEditOpen(true)}>
                <Pencil className="mr-2 h-4 w-4" />
                Editar
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleArchive}>
                {goal.is_archived ? (
                  <>
                    <ArchiveRestore className="mr-2 h-4 w-4" />
                    Desarquivar
                  </>
                ) : (
                  <>
                    <Archive className="mr-2 h-4 w-4" />
                    Arquivar
                  </>
                )}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => setDeleteOpen(true)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Progresso */}
        <div className="space-y-1.5">
          <div className="flex items-baseline justify-between gap-2 flex-wrap">
            <span className="text-2xl font-display font-bold text-foreground">
              {isCount
                ? Math.floor(goal.progress)
                : formatBRL(goal.progress)}
            </span>
            <span className="text-xs text-muted-foreground">
              de {isCount ? goal.target_value : formatBRL(goal.target_value)}
              {" · "}
              <span
                className={cn(
                  "font-medium",
                  achieved ? "text-success-ink" : "text-foreground"
                )}
              >
                {Math.min(goal.progress_percent, 999).toFixed(0)}%
              </span>
            </span>
          </div>

          {/* Barra animada */}
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className={cn("h-full rounded-full transition-all duration-700 ease-out", barColor)}
              style={{ width: `${Math.min(goal.progress_percent, 100)}%` }}
            />
          </div>
        </div>

        {/* Período + badge dias restantes */}
        <div className="flex items-center justify-between gap-2 flex-wrap text-xs">
          <span className="text-muted-foreground">
            {formatDateBR(goal.period_start)} → {formatDateBR(goal.period_end)}
          </span>
          {goal.is_archived ? (
            <Badge variant="secondary">Arquivada</Badge>
          ) : isExpired ? (
            <Badge variant="outline" className="text-destructive border-destructive/50">
              Período encerrado
            </Badge>
          ) : isLastWeek ? (
            <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
              {daysLeft === 0 ? "Termina hoje" : `${daysLeft} dia${daysLeft > 1 ? "s" : ""} restante${daysLeft > 1 ? "s" : ""}`}
            </Badge>
          ) : (
            <span className="text-muted-foreground">
              {daysLeft} dias restantes
            </span>
          )}
        </div>

        {/* Edit progress (custom only) */}
        {isCustom && !goal.is_archived && (
          editingProgress ? (
            <div className="flex items-center gap-2 animate-in fade-in slide-in-from-top-1 duration-200">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  R$
                </span>
                <Input
                  type="text"
                  inputMode="numeric"
                  className="pl-9 h-8 text-sm"
                  value={progressInput}
                  onChange={(e) => setProgressInput(maskBRL(e.target.value))}
                  placeholder="0,00"
                  autoFocus
                />
              </div>
              <Button
                type="button"
                size="sm"
                onClick={saveProgress}
                disabled={isPending}
                className="bg-brand hover:bg-brand-hover h-8"
              >
                Salvar
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => setEditingProgress(false)}
                className="h-8"
              >
                X
              </Button>
            </div>
          ) : (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={startEditProgress}
              disabled={isPending}
              className="w-full gap-2 h-8 text-xs"
            >
              <Edit2 className="h-3 w-3" />
              Atualizar progresso
            </Button>
          )
        )}

        {goal.notes && (
          <p className="text-xs text-muted-foreground italic border-l-2 border-muted pl-2">
            {goal.notes}
          </p>
        )}
      </CardContent>

      {editOpen && (
        <GoalDialog
          mode="edit"
          open={editOpen}
          onOpenChange={setEditOpen}
          goal={goal}
        />
      )}

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir esta meta?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Considere arquivar em vez de
              excluir.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}

function formatToInput(value: number): string {
  return value
    .toFixed(2)
    .replace(".", ",")
    .replace(/\B(?=(\d{3})+(?!\d))/g, ".")
}

function daysBetween(start: string, end: string): number {
  const [y1, m1, d1] = start.split("-").map(Number)
  const [y2, m2, d2] = end.split("-").map(Number)
  const date1 = new Date(y1, m1 - 1, d1).getTime()
  const date2 = new Date(y2, m2 - 1, d2).getTime()
  return Math.round((date2 - date1) / (1000 * 60 * 60 * 24))
}
