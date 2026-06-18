import type { NextRequest } from "next/server"
import { z } from "zod"
import type {
  Content,
  FunctionResponsePart,
  Part,
  ChatSession,
} from "@google/generative-ai"

import { createClient } from "@/lib/supabase/server"
import {
  getGeminiClientForAssistant,
  GEMINI_FLASH_MODEL,
  GEMINI_FLASH_FALLBACK_MODELS,
  getAssistantMode,
  getAssistantDailyLlmLimit,
  isAssistantLlmEnabled,
} from "@/lib/ai/gemini"
import { formatGeminiUserError, isGeminiRetryableError } from "@/lib/ai/gemini-errors"
import { TOOL_DECLARATIONS, executeTool } from "@/lib/assistant/tools"
import { runRulesAssistant } from "@/lib/assistant/rules-engine"
import { countAssistantUserMessagesToday } from "@/lib/assistant/usage"
import { AZULLI_HELP_KNOWLEDGE } from "@/lib/assistant/help-knowledge"
import { canUseAssistant, type PlanId } from "@/lib/billing/plans"
import type {
  ChatStreamEvent,
  ToolCallRecord,
} from "@/lib/assistant/types"

export const runtime = "nodejs"

// ---------------------------------------------------------------------------
// Validação de input
// ---------------------------------------------------------------------------

const inputSchema = z.object({
  conversationId: z.string().uuid().optional(),
  message: z.string().trim().min(1, "Digite uma pergunta.").max(4000),
})

// ---------------------------------------------------------------------------
// Configuração do assistente
// ---------------------------------------------------------------------------

const SYSTEM_PROMPT = `Você é o assistente financeiro do Azulli, um SaaS para MEIs e pequenos empresários brasileiros.

Sua missão: responder perguntas sobre o caixa, lançamentos, clientes, fornecedores e padrões financeiros do usuário usando APENAS dados reais retornados pelas funções internas. NUNCA invente números nem chute.

Você também responde perguntas sobre **como usar o Azulli** (importar OFX, exportar Excel, convidar contador, filtros, metas, etc.). Use o guia abaixo — não invente funcionalidades que não existem.

${AZULLI_HELP_KNOWLEDGE}

Como falar com o usuário:
- Sempre em português do Brasil, tom amigável e direto, como um contador que conhece o negócio dele.
- Formate valores em reais (R$ 1.234,56) e datas no padrão brasileiro (dd/mm/yyyy).
- Seja conciso. Respostas curtas e diretas. Use bullets quando listar itens.
- Quando der números, contextualize ("você fechou o mês com R$ 5.230,00 de lucro — quer comparar com o mês passado?").
- Quando útil, sugira 1-2 ações de follow-up ("quer que eu liste os 3 clientes que mais devem?").

REGRAS CRÍTICAS de linguagem (NUNCA viole):
- NUNCA mencione nomes técnicos de funções, ferramentas, endpoints, parâmetros ou variáveis (ex: "get_financial_summary", "list_recent_transactions", "tool", "function", "API"). Esses nomes são internos e devem ser invisíveis pro usuário.
- Ao listar o que você sabe fazer, descreva em linguagem natural, do ponto de vista do dono do negócio. Ex:
  ✅ "Posso te dar um resumo de receita, despesa e lucro do mês."
  ✅ "Posso listar seus maiores clientes ou fornecedores do período."
  ✅ "Posso identificar despesas recorrentes (assinaturas, contas fixas)."
  ❌ "Posso chamar get_top_categories pra você."
  ❌ "Use a função list_recent_transactions com period=this_month."
- Não use jargão técnico (JSON, SQL, query, schema). Fale como humano falando com humano.

Limites:
- Se a pergunta for muito vaga, peça uma especificação curta em UMA frase antes de buscar dados.
- Se a pergunta sai do seu escopo (ex: pedidos de aconselhamento estratégico, recomendações fiscais, opiniões), responda brevemente o que VOCÊ pode fazer com base nos dados dele e ofereça opções práticas — sem listar nomes de função.
- Você NÃO pode criar nem alterar lançamentos. Pra isso, oriente o usuário a usar a tela de Lançamentos ou a importação de extrato (OFX) pelo próprio app.
- Para previsão de caixa / runway / "quantos dias de caixa", use a previsão de fluxo — não estime com o resumo do mês.

Estilo de "como posso ajudar":
Quando o usuário pedir uma ação genérica ("como posso melhorar meu lucro?", "o que você faz?"), responda com 3-5 sugestões CONCRETAS, em linguagem do negócio, e termine convidando a escolher uma. Exemplo:
"Posso te ajudar de algumas formas:
- Mostrar como está seu caixa esse mês (receita vs despesa).
- Apontar suas maiores despesas e categorias com mais peso.
- Identificar assinaturas e contas fixas que podem ser revisadas.
- Estimar quantos dias de caixa você tem (previsão de fluxo / runway).
- Listar os clientes que mais te pagaram (e os que estão devendo).
Por onde quer começar?"`

const MAX_TOOL_ITERATIONS = 5
const HISTORY_LIMIT = 30

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null)
  const parsed = inputSchema.safeParse(body)
  if (!parsed.success) {
    return errorResponse(
      400,
      parsed.error?.issues[0]?.message ?? "Mensagem inválida."
    )
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return errorResponse(401, "Sessão expirada.")

  const { data: tu } = await supabase
    .from("tenant_users")
    .select("tenant_id")
    .limit(1)
    .maybeSingle()
  if (!tu) return errorResponse(403, "Empresa não encontrada.")
  const tenantId = tu.tenant_id

  // Gating: assistente liberado em trial e enterprise.
  const { data: tenantRow } = await supabase
    .from("tenants")
    .select("tier")
    .eq("id", tenantId)
    .maybeSingle()
  const tier = (tenantRow?.tier ?? null) as PlanId | null
  if (!tier || !canUseAssistant(tier)) {
    return errorResponse(
      403,
      "Assistente IA disponível no plano Empresarial."
    )
  }

  const assistantClient = getGeminiClientForAssistant()
  const assistantMode = getAssistantMode()
  const userMessagesToday = await countAssistantUserMessagesToday(tenantId)
  const llmDailyLimit = getAssistantDailyLlmLimit()

  let useLlm =
    isAssistantLlmEnabled() &&
    assistantClient !== null &&
    assistantMode !== "rules"

  let rulesNotice: string | undefined
  if (assistantMode === "rules" || !assistantClient) {
    useLlm = false
    rulesNotice =
      assistantMode === "rules"
        ? "Modo consultas automáticas (sem IA generativa)."
        : "Resposta automática com seus dados — chave de IA do assistente não configurada."
  } else if (userMessagesToday >= llmDailyLimit) {
    useLlm = false
    rulesNotice =
      "Limite diário de respostas com IA atingido — usando consultas automáticas aos seus dados."
  }

  // ---- Resolve / cria conversa ----
  let conversationId = parsed.data.conversationId

  if (conversationId) {
    const { data } = await supabase
      .from("conversations")
      .select("id")
      .eq("id", conversationId)
      .maybeSingle()
    if (!data) return errorResponse(404, "Conversa não encontrada.")
  } else {
    const title = parsed.data.message.slice(0, 80)
    const { data, error } = await supabase
      .from("conversations")
      .insert({ tenant_id: tenantId, user_id: user.id, title })
      .select("id")
      .single()
    if (error || !data) {
      console.error("[chat] conversation insert failed:", error)
      return errorResponse(500, "Não foi possível iniciar a conversa.")
    }
    conversationId = data.id
  }

  // ---- Persiste a mensagem do usuário ----
  const { error: userMsgErr } = await supabase.from("messages").insert({
    conversation_id: conversationId,
    tenant_id: tenantId,
    role: "user",
    content: parsed.data.message,
  })
  if (userMsgErr) {
    console.error("[chat] user message insert failed:", userMsgErr)
    return errorResponse(500, "Não foi possível salvar a pergunta.")
  }

  // ---- Reconstrói histórico do Gemini ----
  const { data: prev } = await supabase
    .from("messages")
    .select("role, content")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true })
    .limit(HISTORY_LIMIT)

  // history INCLUI a mensagem que acabamos de inserir (último item).
  // Removemos esse último pra usar como `firstTurnInput` no startChat.
  const historyContents: Content[] = []
  for (const m of prev ?? []) {
    if (m.role === "user") {
      historyContents.push({ role: "user", parts: [{ text: m.content }] })
    } else if (m.role === "assistant") {
      historyContents.push({ role: "model", parts: [{ text: m.content }] })
    }
    // role 'tool' fica fora — Gemini reconstrói o ciclo do zero a cada request.
  }
  // Tira a última (que é a do usuário recém-inserida).
  historyContents.pop()

  // ---- Inicia o chat com tools (só se useLlm) ----
  const modelNames = useLlm
    ? [GEMINI_FLASH_MODEL, ...GEMINI_FLASH_FALLBACK_MODELS]
    : []
  const client = assistantClient

  async function runChatLoop(
    chat: ChatSession,
    turnInput: string | Part[],
    send: (event: ChatStreamEvent) => void
  ): Promise<{ finalText: string; toolCallsRecord: ToolCallRecord[] }> {
    const toolCallsRecord: ToolCallRecord[] = []
    let finalText = ""

    for (let iter = 0; iter < MAX_TOOL_ITERATIONS; iter++) {
      const streamResult = await chat.sendMessageStream(turnInput)

      const collectedCalls: Array<{
        name: string
        args: Record<string, unknown>
      }> = []
      let collectedText = ""

      for await (const chunk of streamResult.stream) {
        const calls = chunk.functionCalls()
        if (calls && calls.length > 0) {
          for (const c of calls) {
            collectedCalls.push({
              name: c.name,
              args: (c.args ?? {}) as Record<string, unknown>,
            })
          }
        }
        const txt = chunk.text()
        if (txt) {
          collectedText += txt
          send({ type: "text_delta", text: txt })
        }
      }

      if (collectedCalls.length === 0) {
        finalText = collectedText
        break
      }

      const responseParts: FunctionResponsePart[] = []
      const toolResults = await Promise.all(
        collectedCalls.map(async (call) => {
          send({
            type: "tool_call",
            name: call.name,
            args: call.args,
          })
          const result = await executeTool(call.name, call.args)
          return { call, result }
        })
      )

      for (const { call, result } of toolResults) {
        toolCallsRecord.push({
          name: call.name,
          args: call.args,
          result,
        })
        responseParts.push({
          functionResponse: {
            name: call.name,
            response: { result },
          },
        })
      }

      turnInput = responseParts
    }

    return { finalText, toolCallsRecord }
  }

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: ChatStreamEvent) => {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(event)}\n\n`)
        )
      }

      send({ type: "conversation", conversationId: conversationId! })

      try {
        let finalText = ""
        let toolCallsRecord: ToolCallRecord[] = []

        if (!useLlm || !client) {
          const rules = await runRulesAssistant(parsed.data.message)
          finalText = rules.text
          toolCallsRecord = rules.toolCalls
          send({
            type: "meta",
            source: "rules",
            notice: rulesNotice,
          })
          for (const call of rules.toolCalls) {
            send({
              type: "tool_call",
              name: call.name,
              args: call.args,
            })
          }
          send({ type: "text_delta", text: finalText })
        } else {
          const turnInput: string | Part[] = parsed.data.message
          let lastErr: unknown = null

          for (const modelName of modelNames) {
            try {
              const model = client.getGenerativeModel({
                model: modelName,
                systemInstruction: SYSTEM_PROMPT,
                tools: [{ functionDeclarations: TOOL_DECLARATIONS }],
              })
              const chat = model.startChat({ history: historyContents })
              const result = await runChatLoop(chat, turnInput, send)
              finalText = result.finalText
              toolCallsRecord = result.toolCallsRecord
              lastErr = null
              send({ type: "meta", source: "llm" })
              break
            } catch (err) {
              lastErr = err
              const status = (err as { status?: number }).status
              const isLast = modelName === modelNames.at(-1)
              if (!isLast && isGeminiRetryableError(err)) {
                console.warn(
                  `[chat] modelo ${modelName} falhou (${status ?? "erro"}) — tentando fallback`
                )
                continue
              }
              if (!isLast) {
                console.warn(
                  `[chat] modelo ${modelName} falhou — tentando fallback`
                )
                continue
              }
              // Último modelo: sai do loop e usa consultas automáticas abaixo.
            }
          }

          if (lastErr || !finalText) {
            console.warn("[chat] LLM falhou — fallback rules:", lastErr)
            const rules = await runRulesAssistant(parsed.data.message)
            finalText = rules.text
            toolCallsRecord = rules.toolCalls
            send({
              type: "meta",
              source: "rules",
              notice:
                "IA temporariamente indisponível (limite do provedor). Resposta automática com seus dados.",
            })
            for (const call of rules.toolCalls) {
              send({
                type: "tool_call",
                name: call.name,
                args: call.args,
              })
            }
            send({ type: "text_delta", text: finalText })
          }
        }

        const persistedContent =
          finalText ||
          "Não consegui responder agora. Pode reformular a pergunta?"

        await supabase.from("messages").insert({
          conversation_id: conversationId,
          tenant_id: tenantId,
          role: "assistant",
          content: persistedContent,
          tool_calls: toolCallsRecord.length > 0 ? toolCallsRecord : null,
        })

        await supabase
          .from("conversations")
          .update({ updated_at: new Date().toISOString() })
          .eq("id", conversationId!)

        send({ type: "done" })
      } catch (err) {
        console.error("[chat] stream error:", err)
        send({
          type: "error",
          message: formatGeminiUserError(err),
        })
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  })
}

function errorResponse(status: number, message: string) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "Content-Type": "application/json" },
  })
}
