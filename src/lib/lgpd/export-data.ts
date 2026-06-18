import "server-only"

import { createClient } from "@/lib/supabase/server"

export type LgpdExportBundle = {
  exported_at: string
  format_version: "1.0"
  user: {
    id: string
    email: string
    name: string | null
    phone: string | null
    avatar_url: string | null
    created_at: string | null
  }
  tenant: Record<string, unknown> | null
  tenant_settings: Record<string, unknown> | null
  tenant_users: Record<string, unknown>[]
  customers: Record<string, unknown>[]
  suppliers: Record<string, unknown>[]
  transactions: Record<string, unknown>[]
  products: Record<string, unknown>[]
  transaction_items: Record<string, unknown>[]
  stock_movements: Record<string, unknown>[]
  employees: Record<string, unknown>[]
  goals: Record<string, unknown>[]
  reminders: Record<string, unknown>[]
  conversations: Record<string, unknown>[]
  messages: Record<string, unknown>[]
  goals_and_reminders_note: string
  email_preferences: Record<string, unknown>[]
  email_logs: Record<string, unknown>[]
  subscriptions: Record<string, unknown>[]
  import_batches: Record<string, unknown>[]
  forecast_dismissed_alerts: Record<string, unknown>[]
}

async function selectAll(
  supabase: Awaited<ReturnType<typeof createClient>>,
  table: string,
  columns = "*"
): Promise<Record<string, unknown>[]> {
  const { data, error } = await supabase.from(table).select(columns)
  if (error) {
    console.warn(`[lgpd-export] skip ${table}:`, error.message)
    return []
  }
  return (data ?? []) as unknown as Record<string, unknown>[]
}

export async function buildLgpdExportBundle(): Promise<LgpdExportBundle | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const tenantRes = await supabase.from("tenants").select("*").limit(1).maybeSingle()
  const tenantSettingsRes = await supabase
    .from("tenant_settings")
    .select("*")
    .limit(1)
    .maybeSingle()

  const [
    tenantUsers,
    customers,
    suppliers,
    transactions,
    products,
    transactionItems,
    stockMovements,
    employees,
    goals,
    reminders,
    conversations,
    messages,
    emailPreferences,
    emailLogs,
    subscriptions,
    importBatches,
    forecastDismissed,
  ] = await Promise.all([
    selectAll(supabase, "tenant_users"),
    selectAll(supabase, "customers"),
    selectAll(supabase, "suppliers"),
    selectAll(supabase, "transactions_with_status"),
    selectAll(supabase, "products"),
    selectAll(supabase, "transaction_items"),
    selectAll(supabase, "stock_movements"),
    selectAll(supabase, "employees"),
    selectAll(supabase, "goals"),
    selectAll(supabase, "reminders"),
    selectAll(supabase, "conversations"),
    selectAll(supabase, "messages"),
    selectAll(supabase, "email_preferences"),
    selectAll(supabase, "email_logs"),
    selectAll(supabase, "subscriptions"),
    selectAll(supabase, "import_batches"),
    selectAll(supabase, "forecast_dismissed_alerts"),
  ])

  return {
    exported_at: new Date().toISOString(),
    format_version: "1.0",
    user: {
      id: user.id,
      email: user.email ?? "",
      name: (user.user_metadata?.name as string | undefined) ?? null,
      phone: (user.user_metadata?.phone as string | undefined) ?? null,
      avatar_url:
        (user.user_metadata?.avatar_url as string | undefined) ?? null,
      created_at: user.created_at ?? null,
    },
    tenant: (tenantRes.data as Record<string, unknown> | null) ?? null,
    tenant_settings:
      (tenantSettingsRes.data as Record<string, unknown> | null) ?? null,
    tenant_users: tenantUsers,
    customers,
    suppliers,
    transactions,
    products,
    transaction_items: transactionItems,
    stock_movements: stockMovements,
    employees,
    goals,
    reminders,
    conversations,
    messages,
    goals_and_reminders_note:
      "Metas e lembretes exportados separadamente nas coleções goals e reminders.",
    email_preferences: emailPreferences,
    email_logs: emailLogs,
    subscriptions,
    import_batches: importBatches,
    forecast_dismissed_alerts: forecastDismissed,
  }
}
