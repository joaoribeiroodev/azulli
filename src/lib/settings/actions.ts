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
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email({ message: "E-mail inválido" })
    .optional()
    .or(z.literal("")),
  phone: z.string().trim().max(20).optional().or(z.literal("")),
  inscricao_estadual: z.string().trim().max(30).optional().or(z.literal("")),
  inscricao_municipal: z.string().trim().max(30).optional().or(z.literal("")),
  cep: z.string().trim().max(9).optional().or(z.literal("")),
  logradouro: z.string().trim().max(160).optional().or(z.literal("")),
  numero: z.string().trim().max(20).optional().or(z.literal("")),
  complemento: z.string().trim().max(80).optional().or(z.literal("")),
  bairro: z.string().trim().max(80).optional().or(z.literal("")),
  cidade: z.string().trim().max(80).optional().or(z.literal("")),
  uf: z.string().trim().max(2).optional().or(z.literal("")),
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

  const d = parsed.data
  const { error } = await supabase
    .from("tenants")
    .update({
      name: d.name,
      document: d.document || null,
      email: d.email || null,
      phone: d.phone ? toE164BR(d.phone) : null,
      inscricao_estadual: d.inscricao_estadual || null,
      inscricao_municipal: d.inscricao_municipal || null,
      cep: d.cep || null,
      logradouro: d.logradouro || null,
      numero: d.numero || null,
      complemento: d.complemento || null,
      bairro: d.bairro || null,
      cidade: d.cidade || null,
      uf: d.uf || null,
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
// Logo da empresa
// ---------------------------------------------------------------------------

const logoSchema = z.object({
  logo_url: z.string().url("URL inválida").max(500).nullable(),
})

export async function updateTenantLogoAction(
  logoUrl: string | null
): Promise<ActionResult> {
  const parsed = logoSchema.safeParse({ logo_url: logoUrl })
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "URL inválida",
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
    .update({ logo_url: parsed.data.logo_url })
    .eq("id", tenantRow.id)

  if (error) {
    console.error("[settings] updateTenantLogo failed:", error.message)
    return { success: false, error: "Não foi possível atualizar o logotipo." }
  }

  revalidatePath("/configuracoes")
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
