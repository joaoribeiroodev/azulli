export type LeadStatus =
  | "novo"
  | "qualificado"
  | "contatado"
  | "em_negociacao"
  | "assinante"
  | "descartado"

export type Lead = {
  id: string
  nome: string
  segmento?: string | null
  porte?: string | null
  telefone?: string | null
  whatsapp?: string | null
  email?: string | null
  endereco?: string | null
  cidade?: string | null
  uf?: string | null
  avaliacao?: number | null
  total_avaliacoes?: number | null
  icp_score?: number | null
  status: LeadStatus
  responsavel_id?: string | null
  responsavel_nome?: string | null
  website?: string | null
  maps_url?: string | null
  created_at?: string | null
  updated_at?: string | null
  notas?: string | null
  pitch_whatsapp?: string | null
  pitch_email?: string | null
  azulli_account_id?: string | null
  plano_contratado?: string | null
}

export type User = {
  id: string
  nome?: string | null
  email: string
  role: string
  ativo?: boolean
  ultimo_login?: string | null
  created_at?: string | null
}

export type Search = {
  id: string
  termo: string
  localizacao: string
  user_nome?: string | null
  total_results?: number | null
  duracao_ms?: number | null
  created_at?: string | null
}

export type FinderPlan = {
  id: string
  name: string
  price: number
}

export type FinderConfig = {
  ai?: boolean
  search?: { configured?: boolean }
  urls?: { admin?: string }
  plans?: FinderPlan[]
}

export type LeadHistoryItem = {
  status_anterior?: LeadStatus | null
  status_novo: LeadStatus
  user_nome?: string | null
  created_at?: string | null
  motivo?: string | null
}

export type LeadDetailResponse = {
  lead: Lead
  history?: LeadHistoryItem[]
}

export type LeadsListResponse = {
  leads: Lead[]
  total: number
}

export type LeadsStatsResponse = {
  resumo: {
    total: number
    ativos: number
    assinantes: number
    icp_medio: number | string
    buscas_7d: number
  }
  byStatus: Array<{ status: LeadStatus; total: number }>
  bySegmento: Array<{ segmento: string; total: number }>
  byUf: Array<{ uf: string; total: number }>
}

export type SearchCreateResponse = {
  dados: Lead[]
  searchId?: string
  total: number
  excluidos_icp?: number
}

export type LeadConversion = {
  status: "linked" | "pending" | string
  message?: string
  registerUrl?: string
}

export type PitchCanal = "whatsapp" | "email"

export type PitchStored = {
  v?: number
  legacy?: boolean
  canal?: PitchCanal
  mensagem?: string
  corpo?: string
  mensagem_pos_optin?: string
  follow_up?: string
  assunto?: string
  assunto_alternativo?: string
  estrutura?: Record<string, unknown>
  personalizacao_usada?: string[]
  objecoes?: Array<string | { objecao?: string; resposta?: string }>
  dicas_vendedor?: string[]
  conformidade_meta?: { observacao?: string }
}
