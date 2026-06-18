"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Send, Sparkles, Loader2, AlertCircle } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { MessageBubble } from "./message-bubble"
import { ToolIndicator } from "./tool-indicator"
import { MarkdownLite } from "./markdown-lite"
import type { AssistantMode } from "@/lib/ai/gemini"
import type { ChatStreamEvent } from "@/lib/assistant/types"

export type InitialMessage = {
  id: string
  role: "user" | "assistant"
  content: string
  toolCalls: { name: string }[] | null
}

type ChatMessage = {
  id: string
  role: "user" | "assistant"
  content: string
  toolCalls: { name: string }[] | null
}

type Props = {
  initialConversationId: string | null
  initialMessages: InitialMessage[]
  llmAvailable?: boolean
  assistantMode?: AssistantMode
}

const SUGGESTIONS = [
  {
    title: "Como está meu caixa esse mês?",
    sub: "Receita, despesa e lucro do mês corrente.",
  },
  {
    title: "Quantos dias de caixa eu tenho?",
    sub: "Runway com base na previsão de fluxo.",
  },
  {
    title: "Quanto gasto em assinaturas e contas fixas?",
    sub: "Lista as recorrentes detectadas.",
  },
  {
    title: "Quem são meus 5 maiores clientes?",
    sub: "Top clientes por receita do mês.",
  },
  {
    title: "O que está vencido?",
    sub: "Lançamentos atrasados e totais.",
  },
  {
    title: "O que mudou vs mês passado?",
    sub: "Compara despesas por categoria.",
  },
  {
    title: "Qual minha maior despesa este mês?",
    sub: "Categoria ou lançamento que mais pesa.",
  },
]

export function ChatShell({
  initialConversationId,
  initialMessages,
  llmAvailable = true,
  assistantMode = "auto",
}: Props) {
  const router = useRouter()
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const [messages, setMessages] = useState<ChatMessage[]>(
    initialMessages.map((m) => ({
      id: m.id,
      role: m.role,
      content: m.content,
      toolCalls: m.toolCalls,
    }))
  )
  const [conversationId, setConversationId] = useState<string | null>(
    initialConversationId
  )
  const [input, setInput] = useState("")
  const [streaming, setStreaming] = useState(false)
  const [pending, setPending] = useState<ChatMessage | null>(null)
  const pendingRef = useRef<ChatMessage | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)
  const [rulesNotice, setRulesNotice] = useState<string | null>(null)

  function updatePending(updater: (prev: ChatMessage) => ChatMessage) {
    if (!pendingRef.current) return
    const next = updater(pendingRef.current)
    pendingRef.current = next
    setPending(next)
  }

  // Auto-scroll quando mensagens crescem
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, pending])

  // Atalhos: Cmd/Ctrl+K → nova conversa · Cmd/Ctrl+/ → focar input
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const mod = e.metaKey || e.ctrlKey
      if (!mod) return
      if (e.key === "k" || e.key === "K") {
        e.preventDefault()
        if (window.location.pathname !== "/assistente") {
          router.push("/assistente")
        } else {
          inputRef.current?.focus()
        }
      } else if (e.key === "/") {
        e.preventDefault()
        inputRef.current?.focus()
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [router])

  // Cancela fetch em unmount
  useEffect(() => {
    return () => {
      abortRef.current?.abort()
    }
  }, [])

  async function send(messageText: string) {
    const text = messageText.trim()
    if (!text || streaming) return

    setRulesNotice(null)

    const userMsg: ChatMessage = {
      id: `local-user-${Date.now()}`,
      role: "user",
      content: text,
      toolCalls: null,
    }
    setMessages((prev) => [...prev, userMsg])

    const pendingMsg: ChatMessage = {
      id: `local-assistant-${Date.now()}`,
      role: "assistant",
      content: "",
      toolCalls: [],
    }
    pendingRef.current = pendingMsg
    setPending(pendingMsg)
    setStreaming(true)

    const controller = new AbortController()
    abortRef.current = controller

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId: conversationId ?? undefined,
          message: text,
        }),
        signal: controller.signal,
      })

      if (!res.ok || !res.body) {
        const data = await res
          .json()
          .catch(() => ({ error: "Erro inesperado." }))
        throw new Error(data.error ?? "Erro inesperado.")
      }

      let createdNewConversation = false

      for await (const ev of readSseEvents(res.body)) {
        if (ev.type === "conversation") {
          if (!conversationId) {
            setConversationId(ev.conversationId)
            createdNewConversation = true
          }
        } else if (ev.type === "meta") {
          if (ev.notice) setRulesNotice(ev.notice)
        } else if (ev.type === "tool_call") {
          updatePending((prev) => ({
            ...prev,
            toolCalls: [...(prev.toolCalls ?? []), { name: ev.name }],
          }))
        } else if (ev.type === "text_delta") {
          updatePending((prev) => ({
            ...prev,
            content: prev.content + ev.text,
          }))
        } else if (ev.type === "error") {
          throw new Error(ev.message)
        } else if (ev.type === "done") {
          break
        }
      }

      // Move pending → messages (sem side-effect dentro de updater)
      const finalMsg = pendingRef.current
      pendingRef.current = null
      setPending(null)
      if (finalMsg) {
        setMessages((cur) => [...cur, finalMsg])
      }

      // Atualiza sidebar com a nova conversa
      router.refresh()

      if (createdNewConversation) {
        // Mantém o histórico local mas atualiza URL silenciosamente
        // (sem navegar pra evitar recarregar mensagens). O refresh já
        // sincroniza a sidebar.
      }
    } catch (err: unknown) {
      const isAbort =
        err instanceof DOMException && err.name === "AbortError"
      if (!isAbort) {
        const msg = err instanceof Error ? err.message : "Erro desconhecido."
        toast.error(msg)
      }
      pendingRef.current = null
      setPending(null)
    } finally {
      abortRef.current = null
      setStreaming(false)
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    void send(input)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      void send(input)
    }
  }

  const isEmpty = messages.length === 0 && !pending

  return (
    <div className="flex flex-col min-h-0 flex-1">
      {/* Header */}
      <div className="border-b px-4 sm:px-6 py-4">
        <h1 className="text-xl font-display font-bold text-brand-ink flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-brand" />
          Assistente IA
        </h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Pergunte sobre seu caixa, lançamentos, clientes ou padrões financeiros.
          {assistantMode === "rules" && (
            <span className="text-brand"> · Consultas automáticas (sem IA generativa)</span>
          )}
        </p>
      </div>

      {rulesNotice && (
        <div className="mx-4 sm:mx-6 mt-3 rounded-lg border border-brand/25 bg-brand-soft/40 px-3 py-2 text-xs text-muted-foreground">
          {rulesNotice}
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-6">
        <div className="max-w-3xl mx-auto space-y-5">
          {!llmAvailable && assistantMode !== "rules" && (
            <div className="flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-900 px-4 py-3">
              <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-amber-800 dark:text-amber-200">
                  IA generativa opcional
                </p>
                <p className="text-sm text-amber-700 dark:text-amber-300 mt-0.5">
                  Você ainda pode usar o assistente: as perguntas são respondidas
                  com consultas automáticas aos seus dados. Para liberar conversa
                  com IA, configure{" "}
                  <code className="font-mono text-xs">
                    GOOGLE_GENERATIVE_AI_ASSISTANT_KEY
                  </code>
                  .
                </p>
              </div>
            </div>
          )}
          {isEmpty ? (
            <EmptyState onSelect={(q) => void send(q)} streaming={streaming} />
          ) : (
            <>
              {messages.map((m) => (
                <MessageBubble
                  key={m.id}
                  role={m.role}
                  content={m.content}
                  toolCalls={m.toolCalls}
                />
              ))}
              {pending && (
                <PendingAssistantBubble
                  content={pending.content}
                  toolCalls={pending.toolCalls ?? []}
                />
              )}
            </>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <div className="border-t bg-background/95 backdrop-blur sticky bottom-0 pb-[env(safe-area-inset-bottom,0px)]">
        <form
          onSubmit={handleSubmit}
          className="max-w-3xl mx-auto px-4 sm:px-6 py-4"
        >
          <div className="relative">
            <Textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Pergunte algo sobre suas finanças…"
              disabled={streaming}
              rows={1}
              className="resize-none pr-12 min-h-[48px] max-h-40"
            />
            <Button
              type="submit"
              size="icon"
              disabled={streaming || input.trim().length === 0}
              className="absolute right-2 bottom-2 h-8 w-8 bg-brand hover:bg-brand-hover"
              aria-label="Enviar"
            >
              {streaming ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground mt-1.5 text-center">
            O assistente lê seus dados em tempo real. Verifique sempre os
            números antes de tomar decisões.{" "}
            <span className="hidden sm:inline">
              · Atalhos:{" "}
              <kbd className="rounded border bg-muted px-1 py-0.5 text-[9px] font-mono">
                ⌘K
              </kbd>{" "}
              novo ·{" "}
              <kbd className="rounded border bg-muted px-1 py-0.5 text-[9px] font-mono">
                ⌘/
              </kbd>{" "}
              foco
            </span>
          </p>
        </form>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Pending bubble (during streaming) — mostra tools rolando + texto stream
// ---------------------------------------------------------------------------

function PendingAssistantBubble({
  content,
  toolCalls,
}: {
  content: string
  toolCalls: { name: string }[]
}) {
  const lastTool = toolCalls.at(-1)
  const otherTools = toolCalls.slice(0, -1)
  return (
    <div className="flex gap-3 items-start">
      <div className="h-8 w-8 rounded-full bg-brand-soft flex items-center justify-center shrink-0">
        <Sparkles className="h-4 w-4 text-brand" />
      </div>
      <div className="flex-1 min-w-0 space-y-2">
        {(otherTools.length > 0 || (lastTool && content.length > 0)) && (
          <div className="flex flex-wrap gap-1.5">
            {otherTools.map((t, i) => (
              <ToolIndicator key={i} name={t.name} done />
            ))}
            {lastTool && content.length > 0 && (
              <ToolIndicator name={lastTool.name} done />
            )}
          </div>
        )}
        {lastTool && content.length === 0 && (
          <ToolIndicator name={lastTool.name} />
        )}
        {content.length > 0 && (
          <div className="text-sm break-words text-foreground leading-relaxed">
            <MarkdownLite text={content} />
          </div>
        )}
        {!lastTool && content.length === 0 && (
          <div className="text-sm text-muted-foreground italic">Pensando…</div>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Empty state com sugestões
// ---------------------------------------------------------------------------

function EmptyState({
  onSelect,
  streaming,
}: {
  onSelect: (q: string) => void
  streaming: boolean
}) {
  return (
    <div className="py-12 text-center space-y-6">
      <div className="space-y-2">
        <div className="h-14 w-14 mx-auto rounded-full bg-brand-soft flex items-center justify-center">
          <Sparkles className="h-6 w-6 text-brand" />
        </div>
        <h2 className="text-2xl font-display font-bold text-brand-ink">
          Como posso te ajudar hoje?
        </h2>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          Faço análises usando os dados reais do seu Azulli. Pergunte na linguagem
          natural — eu busco e te explico.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-2xl mx-auto pt-2">
        {SUGGESTIONS.map((s) => (
          <button
            key={s.title}
            type="button"
            disabled={streaming}
            onClick={() => onSelect(s.title)}
            className="text-left rounded-xl border bg-card hover:bg-muted/50 transition-colors p-3 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <p className="text-sm font-medium">{s.title}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{s.sub}</p>
          </button>
        ))}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Parser SSE
// ---------------------------------------------------------------------------

async function* readSseEvents(
  body: ReadableStream<Uint8Array>
): AsyncGenerator<ChatStreamEvent> {
  const reader = body.getReader()
  const decoder = new TextDecoder()
  let buffer = ""
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })

    let idx
    while ((idx = buffer.indexOf("\n\n")) >= 0) {
      const chunk = buffer.slice(0, idx)
      buffer = buffer.slice(idx + 2)
      const dataLine = chunk
        .split("\n")
        .find((l) => l.startsWith("data:"))
      if (!dataLine) continue
      const json = dataLine.slice(5).trim()
      if (!json) continue
      try {
        yield JSON.parse(json) as ChatStreamEvent
      } catch {
        // ignora chunk malformado
      }
    }
  }
}
