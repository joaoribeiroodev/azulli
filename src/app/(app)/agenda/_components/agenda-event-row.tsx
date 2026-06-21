"use client"

import { useTransition } from "react"
import Link from "next/link"
import {
  AlertCircle,
  ArrowDownRight,
  ArrowUpRight,
  Bell,
  Check,
  Target,
} from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { formatBRL } from "@/lib/utils/currency"
import { toggleReminderDoneAction } from "@/lib/reminders/actions"
import { PRIORITY_LABELS } from "@/lib/reminders/schemas"
import { cn } from "@/lib/utils"
import { getAgendaKindStyles, getAgendaLegendLabel } from "@/lib/agenda/legend"
import type { CalendarEvent, CalendarEventKind } from "@/lib/agenda/types"

const KIND_ICONS: Record<
  CalendarEventKind,
  typeof ArrowUpRight
> = {
  income: ArrowUpRight,
  expense: ArrowDownRight,
  overdue: AlertCircle,
  reminder: Bell,
  goal_deadline: Target,
}

type Props = {
  event: CalendarEvent
  onTransactionClick?: (event: CalendarEvent) => void
}

export function AgendaEventRow({ event, onTransactionClick }: Props) {
  const [isPending, startTransition] = useTransition()
  const styles = getAgendaKindStyles(event.kind)
  const Icon = KIND_ICONS[event.kind]

  function handleToggleReminder(checked: boolean) {
    if (!event.reminderId) return
    startTransition(async () => {
      const result = await toggleReminderDoneAction(event.reminderId!, checked)
      if (!result.success) {
        toast.error(result.error)
      } else if (checked) {
        toast.success("Lembrete concluído")
      }
    })
  }

  const content = (
    <div
      className={cn(
        "flex items-start gap-3 rounded-lg border p-3 transition-colors",
        styles.rowClass,
        event.source === "transaction" && onTransactionClick && "cursor-pointer hover:opacity-90"
      )}
      onClick={() => {
        if (event.source === "transaction" && event.transaction && onTransactionClick) {
          onTransactionClick(event)
        }
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" && event.source === "transaction" && onTransactionClick) {
          onTransactionClick(event)
        }
      }}
      role={event.source === "transaction" && onTransactionClick ? "button" : undefined}
      tabIndex={event.source === "transaction" && onTransactionClick ? 0 : undefined}
    >
      {event.source === "reminder" && (
        <Checkbox
          checked={false}
          onCheckedChange={(c) => handleToggleReminder(c === true)}
          disabled={isPending}
          className="mt-0.5 shrink-0"
          onClick={(e) => e.stopPropagation()}
        />
      )}

      <div
        className={cn(
          "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md border bg-background/60",
          event.source === "reminder" && "hidden sm:flex"
        )}
      >
        <Icon className={cn("h-3.5 w-3.5", styles.iconClass)} />
      </div>

      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-medium leading-tight">{event.title}</p>
          {event.amount != null && (
            <span className="shrink-0 text-sm font-semibold tabular-nums">
              {formatBRL(event.amount)}
            </span>
          )}
        </div>

        {event.subtitle && (
          <p className="text-xs text-muted-foreground">{event.subtitle}</p>
        )}

        <div className="flex flex-wrap items-center gap-1.5">
          <Badge variant="outline" className="text-[10px] h-5 px-1.5">
            {getAgendaLegendLabel(event.kind)}
          </Badge>
          {event.priority && (
            <Badge variant="outline" className="text-[10px] h-5 px-1.5">
              {PRIORITY_LABELS[event.priority]}
            </Badge>
          )}
        </div>
      </div>

      {event.source !== "transaction" && (
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="shrink-0 h-8 text-xs"
        >
          <Link href={event.href}>Ver</Link>
        </Button>
      )}
    </div>
  )

  if (event.source === "reminder") {
    return (
      <div className="space-y-2">
        {content}
        <Button
          variant="outline"
          size="sm"
          className="w-full sm:hidden gap-2"
          disabled={isPending}
          onClick={() => handleToggleReminder(true)}
        >
          <Check className="h-3.5 w-3.5" />
          Concluir
        </Button>
      </div>
    )
  }

  return content
}
