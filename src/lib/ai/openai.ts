import "server-only"

const DEFAULT_MODEL = "gpt-4o-mini"

export type ChatMessage = {
  role: "system" | "user" | "assistant"
  content: string
}

export async function callOpenAIChat(
  messages: ChatMessage[],
  options?: { model?: string; maxTokens?: number }
): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    throw new Error("[openai] OPENAI_API_KEY não configurada.")
  }

  const model = options?.model ?? process.env.OPENAI_MODEL ?? DEFAULT_MODEL

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages,
      max_tokens: options?.maxTokens ?? 500,
      temperature: 0.7,
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`[openai] ${res.status} ${err}`)
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>
  }
  const content = data.choices?.[0]?.message?.content?.trim()
  if (!content) throw new Error("[openai] Resposta vazia.")
  return content
}
