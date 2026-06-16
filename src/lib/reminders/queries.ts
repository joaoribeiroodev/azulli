import "server-only"
import { createClient } from "@/lib/supabase/server"
import { todayLocalBR } from "@/lib/utils/date"
import type { ReminderPriority } from "@/lib/reminders/schemas"

export type ReminderRow = {
  id: string
  title: string
  description: string | null
  due_date: string
  is_done: boolean
  priority: ReminderPriority
  created_at: string
}

export async function listReminders(opts?: {
  includeDone?: boolean
}): Promise<ReminderRow[]> {
  const supabase = await createClient()

  let query = supabase
    .from("reminders")
    .select(
      "id, title, description, due_date, is_done, priority, created_at"
    )
    .order("is_done", { ascending: true })
    .order("due_date", { ascending: true })

  if (!opts?.includeDone) {
    query = query.eq("is_done", false)
  }

  const { data, error } = await query
  if (error || !data) return []

  return data.map((r) => ({
    ...r,
    priority: r.priority as ReminderPriority,
  }))
}

export type RemindersStats = {
  totalPending: number
  overdueToday: number  // vencidos (data <= hoje, não concluídos)
}

export async function getRemindersStats(): Promise<RemindersStats> {
  const supabase = await createClient()
  const { data } = await supabase
    .from("reminders")
    .select("due_date, is_done")
    .eq("is_done", false)

  const today = todayLocalBR()
  let pending = 0
  let overdue = 0
  for (const r of data ?? []) {
    pending += 1
    if (r.due_date <= today) overdue += 1
  }
  return { totalPending: pending, overdueToday: overdue }
}
