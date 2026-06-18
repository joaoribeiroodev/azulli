/**
 * Tipos compartilhados pelo Assistente IA Conversacional.
 *
 * Pipeline (8C):
 *   1. UI envia { conversationId?, message } para POST /api/chat
 *   2. Server: cria conversation se não existe, insere user message
 *   3. Loop de function calling com Gemini Flash (max 5 iterações)
 *   4. Stream chunks de texto pro client via SSE
 *   5. Persiste assistant message com tool_calls
 */

export type MessageRole = "user" | "assistant" | "tool"

/**
 * Registro persistido em `messages.tool_calls` (jsonb).
 *
 * Cada entry representa UMA execução de função: o que o Gemini pediu,
 * que args mandou, e o que voltamos pra ele.
 */
export type ToolCallRecord = {
  name: string
  args: Record<string, unknown>
  result: unknown
}

export type MessageRow = {
  id: string
  conversation_id: string
  tenant_id: string
  role: MessageRole
  content: string
  tool_calls: ToolCallRecord[] | null
  created_at: string
}

export type ConversationRow = {
  id: string
  tenant_id: string
  user_id: string
  title: string | null
  created_at: string
  updated_at: string
}

// ---------------------------------------------------------------------------
// Wire format (UI ↔ API)
// ---------------------------------------------------------------------------

export type SendMessageRequest = {
  /** undefined = começar conversa nova; servidor retorna o id criado. */
  conversationId?: string
  message: string
}

/**
 * Eventos que viajam pelo SSE stream.
 * Cada linha "data: {json}\n\n".
 */
export type ChatStreamEvent =
  | { type: "conversation"; conversationId: string }
  | { type: "meta"; source: "llm" | "rules"; notice?: string }
  | { type: "tool_call"; name: string; args: Record<string, unknown> }
  | { type: "text_delta"; text: string }
  | { type: "done" }
  | { type: "error"; message: string }
