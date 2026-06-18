import "server-only"

import { createClient } from "@/lib/supabase/server"
import { PLANS, type PlanId } from "@/lib/billing/plans"

export type PlanLimitResource =
  | "customers"
  | "suppliers"
  | "products"
  | "employees"

const TABLE_MAP: Record<
  PlanLimitResource,
  { table: string; limitKey: "maxCustomers" | "maxSuppliers" | "maxProducts" | "maxEmployees" }
> = {
  customers: { table: "customers", limitKey: "maxCustomers" },
  suppliers: { table: "suppliers", limitKey: "maxSuppliers" },
  products: { table: "products", limitKey: "maxProducts" },
  employees: { table: "employees", limitKey: "maxEmployees" },
}

const LABELS: Record<PlanLimitResource, string> = {
  customers: "clientes",
  suppliers: "fornecedores",
  products: "produtos",
  employees: "funcionários",
}

async function getTenantTier(): Promise<PlanId | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from("tenants")
    .select("tier")
    .limit(1)
    .maybeSingle()
  if (!data?.tier) return null
  return data.tier as PlanId
}

function getMaxForTier(tier: PlanId, resource: PlanLimitResource): number | null {
  if (tier === "trial" || tier === "enterprise") return null
  const plan = PLANS.pro
  const key = TABLE_MAP[resource].limitKey
  return plan.limits[key]
}

/**
 * Verifica se o tenant pode criar mais registros do recurso.
 * Trial e Empresarial = sem limite. Pro = limites do plano.
 */
export async function checkPlanLimit(
  resource: PlanLimitResource
): Promise<{ allowed: true } | { allowed: false; error: string }> {
  const tier = await getTenantTier()
  if (!tier) {
    return { allowed: false, error: "Empresa não encontrada." }
  }

  const max = getMaxForTier(tier, resource)
  if (max === null) return { allowed: true }

  const supabase = await createClient()
  const { table } = TABLE_MAP[resource]
  const { count, error } = await supabase
    .from(table)
    .select("id", { count: "exact", head: true })

  if (error) {
    console.error("[plan-limits] count failed:", error.message)
    return { allowed: true }
  }

  const current = count ?? 0
  if (current >= max) {
    const label = LABELS[resource]
    return {
      allowed: false,
      error: `Limite do plano Pro: até ${max} ${label}. Faça upgrade para Empresarial.`,
    }
  }

  return { allowed: true }
}
