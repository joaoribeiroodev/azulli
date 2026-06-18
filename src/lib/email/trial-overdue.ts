import "server-only"

import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { env } from "@/lib/env"
import { buildUnsubscribeUrl } from "@/lib/email/unsubscribe-token"
import { formatBRL } from "@/lib/utils/currency"
import { formatDateBR } from "@/lib/utils/date"
import type { OverdueAlertEmailPayload, TrialEndingPayload } from "./types"

export async function buildTrialEndingPayload(params: {
  tenantId: string
  userId: string
  userEmail: string
  userName: string
  tenantName: string
  trialEndsAt: string
}): Promise<TrialEndingPayload> {
  const ends = new Date(params.trialEndsAt)
  const daysLeft = Math.max(
    0,
    Math.ceil((ends.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
  )
  const baseUrl = env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "")
  const greetingName =
    params.userName.split(/\s+/)[0] || params.userEmail.split("@")[0]

  return {
    greetingName,
    tenantName: params.tenantName,
    daysLeft,
    trialEndsLabel: formatDateBR(params.trialEndsAt.slice(0, 10)),
    billingUrl: `${baseUrl}/billing`,
    unsubscribeUrl: `${baseUrl}/configuracoes?tab=notificacoes`,
  }
}

export async function buildOverdueAlertPayload(params: {
  tenantId: string
  userId: string
  userEmail: string
  userName: string
  tenantName: string
}): Promise<OverdueAlertEmailPayload | null> {
  const supabase = createServiceRoleClient()
  const today = new Date().toISOString().slice(0, 10)
  const baseUrl = env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "")

  const { data: rows } = await supabase
    .from("transactions_with_status")
    .select("id, type, amount, description, due_date, status")
    .eq("status", "overdue")
    .lt("due_date", today)
    .order("due_date", { ascending: true })
    .limit(20)

  if (!rows?.length) return null

  const items = rows.map((r) => ({
    id: r.id as string,
    description: (r.description as string) || "Sem descrição",
    amount: formatBRL(Number(r.amount)),
    dueDateLabel: formatDateBR(r.due_date as string),
    typeLabel: r.type === "income" ? "A receber" : "A pagar",
    href: `${baseUrl}/lancamentos?status=overdue`,
  }))

  const total = rows.reduce((s, r) => s + Number(r.amount), 0)

  return {
    greetingName:
      params.userName.split(/\s+/)[0] || params.userEmail.split("@")[0],
    tenantName: params.tenantName,
    items,
    totalOverdue: formatBRL(total),
    appUrl: `${baseUrl}/lancamentos?status=overdue`,
    unsubscribeUrl: buildUnsubscribeUrl(baseUrl, {
      userId: params.userId,
      tenantId: params.tenantId,
      kind: "overdue_alert",
    }),
  }
}
