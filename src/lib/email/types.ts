/**
 * Tipos da Fase 11 — Insights semanais por email.
 *
 * O engine (11C) consome dados financeiros e produz `WeeklyInsightPayload`,
 * que é passado pro template React Email (11B) e persistido em `email_logs`
 * pra debug/auditoria.
 */

// ---------------------------------------------------------------------------
// Configuração — kinds e status
// ---------------------------------------------------------------------------

export type EmailKind =
  | "weekly_insights"
  | "collection_reminder"
  | "overdue_alert"
  | "trial_ending"
  | "transactional"

export type EmailStatus = "queued" | "sent" | "failed" | "skipped"

// ---------------------------------------------------------------------------
// Preferências — mirror da tabela email_preferences
// ---------------------------------------------------------------------------

export type EmailPreferences = {
  weekly_insights_enabled: boolean
  collection_reminders_enabled: boolean
  overdue_alerts_enabled: boolean
  weekly_insights_last_sent_at: string | null
  collection_reminders_last_sent_at: string | null
}

// ---------------------------------------------------------------------------
// Payload do insight semanal
// ---------------------------------------------------------------------------

/**
 * Payload completo do insight semanal — alimentado ao template React Email.
 * Tudo já formatado em pt-BR (R$ X.XXX,XX, dd/mm/yyyy) — o template não
 * formata, só renderiza.
 */
export type WeeklyInsightPayload = {
  /** Nome amigável pra cumprimentar (primeiro nome ou email). */
  greetingName: string
  /** Nome da empresa/tenant. */
  tenantName: string

  /** Cabeçalho do período: "9/jun a 15/jun" */
  weekRangeLabel: string
  /** Datas ISO da semana (segunda a domingo) — útil pra deep-links. */
  weekStartIso: string
  weekEndIso: string

  /**
   * 3 cards principais — sempre 3 itens. Se algum não fizer sentido na
   * semana, o engine substitui por um "estado vazio" amigável.
   */
  cards: WeeklyInsightCard[]

  /**
   * Alerta acionável priorizado — 1 ação concreta pro usuário começar a
   * semana. null se não houver nada urgente.
   */
  primaryAlert: WeeklyInsightAlert | null

  /** URL absoluta pro app (com utm). */
  appUrl: string
  /** URL absoluta pra opt-out direto do email. */
  unsubscribeUrl: string
}

// ---------------------------------------------------------------------------
// Payload do lembrete de cobrança (Fase 10)
// ---------------------------------------------------------------------------

export type CollectionReminderItem = {
  id: string
  description: string
  customerName: string | null
  amount: string
  dueDateLabel: string
  statusLabel: string
  href: string
}

export type CollectionReminderPayload = {
  greetingName: string
  tenantName: string
  overdueItems: CollectionReminderItem[]
  upcomingItems: CollectionReminderItem[]
  totalOverdue: string
  totalUpcoming: string
  appUrl: string
  unsubscribeUrl: string
}

export type TrialEndingPayload = {
  greetingName: string
  tenantName: string
  daysLeft: number
  trialEndsLabel: string
  billingUrl: string
  unsubscribeUrl: string
}

export type OverdueAlertEmailPayload = {
  greetingName: string
  tenantName: string
  items: Array<{
    id: string
    description: string
    amount: string
    dueDateLabel: string
    typeLabel: string
    href: string
  }>
  totalOverdue: string
  appUrl: string
  unsubscribeUrl: string
}

/** Convite ou aviso de acesso de contador (Fase contador). */
export type AccountantInvitePayload = {
  accountantName: string
  accountantEmail: string
  tenantName: string
  ownerName: string
  isNewUser: boolean
  /** Link de aceite (novo usuário) — Supabase magic invite. */
  inviteUrl: string | null
  contadorUrl: string
  loginUrl: string
  appUrl: string
}

export type WeeklyInsightCard = {
  /** Curto e direto: "Receita da semana", "Gastos com assinaturas", etc. */
  label: string
  /** Valor principal já formatado: "R$ 2.450,00" */
  value: string
  /** Comparação opcional: "+12% vs semana passada" */
  trend?: {
    direction: "up" | "down" | "flat"
    label: string
    /** Se true, "up" é bom (verde). Se false, "up" é ruim (vermelho). */
    upIsGood: boolean
  }
  /** Texto secundário curto. */
  description?: string
}

export type WeeklyInsightAlert = {
  severity: "info" | "warning" | "critical"
  title: string
  message: string
  cta: { label: string; href: string }
}

// ---------------------------------------------------------------------------
// Resultado de uma tentativa de envio (usado no log)
// ---------------------------------------------------------------------------

export type SendResult =
  | { status: "sent"; providerMessageId: string }
  | { status: "skipped"; reason: string }
  | { status: "failed"; error: string }
