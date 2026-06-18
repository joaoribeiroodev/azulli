import "server-only"

import { createHmac, timingSafeEqual } from "node:crypto"

import { env } from "@/lib/env"
import type { EmailKind } from "./types"

/** Kinds que o usuário pode desativar via link do email. */
export type UnsubscribeKind =
  | "weekly_insights"
  | "collection_reminder"
  | "overdue_alert"

const KIND_TO_PREF: Record<
  UnsubscribeKind,
  "weekly_insights_enabled" | "collection_reminders_enabled" | "overdue_alerts_enabled"
> = {
  weekly_insights: "weekly_insights_enabled",
  collection_reminder: "collection_reminders_enabled",
  overdue_alert: "overdue_alerts_enabled",
}

const TOKEN_TTL_MS = 365 * 24 * 60 * 60 * 1000

export function unsubscribePrefField(kind: UnsubscribeKind) {
  return KIND_TO_PREF[kind]
}

export function buildUnsubscribeUrl(
  baseUrl: string,
  params: { userId: string; tenantId: string; kind: UnsubscribeKind }
): string {
  const token = createUnsubscribeToken(params)
  const root = baseUrl.replace(/\/$/, "")
  return `${root}/api/email/unsubscribe?token=${encodeURIComponent(token)}`
}

export function createUnsubscribeToken(params: {
  userId: string
  tenantId: string
  kind: UnsubscribeKind
}): string {
  const secret = env.CRON_SECRET
  if (!secret) {
    throw new Error("CRON_SECRET não configurado — necessário para tokens de unsubscribe.")
  }

  const payload = JSON.stringify({
    userId: params.userId,
    tenantId: params.tenantId,
    kind: params.kind,
    exp: Date.now() + TOKEN_TTL_MS,
  })
  const payloadB64 = Buffer.from(payload, "utf8").toString("base64url")
  const sig = createHmac("sha256", secret).update(payloadB64).digest("base64url")
  return `${payloadB64}.${sig}`
}

export function verifyUnsubscribeToken(
  token: string
): { userId: string; tenantId: string; kind: UnsubscribeKind } | null {
  const secret = env.CRON_SECRET
  if (!secret) return null

  const [payloadB64, sig] = token.split(".")
  if (!payloadB64 || !sig) return null

  const expected = createHmac("sha256", secret).update(payloadB64).digest("base64url")
  try {
    const a = Buffer.from(sig, "base64url")
    const b = Buffer.from(expected, "base64url")
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null
  } catch {
    return null
  }

  try {
    const parsed = JSON.parse(
      Buffer.from(payloadB64, "base64url").toString("utf8")
    ) as {
      userId?: string
      tenantId?: string
      kind?: EmailKind
      exp?: number
    }

    if (!parsed.userId || !parsed.tenantId || !parsed.kind) return null
    if (!isUnsubscribeKind(parsed.kind)) return null
    if (!parsed.exp || parsed.exp < Date.now()) return null

    return {
      userId: parsed.userId,
      tenantId: parsed.tenantId,
      kind: parsed.kind,
    }
  } catch {
    return null
  }
}

function isUnsubscribeKind(kind: EmailKind): kind is UnsubscribeKind {
  return (
    kind === "weekly_insights" ||
    kind === "collection_reminder" ||
    kind === "overdue_alert"
  )
}
