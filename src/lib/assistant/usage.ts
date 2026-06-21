import "server-only"

import { createClient } from "@/lib/supabase/server"
import { startOfTodayBRTIso } from "@/lib/utils/date"

/**
 * Mensagens do usuário no assistente hoje (tenant).
 * Usado para limitar chamadas LLM e proteger quota do Gemini.
 */
export async function countAssistantUserMessagesToday(
  tenantId: string
): Promise<number> {
  const supabase = await createClient()
  const since = startOfTodayBRTIso()

  const { data: conversations } = await supabase
    .from("conversations")
    .select("id")
    .eq("tenant_id", tenantId)

  const ids = (conversations ?? []).map((c) => c.id as string)
  if (ids.length === 0) return 0

  const { count, error } = await supabase
    .from("messages")
    .select("id", { count: "exact", head: true })
    .in("conversation_id", ids)
    .eq("role", "user")
    .gte("created_at", since)

  if (error) {
    console.error("[assistant] usage count failed:", error.message)
    return 0
  }
  return count ?? 0
}
