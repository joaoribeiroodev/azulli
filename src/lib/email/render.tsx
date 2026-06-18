import "server-only"

import { render } from "@react-email/render"

import { WeeklyInsightsEmail } from "./templates/weekly-insights"
import { CollectionReminderEmail } from "./templates/collection-reminder"
import { TrialEndingEmail } from "./templates/trial-ending"
import { OverdueAlertEmail } from "./templates/overdue-alert"
import { AccountantInviteEmail } from "./templates/accountant-invite"
import type {
  WeeklyInsightPayload,
  CollectionReminderPayload,
  TrialEndingPayload,
  OverdueAlertEmailPayload,
  AccountantInvitePayload,
} from "./types"

export type RenderedEmail = {
  subject: string
  html: string
  text: string
}

/**
 * Renderiza o email semanal — produz HTML + plain text + subject.
 * Subject é gerado dinamicamente pra otimizar abertura.
 */
export async function renderWeeklyInsightEmail(
  payload: WeeklyInsightPayload
): Promise<RenderedEmail> {
  const html = await render(<WeeklyInsightsEmail payload={payload} />, {
    pretty: false,
  })
  const text = await render(<WeeklyInsightsEmail payload={payload} />, {
    plainText: true,
  })

  return {
    subject: buildSubject(payload),
    html,
    text,
  }
}

function buildSubject(payload: WeeklyInsightPayload): string {
  if (payload.primaryAlert?.severity === "critical") {
    return `⚠️ ${payload.primaryAlert.title}`
  }

  const main = payload.cards[0]
  if (main) {
    return `${main.label}: ${main.value} · Azulli ${payload.weekRangeLabel}`
  }

  return `Seu fechamento da semana — ${payload.weekRangeLabel}`
}

export async function renderCollectionReminderEmail(
  payload: CollectionReminderPayload
): Promise<RenderedEmail> {
  const html = await render(<CollectionReminderEmail payload={payload} />, {
    pretty: false,
  })
  const text = await render(<CollectionReminderEmail payload={payload} />, {
    plainText: true,
  })

  return {
    subject: buildCollectionSubject(payload),
    html,
    text,
  }
}

function buildCollectionSubject(payload: CollectionReminderPayload): string {
  const overdue = payload.overdueItems.length
  const upcoming = payload.upcomingItems.length

  if (overdue > 0 && upcoming > 0) {
    return `⚠️ ${overdue} vencido(s) e ${upcoming} vencendo em 3 dias · Azulli`
  }
  if (overdue > 0) {
    return overdue === 1
      ? `⚠️ 1 cobrança vencida — ${payload.totalOverdue}`
      : `⚠️ ${overdue} cobranças vencidas — ${payload.totalOverdue}`
  }
  return upcoming === 1
    ? `📅 1 recebimento vence em 3 dias — ${payload.totalUpcoming}`
    : `📅 ${upcoming} recebimentos vencem em 3 dias — ${payload.totalUpcoming}`
}

export async function renderTrialEndingEmail(
  payload: TrialEndingPayload
): Promise<RenderedEmail> {
  const html = await render(<TrialEndingEmail payload={payload} />, {
    pretty: false,
  })
  const text = await render(<TrialEndingEmail payload={payload} />, {
    plainText: true,
  })
  const subject =
    payload.daysLeft <= 1
      ? "⏰ Seu trial do Azulli acaba hoje"
      : `⏰ Faltam ${payload.daysLeft} dias do trial — Azulli`
  return { subject, html, text }
}

export async function renderOverdueAlertEmail(
  payload: OverdueAlertEmailPayload
): Promise<RenderedEmail> {
  const html = await render(<OverdueAlertEmail payload={payload} />, {
    pretty: false,
  })
  const text = await render(<OverdueAlertEmail payload={payload} />, {
    plainText: true,
  })
  const n = payload.items.length
  return {
    subject:
      n === 1
        ? `⚠️ 1 lançamento vencido — ${payload.totalOverdue}`
        : `⚠️ ${n} lançamentos vencidos — ${payload.totalOverdue}`,
    html,
    text,
  }
}

export async function renderAccountantInviteEmail(
  payload: AccountantInvitePayload
): Promise<RenderedEmail> {
  const html = await render(<AccountantInviteEmail payload={payload} />, {
    pretty: false,
  })
  const text = await render(<AccountantInviteEmail payload={payload} />, {
    plainText: true,
  })

  const subject = payload.isNewUser
    ? `${payload.ownerName} convidou você · ${payload.tenantName}`
    : `Acesso de contador em ${payload.tenantName} — Azulli`

  return { subject, html, text }
}
