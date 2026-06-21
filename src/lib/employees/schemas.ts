import { z } from "zod"

const employeeBaseSchema = z.object({
  name: z.string().trim().min(2, "Nome muito curto").max(160),
  role: z.string().trim().max(80).optional().or(z.literal("")),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("E-mail inválido")
    .optional()
    .or(z.literal("")),
  phone: z.string().trim().max(20).optional().or(z.literal("")),
  document: z.string().trim().max(20).optional().or(z.literal("")),
  hire_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida")
    .optional()
    .or(z.literal("")),
  salary: z
    .number()
    .nonnegative("Salário não pode ser negativo")
    .max(99_999_999.99)
    .optional()
    .nullable(),
  salary_day: z
    .number()
    .int("Use um dia inteiro")
    .min(1, "Dia mínimo: 1")
    .max(31, "Dia máximo: 31")
    .optional()
    .nullable(),
  notes: z.string().trim().max(500).optional().or(z.literal("")),
  is_active: z.boolean(),
})

const salaryDayRefinement = (
  data: {
    salary?: number | null
    salary_day?: number | null
  },
  ctx: z.RefinementCtx
) => {
  const hasSalary = data.salary != null && data.salary > 0
  if (hasSalary && !data.salary_day) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["salary_day"],
      message: "Informe o dia de pagamento do salário",
    })
  }
  if (!hasSalary && data.salary_day) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["salary_day"],
      message: "Defina um salário base para informar o dia de pagamento",
    })
  }
}

export const createEmployeeSchema = employeeBaseSchema.superRefine(salaryDayRefinement)
export type CreateEmployeeInput = z.infer<typeof createEmployeeSchema>

export const updateEmployeeSchema = z
  .object({
    id: z.string().uuid(),
    ...employeeBaseSchema.shape,
  })
  .superRefine(salaryDayRefinement)
export type UpdateEmployeeInput = z.infer<typeof updateEmployeeSchema>
