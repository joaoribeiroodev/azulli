import { z } from "zod"

export const GOAL_KINDS = ["revenue", "profit", "sales_count", "custom"] as const
export type GoalKind = (typeof GOAL_KINDS)[number]

const goalBaseSchema = z.object({
  title: z.string().trim().min(2, "Título muito curto").max(120),
  kind: z.enum(GOAL_KINDS),
  target_value: z
    .number()
    .positive("Meta deve ser positiva")
    .max(999_999_999.99),
  current_value: z.number().nonnegative().max(999_999_999.99),
  period_start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida"),
  period_end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida"),
  notes: z.string().trim().max(500).optional().or(z.literal("")),
}).refine((d) => d.period_end >= d.period_start, {
  message: "Data final precisa ser após a inicial",
  path: ["period_end"],
})

export const createGoalSchema = goalBaseSchema
export type CreateGoalInput = z.infer<typeof createGoalSchema>

export const updateGoalSchema = z.object({
  id: z.string().uuid(),
  title: z.string().trim().min(2).max(120),
  kind: z.enum(GOAL_KINDS),
  target_value: z.number().positive().max(999_999_999.99),
  current_value: z.number().nonnegative().max(999_999_999.99),
  period_start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  period_end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  notes: z.string().trim().max(500).optional().or(z.literal("")),
  is_archived: z.boolean().default(false),
}).refine((d) => d.period_end >= d.period_start, {
  message: "Data final precisa ser após a inicial",
  path: ["period_end"],
})
export type UpdateGoalInput = z.infer<typeof updateGoalSchema>

export const GOAL_KIND_LABELS: Record<GoalKind, string> = {
  revenue: "Receita do período",
  profit: "Lucro do período",
  sales_count: "Quantidade de vendas",
  custom: "Personalizada (manual)",
}

export const GOAL_KIND_HINTS: Record<GoalKind, string> = {
  revenue: "Soma das receitas pagas no período.",
  profit: "Receitas pagas menos despesas pagas no período.",
  sales_count: "Quantidade de receitas pagas no período.",
  custom: "Você atualiza o progresso manualmente.",
}
