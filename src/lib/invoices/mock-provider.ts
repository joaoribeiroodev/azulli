import "server-only"
import { randomUUID } from "node:crypto"
import type {
  InvoiceProvider,
  IssueInvoiceRequest,
  IssueInvoiceResponse,
} from "./provider"

/**
 * Mock determinístico para desenvolvimento.
 * - Simula latência de 1.5s (rede do provedor real)
 * - 90% de sucesso, 10% de falha simulada (testar fluxo de erro)
 * - Gera URLs com UUIDs fakes que apontam pra placeholder local
 *
 * IMPORTANTE: As "URLs" geradas não são URLs reais; servem só pra
 * UI testar o fluxo de download. Quando trocar pelo Focus NF-e/NotaControl,
 * essas URLs virão de verdade.
 */
export class MockInvoiceProvider implements InvoiceProvider {
  readonly name = "mock"

  async issue(req: IssueInvoiceRequest): Promise<IssueInvoiceResponse> {
    // Simula latência da chamada externa
    await new Promise((resolve) => setTimeout(resolve, 1500))

    // 10% de falha aleatória pra testar UI de erro
    if (Math.random() < 0.1) {
      return {
        success: false,
        error: "Falha temporária na SEFAZ. Tente novamente em alguns minutos.",
      }
    }

    // Validações básicas que o provedor real faria
    if (req.type === "nfe" && !req.customerDocument) {
      return {
        success: false,
        error:
          "NF-e exige CPF/CNPJ do cliente. Cadastre o documento e tente de novo.",
      }
    }

    const externalId = `MOCK-${req.type.toUpperCase()}-${randomUUID()
      .slice(0, 8)
      .toUpperCase()}`
    return {
      success: true,
      externalId,
      xmlUrl: `/api/invoices/mock/${externalId}.xml`,
      pdfUrl: `/api/invoices/mock/${externalId}.pdf`,
    }
  }
}
