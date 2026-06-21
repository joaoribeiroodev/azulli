import "server-only"

import { listGoals } from "@/lib/goals/queries"
import { listReminders } from "@/lib/reminders/queries"
import { addDaysYMD, formatDateBR, todayLocalBR } from "@/lib/utils/date"

/** Máximo de alertas de agenda no sino — evita sobrecarga visual. */
export const AGENDA_ALERTS_LIMIT = 5

/** Metas com prazo nos próximos N dias (além de vencidas). */
const GOAL_LOOKAHEAD_DAYS = 3

export type AgendaAlertUrgency = "overdue" | "today" | "soon"

export type AgendaAlert = {
  id: string
  source: "reminder" | "goal"
  urgency: AgendaAlertUrgency
  title: string
  subtitle: string
  href: string
  date: string
}

function urgencySort(u: AgendaAlertUrgency): number {
  if (u === "overdue") return 0
  if (u === "today") return 1
  return 2
}

function reminderUrgency(
  dueDate: string,
  today: string
): AgendaAlertUrgency | null {
  if (dueDate < today) return "overdue"
  if (dueDate === today) return "today"
  return null
}

function reminderSubtitle(
  urgency: AgendaAlertUrgency,
  dueDate: string,
  today: string
): string {
  if (urgency === "overdue") {
    const days = daysBetween(dueDate, today)
    return days === 1 ? "Venceu ontem" : `Venceu há ${days} dias`
  }
  if (urgency === "today") return "Vence hoje"
  return `Amanhã · ${formatDateBR(dueDate)}`
}

function goalSubtitle(
  urgency: AgendaAlertUrgency,
  periodEnd: string,
  progressPercent: number
): string {
  const pct = Math.round(progressPercent)
  if (urgency === "overdue") {
    return `Prazo passou · ${pct}% concluído`
  }
  if (urgency === "today") {
    return `Termina hoje · ${pct}% concluído`
  }
  return `Termina em ${formatDateBR(periodEnd)} · ${pct}% concluído`
}

function daysBetween(start: string, end: string): number {
  const [y1, m1, d1] = start.split("-").map(Number)
  const [y2, m2, d2] = end.split("-").map(Number)
  const t1 = new Date(y1, m1 - 1, d1).getTime()
  const t2 = new Date(y2, m2 - 1, d2).getTime()
  return Math.max(1, Math.round((t2 - t1) / (1000 * 60 * 60 * 24)))
}

/**
 * Alertas acionáveis de lembretes e metas para o sino de notificações.
 *
 * Regras conservadoras:
 * - Lembretes: vencidos ou que vencem hoje; amanhã só se prioridade alta.
 * - Metas: prazo vencido ou nos próximos 3 dias, ainda não atingidas.
 */
export async function getAgendaAlerts(): Promise<AgendaAlert[]> {
  const today = todayLocalBR()
  const tomorrow = addDaysYMD(today, 1)
  const goalHorizon = addDaysYMD(today, GOAL_LOOKAHEAD_DAYS)

  const [reminders, goals] = await Promise.all([
    listReminders(),
    listGoals(),
  ])

  const alerts: AgendaAlert[] = []

  for (const reminder of reminders) {
    let urgency = reminderUrgency(reminder.due_date, today)

    if (
      !urgency &&
      reminder.due_date === tomorrow &&
      reminder.priority === "high"
    ) {
      urgency = "soon"
    }

    if (!urgency) continue

    alerts.push({
      id: `reminder-${reminder.id}`,
      source: "reminder",
      urgency,
      title: reminder.title,
      subtitle: reminderSubtitle(urgency, reminder.due_date, today),
      href: "/metas-e-lembretes?tab=lembretes",
      date: reminder.due_date,
    })
  }

  for (const goal of goals) {
    if (goal.is_archived || goal.progress_percent >= 100) continue

    let urgency: AgendaAlertUrgency | null = null
    if (goal.period_end < today) {
      urgency = "overdue"
    } else if (goal.period_end === today) {
      urgency = "today"
    } else if (goal.period_end <= goalHorizon) {
      urgency = "soon"
    }

    if (!urgency) continue

    alerts.push({
      id: `goal-${goal.id}`,
      source: "goal",
      urgency,
      title: goal.title,
      subtitle: goalSubtitle(urgency, goal.period_end, goal.progress_percent),
      href: "/metas-e-lembretes?tab=metas",
      date: goal.period_end,
    })
  }

  alerts.sort((a, b) => {
    const byUrgency = urgencySort(a.urgency) - urgencySort(b.urgency)
    if (byUrgency !== 0) return byUrgency
    return a.date.localeCompare(b.date)
  })

  return alerts.slice(0, AGENDA_ALERTS_LIMIT)
}
