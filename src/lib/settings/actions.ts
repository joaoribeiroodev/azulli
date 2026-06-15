"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { toE164BR } from "@/lib/utils/format"

type ActionResult = { success: true } | { success: false; error: string }

// ---------------------------------------------------------------------------
// User profile (auth.users.user_metadata)
// ---------------------------------------------------------------------------

const profileSchema = z.object({
  name: z.string().trim().min(2, "Nome muito curto").max(120),
  phone: z.string().trim().max(20).optional().or(z.literal("")),
})

export type UpdateProfileInput = z.infer<typeof profileSchema>

export async function updateUserProfileAction(
  input: UpdateProfileInput
): Promise<ActionResult> {
  const parsed = profileSchema.safeParse(input)
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Dados inválidos",
    }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.updateUser({
    data: {
      name: parsed.data.name,
      phone: parsed.data.phone ? toE164BR(parsed.data.phone) : null,
    },
  })

  if (error) {
    console.error("[settings] updateUserProfile failed:", error.message)
    return { success: false, error: "Não foi possível atualizar." }
  }

  revalidatePath("/configuracoes")
  revalidatePath("/", "layout")
  return { success: true }
}

// ---------------------------------------------------------------------------
// Avatar URL
// ---------------------------------------------------------------------------

const avatarSchema = z.object({
  avatar_url: z
    .string()
    .url("URL inválida")
    .max(500)
    .nullable(),
})

export async function updateAvatarAction(
  avatarUrl: string | null
): Promise<ActionResult> {
  const parsed = avatarSchema.safeParse({ avatar_url: avatarUrl })
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "URL inválida",
    }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.updateUser({
    data: { avatar_url: parsed.data.avatar_url },
  })

  if (error) {
    console.error("[settings] updateAvatar failed:", error.message)
    return { success: false, error: "Não foi possível atualizar a foto." }
  }

  revalidatePath("/configuracoes")
  revalidatePath("/", "layout")
  return { success: true }
}

// ---------------------------------------------------------------------------
// Tenant (empresa)
// ---------------------------------------------------------------------------

const tenantSchema = z.object({
  name: z.string().trim().min(2, "Nome da empresa muito curto").max(160),
  document: z.string().trim().max(20).optional().or(z.literal("")),
})

export type UpdateTenantInput = z.infer<typeof tenantSchema>

export async function updateTenantAction(
  input: UpdateTenantInput
): Promise<ActionResult> {
  const parsed = tenantSchema.safeParse(input)
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Dados inválidos",
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

  const { error } = await supabase
    .from("tenants")
    .update({
      name: parsed.data.name,
      document: parsed.data.document || null,
    })
    .eq("id", tenantRow.id)

  if (error) {
    console.error("[settings] updateTenant failed:", error.message)
    return { success: false, error: "Não foi possível atualizar a empresa." }
  }

  revalidatePath("/configuracoes")
  revalidatePath("/dashboard")
  revalidatePath("/", "layout")
  return { success: true }
}

// ---------------------------------------------------------------------------
// Tenant settings
// ---------------------------------------------------------------------------

const settingsSchema = z.object({
  default_tax_regime: z.enum(["mei", "simples_nacional"]),
  billing_email: z
    .string()
    .trim()
    .toLowerCase()
    .email("E-mail inválido")
    .optional()
    .or(z.literal("")),
})

export type UpdateSettingsInput = z.infer<typeof settingsSchema>

export async function updateTenantSettingsAction(
  input: UpdateSettingsInput
): Promise<ActionResult> {
  const parsed = settingsSchema.safeParse(input)
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Dados inválidos",
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

  const { error } = await supabase
    .from("tenant_settings")
    .update({
      default_tax_regime: parsed.data.default_tax_regime,
      billing_email: parsed.data.billing_email || null,
    })
    .eq("tenant_id", tenantRow.id)

  if (error) {
    console.error("[settings] updateTenantSettings failed:", error.message)
    return {
      success: false,
      error: "Não foi possível atualizar as configurações.",
    }
  }

  revalidatePath("/configuracoes")
  return { success: true }
}
