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
  notes: z.string().trim().max(500).optional().or(z.literal("")),
  is_active: z.boolean().default(true),
})

export const createEmployeeSchema = employeeBaseSchema
export type CreateEmployeeInput = z.infer<typeof createEmployeeSchema>

export const updateEmployeeSchema = z.object({
  id: z.string().uuid(),
  ...employeeBaseSchema.shape,
})
export type UpdateEmployeeInput = z.infer<typeof updateEmployeeSchema>
