export type PlanId = "trial" | "pro" | "enterprise"

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
      "Até 500 clientes e fornecedores",
      "Controle de estoque",
      "Metas e lembretes",
      "Exportação Excel",
      "Importação automática de extrato bancário (em breve)",
      "Detector de despesas recorrentes (em breve)",
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
      "Clientes, fornecedores e produtos ilimitados",
      "Funcionários ilimitados",
      "Assistente IA conversacional (em breve)",
      "Previsão de fluxo de caixa (em breve)",
      "Régua de cobrança automatizada (em breve)",
      "Insights semanais por e-mail (em breve)",
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
