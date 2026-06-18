"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { sendAccountantInviteEmail } from "@/lib/email/send-accountant-invite"
import { env } from "@/lib/env"
import { getCurrentMembership } from "@/lib/team/queries"

type ActionResult<T = undefined> =
  | { success: true; data?: T }
  | { success: false; error: string }

const inviteSchema = z.object({
  email: z.string().trim().toLowerCase().email("E-mail inválido"),
  name: z.string().trim().max(120).optional(),
})

function appBaseUrl(): string {
  return env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "")
}

async function loadInviteContext(tenantId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: tenant } = await supabase
    .from("tenants")
    .select("name")
    .eq("id", tenantId)
    .maybeSingle()

  const ownerName =
    (user?.user_metadata?.name as string | undefined)?.trim() ||
    user?.email?.split("@")[0] ||
    "O responsável da empresa"

  return {
    tenantName: tenant?.name?.trim() || "Sua empresa",
    ownerName,
  }
}

export async function inviteAccountantAction(
  input: z.infer<typeof inviteSchema>
): Promise<ActionResult> {
  const parsed = inviteSchema.safeParse(input)
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Dados inválidos",
    }
  }

  const membership = await getCurrentMembership()
  if (!membership || membership.role !== "owner") {
    return {
      success: false,
      error: "Apenas o dono da empresa pode convidar contadores.",
    }
  }

  const email = parsed.data.email
  const accountantName =
    parsed.data.name?.trim() ||
    email.split("@")[0].replace(/[._]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())

  const { tenantName, ownerName } = await loadInviteContext(membership.tenant_id)
  const base = appBaseUrl()
  const contadorUrl = `${base}/contador`
  const loginUrl = `${base}/login`
  const appUrl = base

  const service = createServiceRoleClient()

  const { data: existingId, error: lookupErr } = await service.rpc(
    "get_user_id_by_email",
    { p_email: email }
  )

  if (lookupErr) {
    console.error("[team] get_user_id_by_email:", lookupErr)
    return { success: false, error: "Não foi possível verificar o e-mail." }
  }

  if (existingId) {
    const { error: insertErr } = await service.from("tenant_users").upsert(
      {
        tenant_id: membership.tenant_id,
        user_id: existingId as string,
        role: "accountant",
      },
      { onConflict: "tenant_id,user_id" }
    )
    if (insertErr) {
      console.error("[team] upsert accountant:", insertErr)
      return { success: false, error: "Não foi possível adicionar o contador." }
    }

    const mail = await sendAccountantInviteEmail(email, {
      accountantName,
      accountantEmail: email,
      tenantName,
      ownerName,
      isNewUser: false,
      inviteUrl: null,
      contadorUrl,
      loginUrl,
      appUrl,
    })
    if (!mail.ok) {
      console.warn("[team] accountant added email skipped:", mail.error)
    }

    revalidatePath("/configuracoes")
    revalidatePath("/contador")
    return { success: true }
  }

  const redirectTo = `${base}/auth/confirm`
  const inviteMeta = {
    invite_tenant_id: membership.tenant_id,
    invited_role: "accountant",
    name: accountantName,
  }

  const resend = env.RESEND_API_KEY

  if (resend) {
    const linkRes = await service.auth.admin.generateLink({
      type: "invite",
      email,
      options: {
        redirectTo,
        data: inviteMeta,
      },
    })

    if (linkRes.error) {
      console.error("[team] generateLink:", linkRes.error)
      const msg = linkRes.error.message
      return {
        success: false,
        error: msg.includes("already")
          ? "Este e-mail já está cadastrado. Peça ao contador para entrar com sua senha — depois adicione o e-mail novamente."
          : "Não foi possível gerar o convite.",
      }
    }

    const inviteUrl = linkRes.data.properties?.action_link
    if (!inviteUrl) {
      return { success: false, error: "Link de convite inválido." }
    }

    const mail = await sendAccountantInviteEmail(email, {
      accountantName,
      accountantEmail: email,
      tenantName,
      ownerName,
      isNewUser: true,
      inviteUrl,
      contadorUrl,
      loginUrl,
      appUrl,
    })

    if (!mail.ok) {
      return { success: false, error: mail.error }
    }
  } else {
    const invite = await service.auth.admin.inviteUserByEmail(email, {
      data: inviteMeta,
      redirectTo,
    })

    if (invite.error) {
      console.error("[team] inviteUserByEmail:", invite.error)
      return {
        success: false,
        error:
          invite.error.message.includes("already")
            ? "Este e-mail já está cadastrado. Peça ao contador para entrar com sua senha — depois adicione o e-mail novamente."
            : "Não foi possível enviar o convite. Configure RESEND para e-mails personalizados.",
      }
    }
  }

  revalidatePath("/configuracoes")
  return { success: true }
}

export async function removeAccountantAction(userId: string): Promise<ActionResult> {
  const membership = await getCurrentMembership()
  if (!membership || membership.role !== "owner") {
    return { success: false, error: "Apenas o dono pode remover acessos." }
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from("tenant_users")
    .delete()
    .eq("tenant_id", membership.tenant_id)
    .eq("user_id", userId)
    .eq("role", "accountant")

  if (error) {
    return { success: false, error: "Não foi possível remover o contador." }
  }

  revalidatePath("/configuracoes")
  return { success: true }
}
