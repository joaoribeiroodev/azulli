"use client"

import { getMonthGridDays, getWeekdayLabel } from "@/lib/utils/date"
import { cn } from "@/lib/utils"
import { AGENDA_DOT_COLORS } from "@/lib/agenda/legend"
import type { AgendaFilter, CalendarEvent } from "@/lib/agenda/types"

const WEEKDAY_HEADERS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"]

type Props = {
  year: number
  month: number
  events: CalendarEvent[]
  selectedDate: string
  today: string
  filter: AgendaFilter
  onSelectDate: (date: string) => void
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

export function AgendaMonthGrid({
  year,
  month,
  events,
  selectedDate,
  today,
  filter,
  onSelectDate,
}: Props) {
  const cells = getMonthGridDays(year, month)
  const filtered = filterEvents(events, filter)

  const byDate = new Map<string, CalendarEvent[]>()
  for (const e of filtered) {
    const list = byDate.get(e.date) ?? []
    list.push(e)
    byDate.set(e.date, list)
  }

  return (
    <div className="rounded-xl border bg-card p-3 sm:p-4">
      <div className="mb-2 grid grid-cols-7 gap-1">
        {WEEKDAY_HEADERS.map((label) => (
          <div
            key={label}
            className="py-1 text-center text-[11px] font-medium text-muted-foreground"
          >
            {label}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {cells.map(({ date, inMonth }) => {
          const dayEvents = byDate.get(date) ?? []
          const isSelected = date === selectedDate
          const isToday = date === today
          const dayNum = Number(date.slice(8, 10))

          const kinds = [...new Set(dayEvents.map((e) => e.kind))].slice(0, 4)

          return (
            <button
              key={date}
              type="button"
              onClick={() => onSelectDate(date)}
              className={cn(
                "relative flex min-h-[52px] sm:min-h-[64px] flex-col items-center rounded-lg border p-1 transition-colors",
                inMonth
                  ? "bg-background hover:bg-muted/60"
                  : "bg-muted/20 text-muted-foreground/60 hover:bg-muted/40",
                isSelected && "border-brand bg-brand-soft ring-1 ring-brand/30",
                isToday && !isSelected && "border-brand/40"
              )}
              aria-label={`${dayNum}, ${getWeekdayLabel(date)}${
                dayEvents.length ? `, ${dayEvents.length} eventos` : ""
              }`}
              aria-pressed={isSelected}
            >
              <span
                className={cn(
                  "flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium",
                  isToday && "bg-brand text-primary-foreground",
                  isSelected && !isToday && "text-brand font-semibold"
                )}
              >
                {dayNum}
              </span>

              {kinds.length > 0 && (
                <div className="mt-auto flex flex-wrap justify-center gap-0.5 pb-0.5">
                  {kinds.map((kind) => (
                    <span
                      key={kind}
                      className={cn("h-1.5 w-1.5 rounded-full", AGENDA_DOT_COLORS[kind])}
                    />
                  ))}
                </div>
              )}

              {dayEvents.length > 1 && (
                <span className="absolute right-1 top-1 text-[9px] font-medium text-muted-foreground">
                  {dayEvents.length}
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
