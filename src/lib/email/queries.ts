import "server-only"

import { createClient } from "@/lib/supabase/server"
import type { EmailKind, EmailPreferences, EmailStatus } from "./types"

export type EmailLogRow = {
  id: string
  kind: EmailKind
  status: EmailStatus
  subject: string
  recipient_email: string
  sent_at: string | null
  created_at: string
  error_message: string | null
}

/**
 * Preferências do usuário corrente. O trigger garante que sempre existe
 * uma linha — mas usamos defaults defensivos caso a row tenha sumido.
 */
export async function getMyEmailPreferences(): Promise<EmailPreferences> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("email_preferences")
    .select(
      "weekly_insights_enabled, collection_reminders_enabled, overdue_alerts_enabled, weekly_insights_last_sent_at"
    )
    .limit(1)
    .maybeSingle()

  if (error) {
    console.error("[email] getMyEmailPreferences failed:", error)
  }

  return {
    weekly_insights_enabled: data?.weekly_insights_enabled ?? true,
    collection_reminders_enabled:
      data?.collection_reminders_enabled ?? true,
    overdue_alerts_enabled: data?.overdue_alerts_enabled ?? true,
    weekly_insights_last_sent_at:
      (data?.weekly_insights_last_sent_at as string | null) ?? null,
    collection_reminders_last_sent_at: null,
  }
}

/**
 * Últimos emails enviados/falhados pra mim. RLS já filtra por user_id.
 */
export async function listMyEmailLogs(limit = 10): Promise<EmailLogRow[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("email_logs")
    .select(
      "id, kind, status, subject, recipient_email, sent_at, created_at, error_message"
    )
    .order("created_at", { ascending: false })
    .limit(limit)

  if (error || !data) {
    if (error) console.error("[email] listMyEmailLogs failed:", error)
    return []
  }

  return data.map((row) => ({
    id: row.id as string,
    kind: row.kind as EmailKind,
    status: row.status as EmailStatus,
    subject: row.subject as string,
    recipient_email: row.recipient_email as string,
    sent_at: (row.sent_at as string | null) ?? null,
    created_at: row.created_at as string,
    error_message: (row.error_message as string | null) ?? null,
  }))
}
