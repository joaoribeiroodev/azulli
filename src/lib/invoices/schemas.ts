import { z } from "zod"

export const issueInvoiceSchema = z.object({
  transaction_id: z.string().uuid(),
  type: z.enum(["nfe", "nfse"]),
})

export type IssueInvoiceInput = z.infer<typeof issueInvoiceSchema>
