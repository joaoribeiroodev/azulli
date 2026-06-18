"use server"

import { createClient } from "@/lib/supabase/server"

type ActionResult = { success: true } | { success: false; error: string }

export async function deleteMyAccountAction(): Promise<ActionResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: "Sessão expirada. Entre novamente." }
  }

  const { error } = await supabase.rpc("delete_my_account")

  if (error) {
    console.error("[lgpd] delete_my_account failed:", error.message)
    return {
      success: false,
      error:
        "Não foi possível excluir sua conta. Tente novamente ou contate o suporte.",
    }
  }

  try {
    await supabase.auth.signOut()
  } catch {
    // Sessão já inválida após remoção do usuário — ignorar.
  }

  return { success: true }
}
