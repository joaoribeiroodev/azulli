import { z } from "zod"

export const productKindSchema = z.enum(["product", "service"])
export type ProductKind = z.infer<typeof productKindSchema>

// ---------------------------------------------------------------------------
// Create/Update product
// ---------------------------------------------------------------------------

const productBaseSchema = z.object({
  name: z.string().trim().min(2, "Nome muito curto").max(160),
  kind: productKindSchema,
  description: z.string().trim().max(500).optional().or(z.literal("")),
  sku: z.string().trim().max(60).optional().or(z.literal("")),

  price: z
    .number({ message: "Informe o preço" })
    .nonnegative("Preço não pode ser negativo")
    .max(99_999_999.99, "Preço acima do limite"),
  cost: z
    .number()
    .nonnegative()
    .max(99_999_999.99)
    .optional()
    .nullable(),

  track_stock: z.boolean().default(false),
  stock_quantity: z.number().nonnegative().default(0),
  low_stock_threshold: z.number().nonnegative().optional().nullable(),
  unit: z.string().trim().max(10).default("un"),

  ncm: z.string().trim().max(15).optional().or(z.literal("")),
  cfop: z.string().trim().max(10).optional().or(z.literal("")),

  is_active: z.boolean().default(true),
})

export const createProductSchema = productBaseSchema.refine(
  (data) => {
    // Service não pode ter estoque
    if (data.kind === "service" && (data.track_stock || data.stock_quantity > 0)) {
      return false
    }
    return true
  },
  {
    message: "Serviços não controlam estoque.",
    path: ["track_stock"],
  }
)

export type CreateProductInput = z.infer<typeof createProductSchema>

export const updateProductSchema = z.object({
  id: z.string().uuid(),
  ...productBaseSchema.shape,
}).refine(
  (data) => {
    if (data.kind === "service" && (data.track_stock || data.stock_quantity > 0)) {
      return false
    }
    return true
  },
  {
    message: "Serviços não controlam estoque.",
    path: ["track_stock"],
  }
)

export type UpdateProductInput = z.infer<typeof updateProductSchema>

// ---------------------------------------------------------------------------
// Ajuste manual de estoque
// ---------------------------------------------------------------------------

export const stockAdjustmentSchema = z.object({
  product_id: z.string().uuid(),
  kind: z.enum(["adjustment_in", "adjustment_out"]),
  quantity: z
    .number()
    .positive("Quantidade deve ser maior que zero")
    .max(999_999),
  notes: z.string().trim().max(280).optional().or(z.literal("")),
})

export type StockAdjustmentInput = z.infer<typeof stockAdjustmentSchema>

// ---------------------------------------------------------------------------
// Itens de transaction (para multi-item)
// ---------------------------------------------------------------------------

export const transactionItemInputSchema = z.object({
  product_id: z.string().uuid(),
  quantity: z
    .number()
    .positive("Quantidade deve ser maior que zero")
    .max(999_999),
  unit_price: z
    .number()
    .nonnegative("Preço não pode ser negativo")
    .max(99_999_999.99),
})

export type TransactionItemInput = z.infer<typeof transactionItemInputSchema>
