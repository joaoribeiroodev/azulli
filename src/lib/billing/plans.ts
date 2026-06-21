export type PlanId = "trial" | "pro" | "enterprise"

/** Funcionalidades premium (trial = degustação; Pro não inclui). */
export function hasEnterpriseFeatures(tier: PlanId): boolean {
  return tier === "trial" || tier === "enterprise"
}

/**
 * Assistente IA: trial (degustação) e Empresarial.
 */
export function canUseAssistant(tier: PlanId): boolean {
  return hasEnterpriseFeatures(tier)
}

/**
 * Previsão de caixa, simulador e runway: trial e Empresarial.
 */
export function canUseForecast(tier: PlanId): boolean {
  return hasEnterpriseFeatures(tier)
}

/**
 * E-mails automáticos (insights, cobrança, vencidos): trial e Empresarial.
 */
export function canUseAutomatedEmails(tier: PlanId): boolean {
  return hasEnterpriseFeatures(tier)
}

/** O que o trial de 7 dias inclui (espelha Empresarial para degustação). */
export const TRIAL_FEATURE_HIGHLIGHTS = [
  "Lançamentos, OFX, agenda e exportação Excel",
  "Assistente IA e previsão de caixa",
  "E-mails de insights e cobrança",
  "Sem cartão de crédito no cadastro",
] as const

export type Plan = {
  id: Exclude<PlanId, "trial">
  name: string
  price: number
  highlight?: boolean
  description: string
  features: string[]
  limits: {
    maxCustomers: number | null
    maxSuppliers: number | null
    maxProducts: number | null
    maxEmployees: number | null
    apiAccess: boolean
    prioritySupport: boolean
  }
}

export const PLANS: Record<"pro" | "enterprise", Plan> = {
  pro: {
    id: "pro",
    name: "Pro",
    price: 29.99,
    description: "Pra MEI e pequenas empresas que querem organizar tudo.",
    features: [
      "Lançamentos ilimitados",
      "Até 500 clientes, fornecedores e produtos",
      "Até 5 funcionários",
      "Controle de estoque",
      "Importação OFX com categorização IA",
      "Detector de despesas recorrentes",
      "Metas e lembretes",
      "Agenda financeira unificada",
      "Exportação Excel formatada",
      "Área do contador (convite + exportação)",
      "Dashboard com gráficos e relatórios",
      "Suporte por e-mail",
    ],
    limits: {
      maxCustomers: 500,
      maxSuppliers: 500,
      maxProducts: 500,
      maxEmployees: 5,
      apiAccess: false,
      prioritySupport: false,
    },
  },
  enterprise: {
    id: "enterprise",
    name: "Empresarial",
    price: 47.99,
    highlight: true,
    description: "Pra empresas com equipe e volume maior de operações.",
    features: [
      "Tudo do Pro",
      "Assistente IA conversacional",
      "Previsão de fluxo de caixa e simulador «e se?»",
      "Clientes, fornecedores, produtos e funcionários ilimitados",
      "Insights semanais por e-mail",
      "Régua de cobrança por e-mail",
      "Alertas de lançamentos vencidos",
      "Suporte prioritário (WhatsApp)",
    ],
    limits: {
      maxCustomers: null,
      maxSuppliers: null,
      maxProducts: null,
      maxEmployees: null,
      apiAccess: true,
      prioritySupport: true,
    },
  },
}

export function getPlan(id: PlanId): Plan | null {
  if (id === "trial") return null
  return PLANS[id]
}

export function formatPlanPrice(price: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(price)
}
