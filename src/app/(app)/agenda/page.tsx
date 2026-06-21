import { Suspense } from "react"

import { BackLink } from "@/components/app/back-link"
import { Skeleton } from "@/components/ui/skeleton"
import { getCalendarEvents } from "@/lib/agenda/queries"
import {
  getMonthDateBounds,
  parseAgendaMonthParam,
  todayLocalBR,
} from "@/lib/utils/date"

import { AgendaView } from "./_components/agenda-view"

export const metadata = { title: "Agenda — Azulli" }

export default async function AgendaPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>
}) {
  const sp = await searchParams
  const { year, month } = parseAgendaMonthParam(sp.month)
  const today = todayLocalBR()

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      <header className="mb-4 sm:mb-6">
        <BackLink href="/dashboard" className="mb-2">
          Voltar ao painel
        </BackLink>
        <h1 className="text-2xl lg:text-3xl font-display font-bold text-brand-ink">
          Agenda financeira
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Lançamentos pendentes, lembretes e prazos de metas em um só lugar.
        </p>
      </header>

      <Suspense fallback={<AgendaSkeleton />}>
        <AgendaContent year={year} month={month} today={today} />
      </Suspense>
    </div>
  )
}

async function AgendaContent({
  year,
  month,
  today,
}: {
  year: number
  month: number
  today: string
}) {
  const { from, to } = getMonthDateBounds(year, month)
  const events = await getCalendarEvents({ from, to })

  return (
    <AgendaView events={events} year={year} month={month} today={today} />
  )
}

function AgendaSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-10 w-full max-w-md" />
      <Skeleton className="h-8 w-72" />
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-5">
        <Skeleton className="h-[420px] xl:col-span-3" />
        <Skeleton className="h-[420px] xl:col-span-2" />
      </div>
    </div>
  )
}
