import { z } from "zod"

export const REMINDER_PRIORITIES = ["low", "medium", "high"] as const
export type ReminderPriority = (typeof REMINDER_PRIORITIES)[number]

const reminderBaseSchema = z.object({
  title: z.string().trim().min(2, "Título muito curto").max(160),
  description: z.string().trim().max(500).optional().or(z.literal("")),
  due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida"),
  priority: z.enum(REMINDER_PRIORITIES),
})

export const createReminderSchema = reminderBaseSchema
export type CreateReminderInput = z.infer<typeof createReminderSchema>

export const updateReminderSchema = z.object({
  id: z.string().uuid(),
  ...reminderBaseSchema.shape,
  is_done: z.boolean().default(false),
})
export type UpdateReminderInput = z.infer<typeof updateReminderSchema>

export const PRIORITY_LABELS: Record<ReminderPriority, string> = {
  low: "Baixa",
  medium: "Média",
  high: "Alta",
}
