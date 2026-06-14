"use server"

import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { env } from "@/lib/env"
import {
  loginSchema,
  registerSchema,
  type LoginInput,
  type RegisterInput,
} from "@/lib/auth/schemas"
import { toE164BR } from "@/lib/utils/format"

type ActionResult<T = undefined> =
  | { success: true; data?: T }
  | { success: false; error: string }

export async function signUpAction(
  input: RegisterInput
): Promise<ActionResult> {
  const parsed = registerSchema.safeParse(input)
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Dados inválidos",
    }
  }

  const { name, email, password, phone } = parsed.data
  const supabase = await createClient()

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { name, phone: toE164BR(phone) },
    },
  })

  if (error) {
    console.error("[auth] signUp failed:", error.message)
    return { success: false, error: mapAuthError(error.message) }
  }

  revalidatePath("/", "layout")
  return { success: true }
}

export async function signInAction(
  input: LoginInput
): Promise<ActionResult> {
  const parsed = loginSchema.safeParse(input)
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Dados inválidos",
    }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  })

  if (error) {
    console.error("[auth] signIn failed:", error.message)
    return { success: false, error: mapAuthError(error.message) }
  }

  revalidatePath("/", "layout")
  return { success: true }
}

export async function signOutAction(): Promise<never> {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath("/", "layout")
  redirect("/login")
}

// ---------------------------------------------------------------------------
// Recuperação de senha
// ---------------------------------------------------------------------------

const forgotSchema = z.object({
  email: z.string().trim().toLowerCase().email("E-mail inválido"),
})

export type ForgotPasswordInput = z.infer<typeof forgotSchema>

export async function requestPasswordResetAction(
  input: ForgotPasswordInput
): Promise<ActionResult> {
  const parsed = forgotSchema.safeParse(input)
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "E-mail inválido",
    }
  }

  const supabase = await createClient()

  // O `redirectTo` aqui é onde o usuário PARA no fim do fluxo.
  // O Supabase vai colocar o token_hash na URL E redirecionar pra cá
  // — mas como customizamos o template do email, vamos apontar pra /auth/confirm
  //   que faz o exchange e depois encaminha pra /reset-password.
  const { error } = await supabase.auth.resetPasswordForEmail(
    parsed.data.email,
    {
      redirectTo: `${env.NEXT_PUBLIC_APP_URL}/auth/confirm?next=/reset-password`,
    }
  )

  if (error) {
    console.error("[auth] resetPasswordForEmail failed:", error.message)
  }

  // Anti-enumeration: sempre retornamos success.
  return { success: true }
}

const resetSchema = z
  .object({
    password: z
      .string()
      .min(8, "A senha precisa ter pelo menos 8 caracteres")
      .regex(/[A-Z]/, "Inclua ao menos uma letra maiúscula")
      .regex(/[a-z]/, "Inclua ao menos uma letra minúscula")
      .regex(/\d/, "Inclua ao menos um número"),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "As senhas não conferem",
    path: ["confirmPassword"],
  })

export type ResetPasswordInput = z.infer<typeof resetSchema>

export async function resetPasswordAction(
  input: ResetPasswordInput
): Promise<ActionResult> {
  const parsed = resetSchema.safeParse(input)
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Dados inválidos",
    }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return {
      success: false,
      error: "Sessão expirada. Solicite um novo link de redefinição.",
    }
  }

  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  })

  if (error) {
    console.error("[auth] updateUser password failed:", error.message)
    return { success: false, error: "Não foi possível atualizar a senha." }
  }

  revalidatePath("/", "layout")
  return { success: true }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mapAuthError(raw: string): string {
  const msg = raw.toLowerCase()
  if (msg.includes("invalid login credentials"))
    return "E-mail ou senha incorretos."
  if (
    msg.includes("user already registered") ||
    msg.includes("already exists")
  )
    return "Este e-mail já está cadastrado. Tente entrar."
  if (msg.includes("password should be at least"))
    return "Senha muito curta. Use 8+ caracteres."
  if (msg.includes("rate limit") || msg.includes("too many"))
    return "Muitas tentativas. Aguarde alguns segundos."
  if (msg.includes("email not confirmed"))
    return "Confirme seu e-mail antes de entrar."
  return "Algo deu errado. Tente novamente."
}
