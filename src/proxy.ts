import { NextResponse, type NextRequest } from "next/server"
import { updateSession } from "@/lib/supabase/middleware"

const PUBLIC_ROUTES = [
  "/",
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/auth/callback",
  "/auth/confirm",
]

// Rotas que usuários autenticados sempre podem acessar,
// mesmo com trial expirado ou sem subscription ativa.
const ALWAYS_ALLOWED_FOR_AUTHED = [
  "/billing",
  "/configuracoes",
  "/logout",
  "/api/webhooks",
  "/api/auth",
]

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  const { response, user } = await updateSession(request)

  const isPublic = PUBLIC_ROUTES.some(
    (r) => pathname === r || pathname.startsWith(`${r}/`)
  )

  // 1) Não autenticado tentando acessar rota privada → /login
  if (!user && !isPublic) {
    const url = request.nextUrl.clone()
    url.pathname = "/login"
    url.searchParams.set("next", pathname)
    return NextResponse.redirect(url)
  }

  // 2) Autenticado em rota pública de auth → /dashboard
  // Exceção: reset-password permite acesso autenticado (link de email cria sessão temporária)
  if (
    user &&
    (pathname === "/login" ||
      pathname === "/register" ||
      pathname === "/forgot-password")
  ) {
    const url = request.nextUrl.clone()
    url.pathname = "/dashboard"
    return NextResponse.redirect(url)
  }

  // 3) Autenticado: verifica se tem acesso ativo (trial ou subscription)
  if (user && !isPublic) {
    const isAlwaysAllowed = ALWAYS_ALLOWED_FOR_AUTHED.some(
      (r) => pathname === r || pathname.startsWith(`${r}/`)
    )

    if (!isAlwaysAllowed) {
      const status = await fetchBillingStatus(request, user.id)

      if (status) {
        const hasAccess = hasActiveAccessSync(status)
        if (!hasAccess) {
          const url = request.nextUrl.clone()
          url.pathname = "/billing"
          url.searchParams.set("reason", getBlockReason(status))
          return NextResponse.redirect(url)
        }
      }
    }
  }

  return response
}

// ---------------------------------------------------------------------------
// Tipos internos
// ---------------------------------------------------------------------------

type BillingStatus = {
  tier: "trial" | "pro" | "enterprise"
  trial_ends_at: string | null
  subscription: {
    status: string
    current_period_end: string | null
  } | null
}

// ---------------------------------------------------------------------------
// Busca status de billing no Supabase (apenas tenant + subscriptions)
// ---------------------------------------------------------------------------

async function fetchBillingStatus(
  request: NextRequest,
  userId: string
): Promise<BillingStatus | null> {
  const { createServerClient } = await import("@supabase/ssr")
  const { env } = await import("@/lib/env")

  const supabase = createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: () => {
          /* read-only neste contexto */
        },
      },
    }
  )

  const [tenantRes, subRes] = await Promise.all([
    supabase
      .from("tenants")
      .select("tier, trial_ends_at")
      .limit(1)
      .maybeSingle(),
    supabase
      .from("subscriptions")
      .select("status, current_period_end")
      .limit(1)
      .maybeSingle(),
  ])

  if (tenantRes.error || !tenantRes.data) {
    console.error(
      "[proxy] fetchBillingStatus tenant error:",
      tenantRes.error?.message,
      "user:",
      userId
    )
    return null
  }

  return {
    tier: tenantRes.data.tier as BillingStatus["tier"],
    trial_ends_at: tenantRes.data.trial_ends_at as string | null,
    subscription: subRes.data
      ? {
          status: subRes.data.status as string,
          current_period_end: subRes.data.current_period_end as string | null,
        }
      : null,
  }
}

// ---------------------------------------------------------------------------
// Lógica de acesso (sem Node.js APIs — compatível com edge)
// ---------------------------------------------------------------------------

function hasActiveAccessSync(status: BillingStatus): boolean {
  const { subscription, trial_ends_at } = status
  const trialActive = !!trial_ends_at && new Date(trial_ends_at) > new Date()

  if (subscription) {
    const s = subscription.status

    if (s === "active" || s === "pending") return true

    if (s === "past_due") {
      if (subscription.current_period_end) {
        const end = new Date(subscription.current_period_end)
        const graceEnd = new Date(end.getTime() + 7 * 24 * 60 * 60 * 1000)
        if (new Date() <= graceEnd) return true
      }
      // Sem period_end ou fora da carência → cai no trial
      return trialActive
    }

    if (s === "canceled") {
      // Cancelada mas período pago ainda vigente → mantém acesso
      if (
        subscription.current_period_end &&
        new Date(subscription.current_period_end) > new Date()
      ) {
        return true
      }
      // Nunca pagou ou período expirado → trial é o fallback
      return trialActive
    }

    // Qualquer outro status desconhecido → trial como fallback
    return trialActive
  }

  // Sem subscription → depende exclusivamente do trial
  return trialActive
}

function getBlockReason(status: BillingStatus): string {
  if (status.subscription) {
    if (status.subscription.status === "past_due") return "past_due"
    if (status.subscription.status === "canceled") return "canceled"
    return "canceled"
  }
  return "trial_expired"
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
