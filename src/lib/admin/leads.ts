export const LEAD_STATUSES = ["novo", "contatado", "ativado"] as const

export type LeadStatus = (typeof LEAD_STATUSES)[number]

export type LeadRow = {
  id: string
  name: string | null
  email: string | null
  cnpj: string | null
  status: LeadStatus
  utm_source: string | null
  utm_campaign: string | null
  created_at: string
  updated_at: string
}

export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  novo: "Novo",
  contatado: "Contatado",
  ativado: "Ativado",
}

export function isLeadStatus(value: string): value is LeadStatus {
  return (LEAD_STATUSES as readonly string[]).includes(value)
}
