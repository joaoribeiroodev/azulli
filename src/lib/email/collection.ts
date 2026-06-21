import "server-only"

import type { SupabaseClient } from "@supabase/supabase-js"

import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { env } from "@/lib/env"
import { formatBRL } from "@/lib/utils/currency"
import { formatDateBR, addDaysYMD, formatDateInBR, todayLocalBR } from "@/lib/utils/date"
import { buildUnsubscribeUrl } from "./unsubscribe-token"
import type { CollectionReminderItem, CollectionReminderPayload } from "./types"

const REMIND_DAYS_BEFORE = 3

export type CollectionReminderInput = {
  tenantId: string
  userId: string
  userName: string
  tenantName: string
  appBaseUrl?: string
  now?: Date
}

export async function buildCollectionReminderPayload(
  input: CollectionReminderInput
): Promise<CollectionReminderPayload | null> {
  const supabase = createServiceRoleClient()
  const baseUrl = input.appBaseUrl ?? env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "")
  const now = input.now ?? new Date()
  const today = input.now ? formatDateInBR(now) : todayLocalBR()
  const remindDate = addDaysYMD(today, REMIND_DAYS_BEFORE)

  const rows = await loadIncomePending(supabase, input.tenantId, today, remindDate)
  if (rows.length === 0) return null

  const overdueRaw = rows.filter((r) => r.due_date < today)
  const upcomingRaw = rows.filter((r) => r.due_date === remindDate)

  if (overdueRaw.length === 0 && upcomingRaw.length === 0) return null

  const utm =
    "utm_source=email&utm_medium=collection_reminder&utm_campaign=cobranca"

  const overdueItems = overdueRaw.map((r) =>
    toItem(r, today, baseUrl, utm, "overdue")
  )
  const upcomingItems = upcomingRaw.map((r) =>
    toItem(r, today, baseUrl, utm, "upcoming")
  )

  const totalOverdue = overdueRaw.reduce((s, r) => s + r.amount, 0)
  const totalUpcoming = upcomingRaw.reduce((s, r) => s + r.amount, 0)

  return {
    greetingName: input.userName,
    tenantName: input.tenantName,
    overdueItems,
    upcomingItems,
    totalOverdue: formatBRL(totalOverdue),
    totalUpcoming: formatBRL(totalUpcoming),
    appUrl: `${baseUrl}/lancamentos?status=overdue&${utm}`,
    unsubscribeUrl: buildUnsubscribeUrl(baseUrl, {
      userId: input.userId,
      tenantId: input.tenantId,
      kind: "collection_reminder",
    }),
  }
}

type RawRow = {
  id: string
  amount: number
  due_date: string
  description: string | null
  customer_name: string | null
}

async function loadIncomePending(
  supabase: SupabaseClient,
  tenantId: string,
  today: string,
  remindDate: string
): Promise<RawRow[]> {
  const { data, error } = await supabase
    .from("transactions")
    .select(
      "id, amount, due_date, description, customers(name)"
    )
    .eq("tenant_id", tenantId)
    .eq("type", "income")
    .eq("status", "pending")
    .or(`due_date.lt.${today},due_date.eq.${remindDate}`)
    .order("due_date", { ascending: true })

  if (error || !data) {
    if (error) console.error("[collection] load failed:", error)
    return []
  }

  return data.map((row) => ({
    id: row.id as string,
    amount: Number(row.amount),
    due_date: row.due_date as string,
    description: (row.description as string | null) ?? null,
    customer_name:
      ((row.customers as { name?: string } | null)?.name as string | null) ??
      null,
  }))
}

function toItem(
  row: RawRow,
  today: string,
  baseUrl: string,
  utm: string,
  kind: "overdue" | "upcoming"
): CollectionReminderItem {
  const label =
    kind === "upcoming"
      ? `Vence em ${REMIND_DAYS_BEFORE} dias`
      : daysOverdueLabel(row.due_date, today)

  const desc =
    row.description?.trim() ||
    row.customer_name ||
    "Recebimento sem descrição"

  return {
    id: row.id,
    description: desc,
    customerName: row.customer_name,
    amount: formatBRL(row.amount),
    dueDateLabel: formatDateBR(row.due_date),
    statusLabel: label,
    href: `${baseUrl}/lancamentos?${utm}`,
  }
}

function daysOverdueLabel(dueIso: string, today: string): string {
  const [y1, m1, d1] = dueIso.slice(0, 10).split("-").map(Number)
  const [y2, m2, d2] = today.slice(0, 10).split("-").map(Number)
  const due = new Date(y1, m1 - 1, d1).getTime()
  const t = new Date(y2, m2 - 1, d2).getTime()
  const days = Math.floor((t - due) / (1000 * 60 * 60 * 24))
  if (days <= 0) return "Vencido hoje"
  if (days === 1) return "Vencido há 1 dia"
  return `Vencido há ${days} dias`
}
