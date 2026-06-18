import "server-only"

import { createClient } from "@/lib/supabase/server"
import type {
  ConversationRow,
  MessageRow,
} from "@/lib/assistant/types"

const CONVERSATION_LIST_LIMIT = 30

/**
 * Lista as conversas do usuário atual, ordenadas por atividade recente.
 * RLS garante que só vemos as próprias.
 */
export async function listConversations(): Promise<ConversationRow[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("conversations")
    .select("id, tenant_id, user_id, title, created_at, updated_at")
    .order("updated_at", { ascending: false })
    .limit(CONVERSATION_LIST_LIMIT)

  if (error) {
    console.error("[assistant] listConversations failed:", error)
    return []
  }
  return (data ?? []) as ConversationRow[]
}

/**
 * Carrega todas as mensagens da conversa (sem mensagens 'tool' — essas só
 * existem no contexto da request, não interessam pra UI).
 */
export async function getConversationMessages(
  conversationId: string
): Promise<MessageRow[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("messages")
    .select("id, conversation_id, tenant_id, role, content, tool_calls, created_at")
    .eq("conversation_id", conversationId)
    .in("role", ["user", "assistant"])
    .order("created_at", { ascending: true })

  if (error) {
    console.error("[assistant] getConversationMessages failed:", error)
    return []
  }
  return (data ?? []) as MessageRow[]
}
