import { Target, Trophy, Bell, AlertCircle } from "lucide-react"
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { getGoalsStats } from "@/lib/goals/queries"
import { getRemindersStats } from "@/lib/reminders/queries"

export async function GoalsAndRemindersStats() {
  const [goalStats, reminderStats] = await Promise.all([
    getGoalsStats(),
    getRemindersStats(),
  ])

  return (
    <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      <Card>
        <CardHeader className="pb-2">
          <CardDescription className="text-xs">Metas ativas</CardDescription>
          <CardTitle className="text-2xl font-display flex items-center gap-2">
            <Target className="h-5 w-5 text-brand" />
            {goalStats.totalActive}
          </CardTitle>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardDescription className="text-xs">Metas batidas</CardDescription>
          <CardTitle className="text-2xl font-display flex items-center gap-2">
            <Trophy className="h-5 w-5 text-success-ink" />
            {goalStats.totalAchieved}
          </CardTitle>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardDescription className="text-xs">
            Lembretes pendentes
          </CardDescription>
          <CardTitle className="text-2xl font-display flex items-center gap-2">
            <Bell className="h-5 w-5 text-amber-500" />
            {reminderStats.totalPending}
          </CardTitle>
        </CardHeader>
      </Card>

      <Card
        className={
          reminderStats.overdueToday > 0
            ? "ring-1 ring-destructive/30 bg-destructive/5"
            : undefined
        }
      >
        <CardHeader className="pb-2">
          <CardDescription className="text-xs">Vencidos hoje</CardDescription>
          <CardTitle className="text-2xl font-display flex items-center gap-2">
            <AlertCircle
              className={
                "h-5 w-5 " +
                (reminderStats.overdueToday > 0
                  ? "text-destructive"
                  : "text-muted-foreground")
              }
            />
            {reminderStats.overdueToday}
          </CardTitle>
        </CardHeader>
      </Card>
    </section>
  )
}
