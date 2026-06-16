"use client"

import { useState, useTransition } from "react"
import {
  AlertCircle,
  Calendar,
  MoreVertical,
  Pencil,
  Trash2,
} from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
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
  toggleReminderDoneAction,
  deleteReminderAction,
} from "@/lib/reminders/actions"
import { PRIORITY_LABELS } from "@/lib/reminders/schemas"
import { formatDateBR, todayLocalBR } from "@/lib/utils/date"
import { cn } from "@/lib/utils"
import type { ReminderRow as ReminderRowData } from "@/lib/reminders/queries"

import { ReminderDialog } from "./reminder-dialog"

const PRIORITY_BORDER = {
  low: "border-l-muted-foreground/30",
  medium: "border-l-amber-500",
  high: "border-l-destructive",
} as const

const PRIORITY_BADGE = {
  low: "bg-muted text-muted-foreground",
  medium:
    "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-200 dark:border-amber-900/40",
  high: "bg-destructive/10 text-destructive border-destructive/30",
} as const

export function ReminderRow({ reminder }: { reminder: ReminderRowData }) {
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  const today = todayLocalBR()
  const isOverdue =
    !reminder.is_done && reminder.due_date < today
  const isToday =
    !reminder.is_done && reminder.due_date === today
  const daysToGo = !reminder.is_done
    ? daysBetween(today, reminder.due_date)
    : 0

  function handleToggle(checked: boolean) {
    startTransition(async () => {
      const result = await toggleReminderDoneAction(reminder.id, checked)
      if (!result.success) {
        toast.error(result.error)
        return
      }
      if (checked) {
        toast.success("Lembrete concluído ✅")
      }
    })
  }

  function handleDelete() {
    setDeleteOpen(false)
    startTransition(async () => {
      const result = await deleteReminderAction(reminder.id)
      if (!result.success) {
        toast.error(result.error)
        return
      }
      toast.success("Lembrete excluído.")
    })
  }

  return (
    <>
      <div
        className={cn(
          "rounded-lg border border-l-4 bg-card p-3 sm:p-4 transition-all duration-300",
          PRIORITY_BORDER[reminder.priority],
          reminder.is_done && "opacity-60",
          isOverdue && "ring-1 ring-destructive/40 bg-destructive/5"
        )}
      >
        <div className="flex items-start gap-3">
          <Checkbox
            checked={reminder.is_done}
            onCheckedChange={(c: boolean | "indeterminate") => handleToggle(c === true)}
            disabled={isPending}
            className="mt-0.5 shrink-0"
          />

          <div className="flex-1 min-w-0 space-y-1.5">
            <div className="flex items-start justify-between gap-2 flex-wrap">
              <h3
                className={cn(
                  "text-sm font-medium leading-tight",
                  reminder.is_done && "line-through text-muted-foreground"
                )}
              >
                {reminder.title}
              </h3>

              <div className="flex items-center gap-1.5 shrink-0">
                <Badge
                  className={cn(
                    "text-[10px] px-1.5 py-0 h-4",
                    PRIORITY_BADGE[reminder.priority]
                  )}
                  variant="outline"
                >
                  {PRIORITY_LABELS[reminder.priority]}
                </Badge>
              </div>
            </div>

            {reminder.description && (
              <p
                className={cn(
                  "text-xs text-muted-foreground whitespace-pre-wrap",
                  reminder.is_done && "line-through"
                )}
              >
                {reminder.description}
              </p>
            )}

            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-1.5 text-xs">
                {isOverdue ? (
                  <span className="inline-flex items-center gap-1 text-destructive font-medium">
                    <AlertCircle className="h-3 w-3" />
                    Vencido {Math.abs(daysToGo)}{" "}
                    {Math.abs(daysToGo) === 1 ? "dia" : "dias"} atrás
                  </span>
                ) : isToday ? (
                  <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 font-medium">
                    <AlertCircle className="h-3 w-3" />
                    Vence hoje
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    {formatDateBR(reminder.due_date)}
                    {!reminder.is_done && daysToGo > 0 && (
                      <span className="text-[10px]">
                        ({daysToGo} {daysToGo === 1 ? "dia" : "dias"})
                      </span>
                    )}
                  </span>
                )}
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    disabled={isPending}
                  >
                    <MoreVertical className="h-3.5 w-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setEditOpen(true)}>
                    <Pencil className="mr-2 h-4 w-4" />
                    Editar
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
          </div>
        </div>
      </div>

      {editOpen && (
        <ReminderDialog
          mode="edit"
          open={editOpen}
          onOpenChange={setEditOpen}
          reminder={reminder}
        />
      )}

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir este lembrete?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita.
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
    </>
  )
}

function daysBetween(start: string, end: string): number {
  const [y1, m1, d1] = start.split("-").map(Number)
  const [y2, m2, d2] = end.split("-").map(Number)
  const date1 = new Date(y1, m1 - 1, d1).getTime()
  const date2 = new Date(y2, m2 - 1, d2).getTime()
  return Math.round((date2 - date1) / (1000 * 60 * 60 * 24))
}
