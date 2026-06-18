import type { SupabaseClient } from "@supabase/supabase-js"
import type { EmailKind, EmailStatus } from "./types"

export async function logCronEmail(
  supabase: SupabaseClient,
  input: {
    tenantId: string
    userId: string
    kind: EmailKind
    recipient: string
    subject: string
    status: EmailStatus
    payload?: unknown
    providerMessageId?: string
    errorMessage?: string
  }
) {
  await supabase.from("email_logs").insert({
    tenant_id: input.tenantId,
    user_id: input.userId,
    kind: input.kind,
    status: input.status,
    recipient_email: input.recipient,
    subject: input.subject,
    payload: input.payload ?? null,
    provider_message_id: input.providerMessageId ?? null,
    error_message: input.errorMessage ?? null,
    sent_at: input.status === "sent" ? new Date().toISOString() : null,
  })
}

export function jsonCronError(status: number, message: string) {
  return Response.json({ ok: false, error: message }, { status })
}

export async function wasEmailSentRecently(
  supabase: SupabaseClient,
  userId: string,
  kind: EmailKind,
  withinHours: number
): Promise<boolean> {
  const since = new Date(Date.now() - withinHours * 60 * 60 * 1000).toISOString()
  const { data } = await supabase
    .from("email_logs")
    .select("id")
    .eq("user_id", userId)
    .eq("kind", kind)
    .eq("status", "sent")
    .gte("sent_at", since)
    .limit(1)
  return (data?.length ?? 0) > 0
}
