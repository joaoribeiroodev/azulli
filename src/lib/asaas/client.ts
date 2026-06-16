import "server-only"

import { toAsaasPhone } from "@/lib/utils/format"

// ---------------------------------------------------------------------------
// Tipos públicos
// ---------------------------------------------------------------------------

export type AsaasCustomer = {
  id: string
  name: string
  email: string
  cpfCnpj: string
  phone?: string
}

export type AsaasBillingType = "BOLETO" | "CREDIT_CARD" | "PIX" | "UNDEFINED"

export type AsaasSubscription = {
  id: string
  customer: string
  value: number
  cycle: "MONTHLY"
  billingType: AsaasBillingType
  status: string
  nextDueDate: string
  dateCreated: string
}

export type AsaasPayment = {
  id: string
  subscription: string
  status: "PENDING" | "RECEIVED" | "CONFIRMED" | "OVERDUE" | "REFUNDED"
  value: number
  dueDate: string
  invoiceUrl: string
  bankSlipUrl?: string
}

// ---------------------------------------------------------------------------
// Helper interno — wrapper sobre fetch
// ---------------------------------------------------------------------------

type FetchOpts = {
  method?: string
  body?: unknown
  query?: Record<string, string | number>
}

async function asaasFetch<T>(path: string, opts: FetchOpts = {}): Promise<T> {
  const baseUrl = process.env.ASAAS_BASE_URL
  const rawKey = process.env.ASAAS_API_KEY

  // dotenv-expand expande "$aact_xxx" para vazio porque "aact_xxx" não é uma variável.
  // Aceitamos a chave com ou sem o "$" e adicionamos o prefixo se necessário.
  // No .env.local use: ASAAS_API_KEY=aact_xxxxxxxx (sem o $)
  const apiKey = rawKey
    ? rawKey.startsWith("$")
      ? rawKey         // já tem $ (via \$ escape ou outra forma)
      : `$${rawKey}`   // adiciona $ automaticamente
    : undefined

  if (!apiKey) {
    throw new Error(
      "[asaas] ASAAS_API_KEY não configurada.\n" +
      "No .env.local, coloque SEM o $ inicial:\n" +
      "  ASAAS_API_KEY=aact_xxxxxxxxxxxxxxxxxxxxxxxx"
    )
  }
  if (!baseUrl) {
    throw new Error(
      "[asaas] ASAAS_BASE_URL não configurada. Adicione ao .env.local e reinicie o servidor."
    )
  }

  if (process.env.NODE_ENV === "development") {
    console.log(`[asaas] key=${apiKey.slice(0, 8)}... (${apiKey.length} chars)`)
  }

  let url = `${baseUrl}${path}`

  if (opts.query && Object.keys(opts.query).length > 0) {
    const params = new URLSearchParams(
      Object.entries(opts.query).reduce<Record<string, string>>(
        (acc, [k, v]) => ({ ...acc, [k]: String(v) }),
        {}
      )
    )
    url = `${url}?${params.toString()}`
  }

  if (process.env.NODE_ENV === "development") {
    console.log(`[asaas] ${opts.method ?? "GET"} ${path}`)
  }

  const res = await fetch(url, {
    method: opts.method ?? "GET",
    headers: {
      "Content-Type": "application/json",
      access_token: apiKey,
      "User-Agent": "Azulli/1.0",
    },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
    cache: "no-store",
  })

  if (!res.ok) {
    const text = await res.text().catch(() => "")
    console.error(`[asaas] Erro ${res.status} em ${path}:`, text.slice(0, 200))
    throw new Error(`Asaas API error: ${res.status} em ${path}`)
  }

  return res.json() as Promise<T>
}

// ---------------------------------------------------------------------------
// Funções exportadas
// ---------------------------------------------------------------------------

type AsaasListResponse<T> = {
  data: T[]
  hasMore: boolean
  totalCount: number
}

/**
 * Busca customer existente por email ou cria um novo.
 * cpfCnpj deve estar sem formatação (apenas dígitos).
 */
export async function createOrGetAsaasCustomer(input: {
  name: string
  email: string
  cpfCnpj: string
  phone?: string
}): Promise<AsaasCustomer> {
  const list = await asaasFetch<AsaasListResponse<AsaasCustomer>>(
    "/customers",
    { query: { email: input.email, limit: 1 } }
  )

  if (list.data.length > 0) {
    const existing = list.data[0]
    // Se o customer existe mas não tem cpfCnpj (foi criado em teste anterior sem ele),
    // atualiza agora para desbloquear a criação de subscriptions.
    if (!existing.cpfCnpj && input.cpfCnpj) {
      return asaasFetch<AsaasCustomer>(`/customers/${existing.id}`, {
        method: "POST",
        body: { cpfCnpj: input.cpfCnpj },
      })
    }
    return existing
  }

  return asaasFetch<AsaasCustomer>("/customers", {
    method: "POST",
    body: {
      name: input.name,
      email: input.email,
      cpfCnpj: input.cpfCnpj,
      // Asaas espera DDD+número sem DDI nem formatação: "71999999999"
      phone: input.phone ? toAsaasPhone(input.phone) : undefined,
    },
  })
}

/**
 * Cria uma assinatura mensal no Asaas.
 * nextDueDate = hoje + 3 dias.
 */
export async function createAsaasSubscription(input: {
  customerId: string
  planId: string
  value: number
  billingType: AsaasBillingType
}): Promise<AsaasSubscription> {
  const due = new Date()
  due.setDate(due.getDate() + 3)
  const nextDueDate = due.toISOString().split("T")[0]

  return asaasFetch<AsaasSubscription>("/subscriptions", {
    method: "POST",
    body: {
      customer: input.customerId,
      billingType: input.billingType,
      value: input.value,
      nextDueDate,
      cycle: "MONTHLY",
      description: `Plano ${input.planId.toUpperCase()} — Azulli`,
      externalReference: input.planId,
    },
  })
}

/** Cancela uma assinatura no Asaas. */
export async function cancelAsaasSubscription(
  subscriptionId: string
): Promise<void> {
  await asaasFetch(`/subscriptions/${subscriptionId}`, { method: "DELETE" })
}

/**
 * Retorna o próximo pagamento pendente de uma assinatura.
 * Retorna null se não houver pending.
 */
export async function getNextAsaasPayment(
  subscriptionId: string
): Promise<AsaasPayment | null> {
  const list = await asaasFetch<AsaasListResponse<AsaasPayment>>(
    `/subscriptions/${subscriptionId}/payments`,
    { query: { status: "PENDING", limit: 1 } }
  )

  return list.data[0] ?? null
}

/** Busca um pagamento específico pelo ID. */
export async function getAsaasPaymentById(
  paymentId: string
): Promise<AsaasPayment> {
  return asaasFetch<AsaasPayment>(`/payments/${paymentId}`)
}
