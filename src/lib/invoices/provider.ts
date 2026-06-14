import "server-only"

export type InvoiceType = "nfe" | "nfse"

export type IssueInvoiceRequest = {
  tenantId: string
  transactionId: string
  type: InvoiceType
  amount: number
  customerName: string | null
  customerDocument: string | null
  description: string | null
  taxRegime: "mei" | "simples_nacional"
}

export type IssueInvoiceResponse =
  | {
      success: true
      externalId: string
      xmlUrl: string
      pdfUrl: string
    }
  | {
      success: false
      error: string
    }

/**
 * Interface comum para provedores de NF.
 * Implementações: MockProvider (dev), FocusNFeProvider (prod), etc.
 */
export interface InvoiceProvider {
  readonly name: string
  issue(req: IssueInvoiceRequest): Promise<IssueInvoiceResponse>
}

let providerInstance: InvoiceProvider | null = null

/**
 * Factory que retorna a implementação correta.
 * Em prod, lê env var INVOICE_PROVIDER e retorna o adapter real.
 */
export async function getInvoiceProvider(): Promise<InvoiceProvider> {
  if (providerInstance) return providerInstance

  // Por enquanto só temos o mock. Quando integrar Focus NF-e:
  //   if (process.env.INVOICE_PROVIDER === "focus") {
  //     providerInstance = new FocusNFeProvider({ apiKey: env.FOCUS_API_KEY })
  //   }
  const { MockInvoiceProvider } = await import("./mock-provider")
  providerInstance = new MockInvoiceProvider()
  return providerInstance
}
