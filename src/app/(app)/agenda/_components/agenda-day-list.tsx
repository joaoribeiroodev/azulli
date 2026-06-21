"use client"

import Link from "next/link"
import { Bell, Plus } from "lucide-react"

import { Button } from "@/components/ui/button"
import { formatDateBR, getWeekdayLabel, todayLocalBR } from "@/lib/utils/date"
import type { AgendaFilter, CalendarEvent } from "@/lib/agenda/types"
import { AgendaEventRow } from "./agenda-event-row"

type Props = {
  date: string
  events: CalendarEvent[]
  filter: AgendaFilter
  onTransactionClick?: (event: CalendarEvent) => void
  onNewReminder?: () => void
}

function filterEvents(events: CalendarEvent[], filter: AgendaFilter) {
  if (filter === "all") return events
  if (filter === "transactions") {
    return events.filter((e) => e.source === "transaction")
  }
  if (filter === "reminders") {
    return events.filter((e) => e.source === "reminder")
  }
  return events.filter((e) => e.source === "goal")
}

export function AgendaDayList({
  date,
  events,
  filter,
  onTransactionClick,
  onNewReminder,
}: Props) {
  const today = todayLocalBR()
  const dayEvents = filterEvents(
    events.filter((e) => e.date === date),
    filter
  )

  const label =
    date === today
      ? "Hoje"
      : `${getWeekdayLabel(date)}, ${formatDateBR(date)}`

  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display text-lg font-semibold">{label}</h2>
          <p className="text-xs text-muted-foreground">
            {dayEvents.length === 0
              ? "Nenhum evento neste dia"
              : `${dayEvents.length} ${
                  dayEvents.length === 1 ? "evento" : "eventos"
                }`}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {onNewReminder && (
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={onNewReminder}
            >
              <Bell className="h-3.5 w-3.5" />
              Lembrete
            </Button>
          )}
          <Button asChild variant="outline" size="sm" className="gap-1.5">
            <Link href="/lancamentos">
              <Plus className="h-3.5 w-3.5" />
              Lançamento
            </Link>
          </Button>
        </div>
      </div>

      {dayEvents.length === 0 ? (
        <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          Selecione outro dia ou crie um lembrete ou lançamento.
        </p>
      ) : (
        <div className="space-y-2">
          {dayEvents.map((event) => (
            <AgendaEventRow
              key={event.id}
              event={event}
              onTransactionClick={onTransactionClick}
            />
          ))}
        </div>
      )}
    </div>
  )
}
