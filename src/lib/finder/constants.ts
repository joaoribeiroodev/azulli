import type { LeadStatus } from "@/lib/finder/types"

export const TOKEN_KEY = "azulli_finder_token"
export const USER_KEY = "azulli_finder_user"

export const STATUS_LABEL: Record<LeadStatus, string> = {
  novo: "Novo",
  qualificado: "Qualificado",
  contatado: "Contatado",
  em_negociacao: "Em negociação",
  assinante: "Assinante",
  descartado: "Descartado",
}

export const STATUS_ORDER: LeadStatus[] = [
  "novo",
  "qualificado",
  "contatado",
  "em_negociacao",
  "assinante",
  "descartado",
]

export const STATUS_COLORS: Record<LeadStatus, string> = {
  novo: "#3b82f6",
  qualificado: "#06b6d4",
  contatado: "#eab308",
  em_negociacao: "#f97316",
  assinante: "#16a34a",
  descartado: "#94a3b8",
}

export const SEGMENTOS = [
  "alimentacao",
  "beleza",
  "automotivo",
  "saude",
  "servicos",
  "varejo",
  "educacao",
  "tech",
  "construcao",
  "outros",
] as const

export const KANBAN_COLUMNS: Array<{ id: LeadStatus; label: string }> = [
  { id: "novo", label: "Novo" },
  { id: "qualificado", label: "Qualificado" },
  { id: "contatado", label: "Contatado" },
  { id: "em_negociacao", label: "Em negociação" },
  { id: "assinante", label: "Assinante" },
  { id: "descartado", label: "Descartado" },
]

export const USER_ROLES = ["admin", "sdr", "bdr", "closer", "ops", "viewer"] as const

export const DEFAULT_PLANS = [
  { id: "pro", name: "Pro", price: 29.99 },
  { id: "enterprise", name: "Empresarial", price: 47.99 },
]
