import Link from "next/link"
import { Sparkles } from "lucide-react"

import { Button } from "@/components/ui/button"
import { getConversationMessages } from "@/lib/assistant/queries"
import {
  getAssistantMode,
  getGeminiClientForAssistant,
  isAssistantLlmEnabled,
} from "@/lib/ai/gemini"
import { ChatShell, type InitialMessage } from "../_components/chat-shell"

export default async function AssistenteConversationPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  if (!isUuid(id)) return <ConversationMissing />

  const messages = await getConversationMessages(id)
  if (messages.length === 0) return <ConversationMissing />

  const initial: InitialMessage[] = messages.map((m) => ({
    id: m.id,
    role: m.role === "assistant" ? "assistant" : "user",
    content: m.content,
    toolCalls:
      m.role === "assistant" && m.tool_calls
        ? m.tool_calls.map((t) => ({ name: t.name }))
        : null,
  }))

  const llmAvailable =
    isAssistantLlmEnabled() && getGeminiClientForAssistant() !== null
  const assistantMode = getAssistantMode()

  return (
    <ChatShell
      initialConversationId={id}
      initialMessages={initial}
      llmAvailable={llmAvailable}
      assistantMode={assistantMode}
    />
  )
}

function ConversationMissing() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8 text-center">
      <div className="h-14 w-14 rounded-full bg-brand-soft flex items-center justify-center mb-4">
        <Sparkles className="h-6 w-6 text-brand" />
      </div>
      <h2 className="text-xl font-display font-bold text-brand-ink">
        Conversa não encontrada
      </h2>
      <p className="text-sm text-muted-foreground mt-1 max-w-sm">
        Essa conversa pode ter sido excluída ou o link está incorreto.
      </p>
      <Button asChild className="mt-4 bg-brand hover:bg-brand-hover">
        <Link href="/assistente">Iniciar nova conversa</Link>
      </Button>
    </div>
  )
}

function isUuid(s: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s)
}
