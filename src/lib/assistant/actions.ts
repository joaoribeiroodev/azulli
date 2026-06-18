"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"

type ActionResult<T = undefined> =
  | { success: true; data: T }
  | { success: false; error: string }

const idSchema = z.string().uuid()

export async function deleteConversationAction(
  conversationId: string
): Promise<ActionResult> {
  const parsed = idSchema.safeParse(conversationId)
  if (!parsed.success) {
    return { success: false, error: "Conversa inválida." }
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from("conversations")
    .delete()
    .eq("id", parsed.data)

  if (error) {
    console.error("[assistant] delete failed:", error)
    return { success: false, error: "Não foi possível excluir a conversa." }
  }

  revalidatePath("/assistente")
  return { success: true, data: undefined }
}
