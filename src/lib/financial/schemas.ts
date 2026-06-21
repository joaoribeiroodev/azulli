import { z } from "zod"
import { transactionItemInputSchema } from "@/lib/products/schemas"

export const transactionTypeSchema = z.enum(["income", "expense"])
export const transactionStatusSchema = z.enum(["pending", "paid", "overdue"])

// ---------------------------------------------------------------------------
// Sugestões de categorias
// ---------------------------------------------------------------------------

export const CATEGORY_SUGGESTIONS = {
  income: [
    "Venda de produtos",
    "Prestação de serviços",
    "Comissões",
    "Outros recebimentos",
  ],
  expense: [
    "Compras / Mercadorias",
    "Aluguel / Imóvel",
    "Marketing / Publicidade",
    "Salários / Pró-labore",
    "Impostos / Taxas",
    "Transporte / Frete",
    "Materiais / Suprimentos",
    "Energia / Água / Internet",
    "Outros",
  ],
} as const

export type CategorySuggestionType = keyof typeof CATEGORY_SUGGESTIONS

// ---------------------------------------------------------------------------
// Transactions
// ---------------------------------------------------------------------------

const categoryField = z
  .string()
  .trim()
  .max(60, "Categoria muito longa")
  .optional()
  .or(z.literal(""))
  .nullable()

/**
 * Cria transaction. Suporta 3 modos mutuamente exclusivos:
 *  1. amount + product_id (modo simples)
 *  2. amount sem produto (modo "valor solto")
 *  3. items[] (modo multi-item; amount é calculado)
 *
 * No modo 3, amount é ignorado/recalculado pelo server.
 */
export const createTransactionSchema = z
  .object({
    type: transactionTypeSchema,
    amount: z
      .number({ message: "Informe o valor" })
      .nonnegative("O valor não pode ser negativo")
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
    employee_id: z.string().uuid().optional().nullable(),
    product_id: z.string().uuid().optional().nullable(),
    items: z.array(transactionItemInputSchema).optional(),
    category: categoryField,
    status: z.enum(["pending", "paid"]),
  })
  .refine(
    (data) => {
      if (data.type === "income" && data.supplier_id) return false
      if (data.type === "expense" && data.customer_id) return false
      if (data.type === "income" && data.employee_id) return false
      return true
    },
    {
      message: "Receita só vincula cliente; despesa só vincula fornecedor ou funcionário.",
      path: ["type"],
    }
  )
  .refine(
    (data) => {
      // Não pode ter product_id E items ao mesmo tempo
      if (data.product_id && data.items && data.items.length > 0) return false
      return true
    },
    {
      message: "Use produto único OU múltiplos itens, não ambos.",
      path: ["items"],
    }
  )
  .refine(
    (data) => {
      // Se tem items, deve ter pelo menos 1
      if (data.items !== undefined && data.items.length === 0) return false
      return true
    },
    {
      message: "Adicione ao menos um item.",
      path: ["items"],
    }
  )
  .refine(
    (data) => {
      // Se não tem items nem product_id, amount deve ser > 0
      const hasItems = data.items && data.items.length > 0
      if (!hasItems && !data.product_id && data.amount <= 0) return false
      return true
    },
    {
      message: "O valor deve ser maior que zero.",
      path: ["amount"],
    }
  )

export type CreateTransactionInput = z.infer<typeof createTransactionSchema>

export const updateTransactionSchema = z.object({
  id: z.string().uuid(),
  type: transactionTypeSchema.optional(),
  amount: z.number().nonnegative().max(99_999_999.99).optional(),
  due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  description: z.string().trim().max(280).optional().or(z.literal("")),
  customer_id: z.string().uuid().optional().nullable(),
  supplier_id: z.string().uuid().optional().nullable(),
  product_id: z.string().uuid().optional().nullable(),
  category: categoryField,
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
