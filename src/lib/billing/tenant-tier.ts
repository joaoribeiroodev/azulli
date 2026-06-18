import { cache } from "react"
import { createClient } from "@/lib/supabase/server"
import { canUseForecast, type PlanId } from "@/lib/billing/plans"

export const getTenantTier = cache(async (): Promise<PlanId | null> => {
  const supabase = await createClient()
  const { data } = await supabase
    .from("tenants")
    .select("tier")
    .limit(1)
    .maybeSingle()
  if (!data?.tier) return null
  return data.tier as PlanId
})

export async function tenantHasForecastAccess(): Promise<boolean> {
  const tier = await getTenantTier()
  return tier !== null && canUseForecast(tier)
}
