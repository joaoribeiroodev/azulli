import { ChatShell } from "./_components/chat-shell"
import {
  getAssistantMode,
  getGeminiClientForAssistant,
  isAssistantLlmEnabled,
} from "@/lib/ai/gemini"

export default function AssistenteHomePage() {
  const llmAvailable =
    isAssistantLlmEnabled() && getGeminiClientForAssistant() !== null
  const assistantMode = getAssistantMode()

  return (
    <ChatShell
      initialConversationId={null}
      initialMessages={[]}
      llmAvailable={llmAvailable}
      assistantMode={assistantMode}
    />
  )
}
