import Link from "next/link"
import {
  ArrowDownRight,
  ArrowUpRight,
  Bell,
  Calendar,
  ChevronRight,
  AlertCircle,
  Target,
} from "lucide-react"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { getUpcomingCalendarEvents } from "@/lib/agenda/queries"
import { formatBRL } from "@/lib/utils/currency"
import { formatDateBR, getWeekdayLabel, todayLocalBR } from "@/lib/utils/date"
import { getAgendaKindStyles } from "@/lib/agenda/legend"
import type { CalendarEvent } from "@/lib/agenda/types"
import { cn } from "@/lib/utils"

const KIND_ICON = {
  income: ArrowUpRight,
  expense: ArrowDownRight,
  overdue: AlertCircle,
  reminder: Bell,
  goal_deadline: Target,
} as const

export async function AgendaUpcomingCard() {
  const events = await getUpcomingCalendarEvents(7)
  const today = todayLocalBR()

  if (events.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="h-4 w-4 text-brand" />
            Esta semana
          </CardTitle>
          <CardDescription>Nada agendado nos próximos 7 dias</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild variant="outline" size="sm">
            <Link href="/agenda">Abrir agenda</Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  const grouped = groupByDate(events)

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-2">
        <div>
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="h-4 w-4 text-brand" />
            Esta semana
          </CardTitle>
          <CardDescription>
            {events.length} eventos nos próximos 7 dias
          </CardDescription>
        </div>
        <Button asChild variant="ghost" size="sm" className="shrink-0 gap-1">
          <Link href="/agenda">
            Ver tudo
            <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {grouped.slice(0, 4).map(({ date, items }) => (
          <div key={date}>
            <p className="mb-1.5 text-xs font-medium text-muted-foreground">
              {date === today
                ? "Hoje"
                : `${getWeekdayLabel(date)} · ${formatDateBR(date)}`}
            </p>
            <ul className="space-y-1.5">
              {items.slice(0, 3).map((event) => (
                <UpcomingRow key={event.id} event={event} />
              ))}
            </ul>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

function UpcomingRow({ event }: { event: CalendarEvent }) {
  const Icon = KIND_ICON[event.kind]
  const styles = getAgendaKindStyles(event.kind)
  return (
    <li>
      <Link
        href={event.href}
        className="flex items-center gap-2 rounded-md border bg-muted/20 px-2.5 py-2 text-sm hover:bg-muted/50 transition-colors"
      >
        <Icon className={cn("h-3.5 w-3.5 shrink-0", styles.iconClass)} />
        <span className="min-w-0 flex-1 truncate">{event.title}</span>
        {event.amount != null && (
          <span className="shrink-0 text-xs font-medium tabular-nums">
            {formatBRL(event.amount)}
          </span>
        )}
      </Link>
    </li>
  )
}

function groupByDate(events: CalendarEvent[]) {
  const map = new Map<string, CalendarEvent[]>()
  for (const e of events) {
    const list = map.get(e.date) ?? []
    list.push(e)
    map.set(e.date, list)
  }
  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, items]) => ({ date, items }))
}
