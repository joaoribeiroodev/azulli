import { formatBRL } from "@/lib/utils/currency"
import { formatDateBR } from "@/lib/utils/date"

export function buildCollectionWhatsAppUrl(params: {
  phone: string
  customerName: string
  amount: number
  dueDate: string
  description?: string | null
  companyName?: string
}): string | null {
  const phoneDigits = params.phone.replace(/\D/g, "")
  if (!phoneDigits) return null

  const waPhone = phoneDigits.startsWith("55") ? phoneDigits : `55${phoneDigits}`
  const { customerName, amount, dueDate, description, companyName } = params

  const lines = [
    `Olá, ${customerName}!`,
    "",
    companyName
      ? `Aqui é da ${companyName}.`
      : "Passando para lembrar de um pagamento pendente:",
    "",
    description ? `• ${description}` : "• Cobrança pendente",
    `• Valor: ${formatBRL(amount)}`,
    `• Vencimento: ${formatDateBR(dueDate)}`,
    "",
    "Pode me confirmar quando consegue realizar? Obrigado!",
  ]

  const text = lines.join("\n")
  return `https://wa.me/${waPhone}?text=${encodeURIComponent(text)}`
}
