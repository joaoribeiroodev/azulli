import type { CalendarEventKind } from "@/lib/agenda/types"

/** Tom emocional — guia a paleta e os textos da legenda. */
export type AgendaTone =
  | "positive"
  | "caution"
  | "urgent"
  | "info"
  | "aspiration"

export type AgendaLegendItem = {
  kind: CalendarEventKind
  label: string
  /** Microtexto com o “significado” emocional da cor. */
  hint: string
  tone: AgendaTone
  dotClass: string
  chipClass: string
  rowClass: string
  iconClass: string
}

/**
 * Paleta semântica da agenda (psicologia das cores):
 * - Verde → positivo, entrada, tranquilidade
 * - Laranja → atenção moderada, saída programada (sem pânico)
 * - Vermelho → urgência, ação imediata
 * - Azul → informação, memória, lembrete calmo
 * - Roxo → foco, objetivo, visão de longo prazo
 */
export const AGENDA_LEGEND_ITEMS: AgendaLegendItem[] = [
  {
    kind: "income",
    label: "Receita pendente",
    hint: "Dinheiro a entrar",
    tone: "positive",
    dotClass: "bg-emerald-500",
    chipClass:
      "border-emerald-200/80 bg-emerald-50 dark:border-emerald-900/60 dark:bg-emerald-950/35",
    rowClass:
      "text-emerald-900 border-emerald-200 bg-emerald-50/80 dark:text-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/30",
    iconClass: "text-emerald-600 dark:text-emerald-400",
  },
  {
    kind: "expense",
    label: "Despesa pendente",
    hint: "Pagamento programado",
    tone: "caution",
    dotClass: "bg-orange-500",
    chipClass:
      "border-orange-200/80 bg-orange-50 dark:border-orange-900/60 dark:bg-orange-950/35",
    rowClass:
      "text-orange-950 border-orange-200 bg-orange-50/80 dark:text-orange-100 dark:border-orange-800 dark:bg-orange-950/30",
    iconClass: "text-orange-600 dark:text-orange-400",
  },
  {
    kind: "overdue",
    label: "Lançamento vencido",
    hint: "Precisa agir agora",
    tone: "urgent",
    dotClass: "bg-red-600 ring-2 ring-red-300 dark:ring-red-900",
    chipClass:
      "border-red-300/90 bg-red-50 dark:border-red-900 dark:bg-red-950/40",
    rowClass:
      "text-red-950 border-red-300 bg-red-50/90 dark:text-red-100 dark:border-red-800 dark:bg-red-950/35",
    iconClass: "text-red-600 dark:text-red-400",
  },
  {
    kind: "reminder",
    label: "Lembrete",
    hint: "Tarefa ou aviso",
    tone: "info",
    dotClass: "bg-sky-500",
    chipClass:
      "border-sky-200/80 bg-sky-50 dark:border-sky-900/60 dark:bg-sky-950/35",
    rowClass:
      "text-sky-950 border-sky-200 bg-sky-50/80 dark:text-sky-100 dark:border-sky-800 dark:bg-sky-950/30",
    iconClass: "text-sky-600 dark:text-sky-400",
  },
  {
    kind: "goal_deadline",
    label: "Prazo de meta",
    hint: "Foco no objetivo",
    tone: "aspiration",
    dotClass: "bg-violet-500",
    chipClass:
      "border-violet-200/80 bg-violet-50 dark:border-violet-900/60 dark:bg-violet-950/35",
    rowClass:
      "text-violet-950 border-violet-200 bg-violet-50/80 dark:text-violet-100 dark:border-violet-800 dark:bg-violet-950/30",
    iconClass: "text-violet-600 dark:text-violet-400",
  },
]

export const AGENDA_DOT_COLORS: Record<CalendarEventKind, string> =
  Object.fromEntries(
    AGENDA_LEGEND_ITEMS.map((item) => [item.kind, item.dotClass])
  ) as Record<CalendarEventKind, string>

const TONE_INTRO: Record<AgendaTone, string> = {
  positive: "Positivo",
  caution: "Atenção",
  urgent: "Urgente",
  info: "Informação",
  aspiration: "Objetivo",
}

export function getAgendaLegendLabel(kind: CalendarEventKind): string {
  return AGENDA_LEGEND_ITEMS.find((item) => item.kind === kind)?.label ?? kind
}

export function getAgendaKindStyles(kind: CalendarEventKind): AgendaLegendItem {
  return (
    AGENDA_LEGEND_ITEMS.find((item) => item.kind === kind) ??
    AGENDA_LEGEND_ITEMS[0]
  )
}

export function getAgendaToneLabel(tone: AgendaTone): string {
  return TONE_INTRO[tone]
}

/** Resumo rápido para leitura em scan — exibido acima da legenda detalhada. */
export const AGENDA_COLOR_SCAN =
  "Verde entra · Laranja sai · Vermelho urgente · Azul lembrete · Roxo meta"
