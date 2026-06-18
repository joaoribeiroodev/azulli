/**
 * Categorização automática de transações OFX via Gemini Flash.
 *
 * Estratégia:
 *   1. Carrega categorias de despesa+receita já usadas pelo tenant (vocab dinâmico).
 *   2. Carrega últimos 50 (descrição → categoria) confirmados pelo usuário (few-shot).
 *   3. Manda um único call pra Gemini com TODAS as transações do batch.
 *   4. Output JSON estruturado [{rowId, category}] via responseSchema.
 *   5. Se IA off, falha ou demora demais → retorna mapa vazio (graceful).
 */

import { GEMINI_FLASH_MODEL, getGeminiClientForOfx } from "@/lib/ai/gemini"
import { CATEGORY_SUGGESTIONS } from "@/lib/financial/schemas"
import { createClient } from "@/lib/supabase/server"
import { SchemaType } from "@google/generative-ai"

const HISTORY_SAMPLE_SIZE = 50
const REQUEST_TIMEOUT_MS = 15_000
const MAX_CATEGORY_LENGTH = 60

type CategorizeInput = {
  rowId: string
  type: "income" | "expense"
  amount: number
  description: string
}

type HistoryEntry = {
  description: string
  category: string
}

/**
 * Carrega o histórico de (descrição → categoria) confirmado pelo usuário.
 * Usa para few-shot dinâmico: a IA aprende o padrão específico do tenant.
 */
async function loadHistory(tenantId: string): Promise<{
  expense: HistoryEntry[]
  income: HistoryEntry[]
  knownCategories: { expense: string[]; income: string[] }
}> {
  const supabase = await createClient()
  const { data } = await supabase
    .from("transactions")
    .select("type, description, category")
    .eq("tenant_id", tenantId)
    .not("category", "is", null)
    .not("description", "is", null)
    .order("created_at", { ascending: false })
    .limit(HISTORY_SAMPLE_SIZE * 2)

  const rows = data ?? []
  const expense: HistoryEntry[] = []
  const income: HistoryEntry[] = []
  const expenseSet = new Set<string>()
  const incomeSet = new Set<string>()

  for (const r of rows) {
    if (!r.description || !r.category) continue
    const entry = { description: r.description, category: r.category }
    if (r.type === "expense" && expense.length < HISTORY_SAMPLE_SIZE) {
      expense.push(entry)
      expenseSet.add(r.category)
    } else if (r.type === "income" && income.length < HISTORY_SAMPLE_SIZE) {
      income.push(entry)
      incomeSet.add(r.category)
    }
  }

  return {
    expense,
    income,
    knownCategories: {
      expense: Array.from(expenseSet),
      income: Array.from(incomeSet),
    },
  }
}

function buildPrompt(
  rows: CategorizeInput[],
  history: Awaited<ReturnType<typeof loadHistory>>
): string {
  const baseExpense = [...CATEGORY_SUGGESTIONS.expense]
  const baseIncome = [...CATEGORY_SUGGESTIONS.income]
  const expenseVocab = Array.from(
    new Set([...history.knownCategories.expense, ...baseExpense])
  )
  const incomeVocab = Array.from(
    new Set([...history.knownCategories.income, ...baseIncome])
  )

  const fewShotExpense = history.expense
    .slice(0, 15)
    .map((h) => `- "${h.description}" → "${h.category}"`)
    .join("\n")

  const fewShotIncome = history.income
    .slice(0, 5)
    .map((h) => `- "${h.description}" → "${h.category}"`)
    .join("\n")

  const items = rows
    .map(
      (r) =>
        `${r.rowId} | ${r.type} | R$ ${r.amount.toFixed(2)} | ${r.description}`
    )
    .join("\n")

  return `Você é um assistente financeiro brasileiro categorizando lançamentos de extrato bancário.

REGRAS:
1. Para cada linha, escolha UMA categoria curta em português (máx ${MAX_CATEGORY_LENGTH} chars).
2. PREFIRA reusar uma das categorias do vocabulário abaixo. Só crie nova se nenhuma encaixar.
3. Use letras minúsculas exceto na primeira letra. Sem emojis.
4. Se a descrição for ambígua, escolha a categoria mais provável; nunca deixe vazio.

VOCABULÁRIO DE DESPESAS (use estas quando possível):
${expenseVocab.map((c) => `- ${c}`).join("\n")}

VOCABULÁRIO DE RECEITAS (use estas quando possível):
${incomeVocab.map((c) => `- ${c}`).join("\n")}

EXEMPLOS REAIS DESTE USUÁRIO (siga o estilo dele):
${fewShotExpense || "(sem histórico de despesas ainda)"}
${fewShotIncome ? "\n" + fewShotIncome : ""}

LANÇAMENTOS PRA CATEGORIZAR (formato: rowId | type | valor | descrição):
${items}

Retorne JSON com a categoria escolhida pra cada rowId.`
}

/**
 * Categoriza um lote de transações. Retorna `Map<rowId, category>`.
 * Se IA não disponível ou falhar, retorna mapa vazio (graceful).
 */
export async function categorizeImportBatch(
  tenantId: string,
  rows: CategorizeInput[]
): Promise<Map<string, string>> {
  const result = new Map<string, string>()
  if (rows.length === 0) return result

  const client = getGeminiClientForOfx()
  if (!client) return result

  let history: Awaited<ReturnType<typeof loadHistory>>
  try {
    history = await loadHistory(tenantId)
  } catch (err) {
    console.error("[categorize] loadHistory failed:", err)
    return result
  }

  const model = client.getGenerativeModel({
    model: GEMINI_FLASH_MODEL,
    generationConfig: {
      temperature: 0.2,
      responseMimeType: "application/json",
      responseSchema: {
        type: SchemaType.OBJECT,
        properties: {
          categorizations: {
            type: SchemaType.ARRAY,
            items: {
              type: SchemaType.OBJECT,
              properties: {
                rowId: { type: SchemaType.STRING },
                category: { type: SchemaType.STRING },
              },
              required: ["rowId", "category"],
            },
          },
        },
        required: ["categorizations"],
      },
    },
  })

  const prompt = buildPrompt(rows, history)
  const ac = new AbortController()
  const timeout = setTimeout(() => ac.abort(), REQUEST_TIMEOUT_MS)

  try {
    const response = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
    })
    clearTimeout(timeout)

    const text = response.response.text()
    const parsed = JSON.parse(text) as {
      categorizations: Array<{ rowId: string; category: string }>
    }

    for (const item of parsed.categorizations ?? []) {
      const cat = item.category?.trim().slice(0, MAX_CATEGORY_LENGTH)
      if (item.rowId && cat) result.set(item.rowId, cat)
    }
  } catch (err) {
    clearTimeout(timeout)
    console.error("[categorize] gemini call failed:", err)
  }

  return result
}
