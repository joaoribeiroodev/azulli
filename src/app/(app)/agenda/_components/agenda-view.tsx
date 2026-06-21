"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { ChevronLeft, ChevronRight } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  TransactionDetailDialog,
  type TransactionDetailData,
} from "@/components/app/transaction-detail-dialog"
import {
  formatAgendaMonthParam,
  getMonthDateBounds,
  todayLocalBR,
} from "@/lib/utils/date"
import type { AgendaFilter, CalendarEvent } from "@/lib/agenda/types"
import { cn } from "@/lib/utils"

import { ReminderDialog } from "../../metas-e-lembretes/_components/reminder-dialog"
import { AgendaLegend } from "./agenda-legend"
import { AgendaMonthGrid } from "./agenda-month-grid"
import { AgendaDayList } from "./agenda-day-list"

const MONTH_NAMES = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
]

const FILTERS: { value: AgendaFilter; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "transactions", label: "Lançamentos" },
  { value: "reminders", label: "Lembretes" },
  { value: "goals", label: "Metas" },
]

type Props = {
  events: CalendarEvent[]
  year: number
  month: number
  today: string
}

export function AgendaView({ events, year, month, today }: Props) {
  const router = useRouter()
  const bounds = getMonthDateBounds(year, month)

  const defaultSelected =
    today >= bounds.from && today <= bounds.to ? today : bounds.from

  const [selectedDate, setSelectedDate] = useState(defaultSelected)
  const [filter, setFilter] = useState<AgendaFilter>("all")
  const [txDetail, setTxDetail] = useState<TransactionDetailData | null>(null)
  const [reminderOpen, setReminderOpen] = useState(false)

  const monthLabel = `${MONTH_NAMES[month - 1]} ${year}`

  const stats = useMemo(() => {
    const inMonth = events.filter(
      (e) => e.date >= bounds.from && e.date <= bounds.to
    )
    return {
      total: inMonth.length,
      transactions: inMonth.filter((e) => e.source === "transaction").length,
      reminders: inMonth.filter((e) => e.source === "reminder").length,
      goals: inMonth.filter((e) => e.source === "goal").length,
    }
  }, [events, bounds.from, bounds.to])

  function navigateMonth(delta: number) {
    let nextMonth = month + delta
    let nextYear = year
    if (nextMonth < 1) {
      nextMonth = 12
      nextYear -= 1
    } else if (nextMonth > 12) {
      nextMonth = 1
      nextYear += 1
    }
    router.push(`/agenda?month=${formatAgendaMonthParam(nextYear, nextMonth)}`)
  }

  function handleTransactionClick(event: CalendarEvent) {
    if (!event.transaction) return
    setTxDetail(event.transaction)
  }

  return (
    <>
      <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigateMonth(-1)}
            aria-label="Mês anterior"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h2 className="min-w-[160px] text-center font-display text-lg font-semibold">
            {monthLabel}
          </h2>
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigateMonth(1)}
            aria-label="Próximo mês"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="ml-1 text-xs"
            onClick={() => {
              const t = todayLocalBR()
              const [y, m] = t.split("-").map(Number)
              router.push(`/agenda?month=${formatAgendaMonthParam(y, m)}`)
              setSelectedDate(t)
            }}
          >
            Hoje
          </Button>
        </div>

        <p className="text-xs text-muted-foreground sm:text-right">
          {stats.total} eventos · {stats.transactions} lanç. · {stats.reminders}{" "}
          lemb. · {stats.goals} metas
        </p>
      </div>

      <div className="mb-4 flex flex-wrap gap-1.5">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => setFilter(f.value)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
              filter === f.value
                ? "border-brand bg-brand-soft text-brand"
                : "border-transparent bg-muted/50 text-muted-foreground hover:bg-muted"
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      <AgendaLegend className="mb-4" />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-5">
        <div className="xl:col-span-3">
          <AgendaMonthGrid
            year={year}
            month={month}
            events={events}
            selectedDate={selectedDate}
            today={today}
            filter={filter}
            onSelectDate={setSelectedDate}
          />
        </div>
        <div className="xl:col-span-2">
          <AgendaDayList
            date={selectedDate}
            events={events}
            filter={filter}
            onTransactionClick={handleTransactionClick}
            onNewReminder={() => setReminderOpen(true)}
          />
        </div>
      </div>

      <TransactionDetailDialog
        open={txDetail !== null}
        onOpenChange={(open) => !open && setTxDetail(null)}
        transaction={txDetail}
      />

      <ReminderDialog
        mode="create"
        open={reminderOpen}
        onOpenChange={setReminderOpen}
        defaultDueDate={selectedDate}
      />
    </>
  )
}
