"use server"

import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
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

function mapAuthError(raw: string): string {
  const msg = raw.toLowerCase()
  if (msg.includes("invalid login credentials")) return "E-mail ou senha incorretos."
  if (msg.includes("user already registered") || msg.includes("already exists")) return "Este e-mail já está cadastrado. Tente entrar."
  if (msg.includes("password should be at least")) return "Senha muito curta. Use 8+ caracteres."
  if (msg.includes("rate limit") || msg.includes("too many")) return "Muitas tentativas. Aguarde alguns segundos."
  if (msg.includes("email not confirmed")) return "Confirme seu e-mail antes de entrar."
  return "Algo deu errado. Tente novamente."
}