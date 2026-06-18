"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { createClient } from "@/lib/supabase/server"
import { loadForecastEngineInput } from "./queries"
import { simulate } from "./simulator"
import type {
  ForecastHorizon,
  WhatIfAdjustment,
  WhatIfScenario,
} from "./types"

type ActionResult = { success: true } | { success: false; error: string }
type DataResult<T> =
  | { success: true; data: T }
  | { success: false; error: string }

const dismissSchema = z.object({
  alertKey: z.string().trim().min(1).max(255),
})

export async function dismissAlertAction(
  alertKey: string
): Promise<ActionResult> {
  const parsed = dismissSchema.safeParse({ alertKey })
  if (!parsed.success) {
    return { success: false, error: "Chave de alerta inválida." }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: "Sessão expirada." }

  const { data: tu } = await supabase
    .from("tenant_users")
    .select("tenant_id")
    .limit(1)
    .maybeSingle()
  if (!tu) return { success: false, error: "Empresa não encontrada." }

  const { error } = await supabase.from("forecast_dismissed_alerts").upsert(
    {
      tenant_id: tu.tenant_id,
      user_id: user.id,
      alert_key: parsed.data.alertKey,
    },
    {
      onConflict: "tenant_id,user_id,alert_key",
      ignoreDuplicates: true,
    }
  )

  if (error) {
    console.error("[forecast] dismissAlert failed:", error)
    return { success: false, error: "Não foi possível dispensar o alerta." }
  }

  revalidatePath("/dashboard")
  return { success: true }
}

/**
 * Retorna lista de alert_keys já descartados pelo usuário corrente —
 * usada pelo wrapper RSC para filtrar antes de renderizar.
 */
export async function listDismissedAlertKeys(): Promise<Set<string>> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("forecast_dismissed_alerts")
    .select("alert_key")

  if (error || !data) {
    if (error) console.error("[forecast] listDismissed failed:", error)
    return new Set()
  }

  return new Set(data.map((row) => row.alert_key as string))
}

// ---------------------------------------------------------------------------
// Simulador "e se?"
// ---------------------------------------------------------------------------

const adjustmentSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("delay_expense"),
    transactionId: z.string().uuid(),
    delayDays: z.number().int().min(1).max(180),
  }),
  z.object({
    kind: z.literal("advance_income"),
    transactionId: z.string().uuid(),
    advanceDays: z.number().int().min(1).max(180),
  }),
  z.object({
    kind: z.literal("add_expense"),
    label: z.string().trim().max(120),
    amount: z.number().positive().max(10_000_000),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  }),
  z.object({
    kind: z.literal("add_income"),
    label: z.string().trim().max(120),
    amount: z.number().positive().max(10_000_000),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  }),
  z.object({
    kind: z.literal("remove_expense"),
    transactionId: z.string().uuid(),
  }),
])

const simulateSchema = z.object({
  horizon: z.union([z.literal(30), z.literal(60), z.literal(90)]),
  adjustments: z.array(adjustmentSchema).max(20),
})

export async function simulateAction(
  horizon: ForecastHorizon,
  adjustments: WhatIfAdjustment[]
): Promise<DataResult<WhatIfScenario>> {
  const parsed = simulateSchema.safeParse({ horizon, adjustments })
  if (!parsed.success) {
    return { success: false, error: "Ajustes inválidos." }
  }

  try {
    const baseline = await loadForecastEngineInput(parsed.data.horizon)
    const scenario = simulate(baseline, parsed.data.adjustments)
    return { success: true, data: scenario }
  } catch (err) {
    console.error("[forecast] simulateAction failed:", err)
    return { success: false, error: "Não foi possível simular agora." }
  }
}
