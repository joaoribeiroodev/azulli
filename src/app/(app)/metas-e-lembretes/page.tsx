import { Suspense } from "react"
import { Target, Bell } from "lucide-react"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"

import { BackLink } from "@/components/app/back-link"

import { listGoals } from "@/lib/goals/queries"
import { listReminders } from "@/lib/reminders/queries"

import { GoalsAndRemindersStats } from "./_components/stats"
import { GoalsTab } from "./_components/goals-tab"
import { RemindersTab } from "./_components/reminders-tab"

export const metadata = { title: "Metas e lembretes — Azulli" }

export default async function MetasELembretesPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>
}) {
  const sp = await searchParams
  const initialTab = sp.tab === "lembretes" ? "lembretes" : "metas"

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      <header className="mb-4 sm:mb-6">
        <BackLink href="/dashboard" className="mb-2">
          Voltar ao painel
        </BackLink>
        <h1 className="text-2xl lg:text-3xl font-display font-bold text-brand-ink">
          Metas e lembretes
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Defina objetivos pro seu negócio e não perca prazos.
        </p>
      </header>

      <Suspense fallback={<Skeleton className="h-24 mb-6" />}>
        <div className="mb-6">
          <GoalsAndRemindersStats />
        </div>
      </Suspense>

      <Tabs defaultValue={initialTab} className="block w-full">
        <div className="block mb-4 sm:mb-6">
          <TabsList
            className="
              !grid !grid-cols-2 !w-full !h-auto
              gap-1 p-1.5
              bg-muted/40 border
              sm:max-w-sm
            "
          >
            <TabsTrigger
              value="metas"
              className="
                flex flex-col sm:flex-row items-center justify-center
                gap-1 sm:gap-1.5
                py-2 px-1 sm:px-3
                text-[11px] sm:text-sm
                min-w-0
                data-[state=active]:shadow-sm
              "
            >
              <Target className="h-4 w-4 sm:h-3.5 sm:w-3.5 shrink-0" />
              <span className="truncate">Metas</span>
            </TabsTrigger>
            <TabsTrigger
              value="lembretes"
              className="
                flex flex-col sm:flex-row items-center justify-center
                gap-1 sm:gap-1.5
                py-2 px-1 sm:px-3
                text-[11px] sm:text-sm
                min-w-0
                data-[state=active]:shadow-sm
              "
            >
              <Bell className="h-4 w-4 sm:h-3.5 sm:w-3.5 shrink-0" />
              <span className="truncate">Lembretes</span>
            </TabsTrigger>
          </TabsList>
        </div>

        <div className="block w-full">
          <TabsContent value="metas" className="block mt-0">
            <Suspense fallback={<Skeleton className="h-96" />}>
              <GoalsSection />
            </Suspense>
          </TabsContent>

          <TabsContent value="lembretes" className="block mt-0">
            <Suspense fallback={<Skeleton className="h-96" />}>
              <RemindersSection />
            </Suspense>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  )
}

async function GoalsSection() {
  const allGoals = await listGoals({ includeArchived: true })
  const goals = allGoals.filter((g) => !g.is_archived)
  return <GoalsTab goals={goals} goalsWithArchived={allGoals} />
}

async function RemindersSection() {
  const [reminders, remindersWithDone] = await Promise.all([
    listReminders({ includeDone: false }),
    listReminders({ includeDone: true }),
  ])
  return (
    <RemindersTab
      reminders={reminders}
      remindersWithDone={remindersWithDone}
    />
  )
}
