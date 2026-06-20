import { NextResponse, type NextRequest } from "next/server"
import { isAppProductHost, isAdminHost, isFinderHost } from "@/lib/app/domain-hosts"
import { updateSession } from "@/lib/supabase/middleware"
import { isMissingDbColumn } from "@/lib/onboarding/db"

const PUBLIC_ROUTES = [
  "/",
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/auth/callback",
  "/auth/confirm",
  "/termos-de-uso",
  "/politica-de-privacidade",
]

/**
 * APIs com autenticação própria (CRON_SECRET, webhook token, etc.).
 * Não exigem sessão Supabase — o proxy não deve redirecionar ao /login.
 */
const PUBLIC_API_PREFIXES = [
  "/api/cron",
  "/api/webhooks",
  "/api/email/unsubscribe",
  "/api/internal",
  "/api/finder",
]

const ADMIN_ROUTE_PREFIX = "/admin"

// Rotas que usuários autenticados sempre podem acessar,
// mesmo com trial expirado ou sem subscription ativa.
const ALWAYS_ALLOWED_FOR_AUTHED = [
  "/billing",
  "/configuracoes",
  "/contador",
  "/onboarding",
  "/logout",
  "/api/webhooks",
  "/api/auth",
  "/api/export",
]

const FINDER_STATIC_PREFIX = "/finder"

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const hostname = request.nextUrl.hostname
  const isAdmin = isAdminHost(hostname)
  const isFinder = isFinderHost(hostname)

  const { response, user } = await updateSession(request)

  // Subdomínio Finder: UI estática + API própria (JWT), sem gate Supabase
  if (isFinder) {
    if (pathname === "/") {
      const url = request.nextUrl.clone()
      url.pathname = `${FINDER_STATIC_PREFIX}/`
      return NextResponse.redirect(url)
    }

    const allowed =
      pathname.startsWith(FINDER_STATIC_PREFIX) ||
      pathname.startsWith("/api/finder") ||
      pathname.startsWith("/_next") ||
      pathname === "/favicon.ico"

    if (!allowed) {
      const url = request.nextUrl.clone()
      url.pathname = `${FINDER_STATIC_PREFIX}/`
      return NextResponse.redirect(url)
    }

    return response
  }

  // Subdomínio admin: raiz → painel admin
  if (isAdmin && pathname === "/") {
    const url = request.nextUrl.clone()
    url.pathname = ADMIN_ROUTE_PREFIX
    return NextResponse.redirect(url)
  }

  // Subdomínio admin: bloqueia rotas do app principal (exceto auth e APIs)
  if (
    isAdmin &&
    !pathname.startsWith(ADMIN_ROUTE_PREFIX) &&
    !pathname.startsWith("/api/") &&
    !pathname.startsWith("/login") &&
    !pathname.startsWith("/auth/") &&
    pathname !== "/register"
  ) {
    const url = request.nextUrl.clone()
    url.pathname = ADMIN_ROUTE_PREFIX
    return NextResponse.redirect(url)
  }

  // Domínio do app (use.azulli.app.br): `/` não é landing — login ou painel
  if (pathname === "/" && isAppProductHost(request.nextUrl.hostname)) {
    const url = request.nextUrl.clone()
    if (user) {
      const onboardingDone = await fetchOnboardingComplete(request)
      url.pathname = onboardingDone ? "/dashboard" : "/onboarding"
    } else {
      url.pathname = "/login"
    }
    return NextResponse.redirect(url)
  }

  const isPublicApi = PUBLIC_API_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  )

  const isPublic =
    isPublicApi ||
    PUBLIC_ROUTES.some(
      (r) => pathname === r || pathname.startsWith(`${r}/`)
    )

  // 1) Não autenticado tentando acessar rota privada → /login
  if (!user && !isPublic) {
    const url = request.nextUrl.clone()
    url.pathname = "/login"
    url.searchParams.set("next", pathname)
    return NextResponse.redirect(url)
  }

  // 2) Autenticado em rota pública de auth → home do app ou admin
  if (
    user &&
    (pathname === "/login" ||
      pathname === "/register" ||
      pathname === "/forgot-password")
  ) {
    const url = request.nextUrl.clone()
    if (isAdmin) {
      url.pathname = ADMIN_ROUTE_PREFIX
    } else {
      const onboardingDone = await fetchOnboardingComplete(request)
      url.pathname = onboardingDone ? "/dashboard" : "/onboarding"
    }
    return NextResponse.redirect(url)
  }

  // 2b) Onboarding: completo → dashboard; incompleto → bloqueia app
  if (user && !isPublic && !isAdmin && !pathname.startsWith(ADMIN_ROUTE_PREFIX)) {
    const onboardingDone = await fetchOnboardingComplete(request)
    const isOnboardingRoute =
      pathname === "/onboarding" || pathname.startsWith("/onboarding/")

    if (isOnboardingRoute && onboardingDone) {
      const url = request.nextUrl.clone()
      url.pathname = "/dashboard"
      return NextResponse.redirect(url)
    }

    const isAlwaysAllowed = ALWAYS_ALLOWED_FOR_AUTHED.some(
      (r) => pathname === r || pathname.startsWith(`${r}/`)
    )

    if (!onboardingDone && !isOnboardingRoute && !isAlwaysAllowed) {
      const url = request.nextUrl.clone()
      url.pathname = "/onboarding"
      return NextResponse.redirect(url)
    }

    if (!isAlwaysAllowed) {
      const [role, billingStatus] = await Promise.all([
        fetchUserRole(request, user.id),
        fetchBillingStatus(request, user.id),
      ])

      if (role === "accountant") {
        const accountantAllowed =
          pathname === "/contador" ||
          pathname.startsWith("/contador/") ||
          pathname === "/configuracoes" ||
          pathname.startsWith("/configuracoes/") ||
          pathname === "/manual" ||
          pathname.startsWith("/manual/")
        if (!accountantAllowed) {
          const url = request.nextUrl.clone()
          url.pathname = "/contador"
          return NextResponse.redirect(url)
        }
      }

      if (billingStatus) {
        const hasAccess = hasActiveAccessSync(billingStatus)
        if (!hasAccess) {
          const url = request.nextUrl.clone()
          url.pathname = "/billing"
          url.searchParams.set("reason", getBlockReason(billingStatus))
          return NextResponse.redirect(url)
        }
      }
    }
  }

  return response
}

async function fetchUserRole(
  request: NextRequest,
  userId: string
): Promise<string | null> {
  const { createServerClient } = await import("@supabase/ssr")
  const { env } = await import("@/lib/env")

  const supabase = createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: () => {},
      },
    }
  )

  const { data } = await supabase
    .from("tenant_users")
    .select("role")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle()

  return (data?.role as string) ?? null
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

async function fetchOnboardingComplete(request: NextRequest): Promise<boolean> {
  const { createServerClient } = await import("@supabase/ssr")
  const { env } = await import("@/lib/env")

  const supabase = createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: () => {
          /* read-only */
        },
      },
    }
  )

  const { data, error } = await supabase
    .from("tenants")
    .select("onboarding_completed_at")
    .limit(1)
    .maybeSingle()

  if (error) {
    if (isMissingDbColumn(error.message, "onboarding_completed_at")) {
      return true
    }
    console.error("[proxy] fetchOnboardingComplete:", error.message)
    return true
  }

  return Boolean(data?.onboarding_completed_at)
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
    "/((?!_next/static|_next/image|favicon.ico|sw.js|manifest.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
