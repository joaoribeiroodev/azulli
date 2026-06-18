"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"

import { isMissingDbColumn } from "./db"

type ActionResult = { success: true } | { success: false; error: string }

const companySchema = z.object({
  document: z.string().trim().max(20).optional().or(z.literal("")),
  default_tax_regime: z.enum(["mei", "simples_nacional"]),
  business_type: z.string().trim().max(80).optional().or(z.literal("")),
})

export type OnboardingCompanyInput = z.infer<typeof companySchema>

function normalizeDocument(raw: string): string {
  return raw.replace(/\D/g, "")
}

export async function saveOnboardingCompanyAction(
  input: OnboardingCompanyInput
): Promise<ActionResult> {
  const parsed = companySchema.safeParse(input)
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Dados inválidos",
    }
  }

  const digits = normalizeDocument(parsed.data.document ?? "")
  if (digits && digits.length !== 11 && digits.length !== 14) {
    return {
      success: false,
      error: "CPF deve ter 11 dígitos ou CNPJ 14 dígitos.",
    }
  }

  const supabase = await createClient()
  const { data: tenantRow } = await supabase
    .from("tenants")
    .select("id")
    .limit(1)
    .maybeSingle()

  if (!tenantRow) {
    return { success: false, error: "Empresa não encontrada." }
  }

  const { error: tenantError } = await supabase
    .from("tenants")
    .update({ document: digits || null })
    .eq("id", tenantRow.id)

  if (tenantError) {
    console.error("[onboarding] tenant update:", tenantError.message)
    return { success: false, error: "Não foi possível salvar os dados." }
  }

  const settingsPayload: Record<string, unknown> = {
    default_tax_regime: parsed.data.default_tax_regime,
    business_type: parsed.data.business_type || null,
  }

  let settingsError = (
    await supabase
      .from("tenant_settings")
      .update(settingsPayload)
      .eq("tenant_id", tenantRow.id)
  ).error

  if (
    settingsError &&
    isMissingDbColumn(settingsError.message, "business_type")
  ) {
    settingsError = (
      await supabase
        .from("tenant_settings")
        .update({ default_tax_regime: parsed.data.default_tax_regime })
        .eq("tenant_id", tenantRow.id)
    ).error
  }

  if (settingsError) {
    console.error("[onboarding] settings update:", settingsError.message)
    return { success: false, error: "Não foi possível salvar as configurações." }
  }

  return { success: true }
}

export async function completeOnboardingAction(): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: tenantRow } = await supabase
    .from("tenants")
    .select("id")
    .limit(1)
    .maybeSingle()

  if (!tenantRow) {
    return { success: false, error: "Empresa não encontrada." }
  }

  const { error } = await supabase
    .from("tenants")
    .update({ onboarding_completed_at: new Date().toISOString() })
    .eq("id", tenantRow.id)

  if (error) {
    if (isMissingDbColumn(error.message, "onboarding_completed_at")) {
      return { success: true }
    }
    console.error("[onboarding] complete:", error.message)
    return { success: false, error: "Não foi possível concluir o onboarding." }
  }

  revalidatePath("/onboarding")
  revalidatePath("/dashboard")
  revalidatePath("/", "layout")
  return { success: true }
}
