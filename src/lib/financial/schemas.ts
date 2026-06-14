import { z } from "zod"

export const transactionTypeSchema = z.enum(["income", "expense"])
export const transactionStatusSchema = z.enum(["pending", "paid", "overdue"])

export const createTransactionSchema = z
  .object({
    type: transactionTypeSchema,
    amount: z
      .number({ message: "Informe o valor" })
      .positive("O valor deve ser maior que zero")
      .max(99_999_999.99, "Valor acima do limite"),
    due_date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida"),
    description: z
      .string()
      .trim()
      .max(280, "Descrição muito longa")
      .optional()
      .or(z.literal("")),
    customer_id: z.string().uuid().optional().nullable(),
    supplier_id: z.string().uuid().optional().nullable(),
    status: z.enum(["pending", "paid"]).default("pending"),
  })
  .refine(
    (data) => {
      // Receita não pode ter fornecedor; despesa não pode ter cliente
      if (data.type === "income" && data.supplier_id) return false
      if (data.type === "expense" && data.customer_id) return false
      return true
    },
    {
      message:
        "Receita só vincula cliente; despesa só vincula fornecedor.",
      path: ["type"],
    }
  )

export type CreateTransactionInput = z.infer<typeof createTransactionSchema>

export const updateTransactionSchema = z.object({
  id: z.string().uuid(),
  type: transactionTypeSchema.optional(),
  amount: z.number().positive().max(99_999_999.99).optional(),
  due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  description: z.string().trim().max(280).optional().or(z.literal("")),
  customer_id: z.string().uuid().optional().nullable(),
  supplier_id: z.string().uuid().optional().nullable(),
  status: z.enum(["pending", "paid"]).optional(),
})

export type UpdateTransactionInput = z.infer<typeof updateTransactionSchema>

// ---------------------------------------------------------------------------
// Customers
// ---------------------------------------------------------------------------

export const createCustomerSchema = z.object({
  name: z.string().trim().min(2, "Nome muito curto").max(120),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("E-mail inválido")
    .optional()
    .or(z.literal("")),
  phone: z.string().trim().max(20).optional().or(z.literal("")),
  document: z.string().trim().max(20).optional().or(z.literal("")),
})

export type CreateCustomerInput = z.infer<typeof createCustomerSchema>

// ---------------------------------------------------------------------------
// Suppliers
// ---------------------------------------------------------------------------

export const createSupplierSchema = z.object({
  name: z.string().trim().min(2, "Nome muito curto").max(120),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("E-mail inválido")
    .optional()
    .or(z.literal("")),
  phone: z.string().trim().max(20).optional().or(z.literal("")),
  document: z.string().trim().max(20).optional().or(z.literal("")),
  notes: z.string().trim().max(500).optional().or(z.literal("")),
})

export type CreateSupplierInput = z.infer<typeof createSupplierSchema>
