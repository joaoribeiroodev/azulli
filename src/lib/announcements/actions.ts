"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"

type ActionResult =
  | { success: true }
  | { success: false; error: string }

export async function markAnnouncementReadAction(
  announcementId: string
): Promise<ActionResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: "Não autenticado." }

  const { error } = await supabase.from("announcement_reads").upsert(
    {
      user_id: user.id,
      announcement_id: announcementId,
      read_at: new Date().toISOString(),
    },
    { onConflict: "user_id,announcement_id" }
  )

  if (error) {
    return { success: false, error: "Não foi possível marcar como lida." }
  }

  revalidatePath("/", "layout")
  return { success: true }
}
