import { NextResponse, type NextRequest } from "next/server"
import { updateSession } from "@/lib/supabase/middleware"

// Rotas públicas — não exigem login
const PUBLIC_ROUTES = ["/", "/login", "/register", "/auth/callback"]

// Rotas que devem permanecer acessíveis mesmo com trial expirado /
// inadimplência (caso contrário o usuário ficaria em loop sem conseguir pagar).
const ALWAYS_ALLOWED_FOR_AUTHED = ["/billing", "/logout"]

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // 1) Atualiza JWT e obtém o user atual
  const { response, user } = await updateSession(request)

  const isPublic = PUBLIC_ROUTES.some(
    (r) => pathname === r || pathname.startsWith(`${r}/`)
  )

  // 2) Não autenticado tentando acessar rota privada → /login
  if (!user && !isPublic) {
    const url = request.nextUrl.clone()
    url.pathname = "/login"
    url.searchParams.set("next", pathname)
    return NextResponse.redirect(url)
  }

  // 3) Autenticado em rota pública de auth → /dashboard
  if (user && (pathname === "/login" || pathname === "/register")) {
    const url = request.nextUrl.clone()
    url.pathname = "/dashboard"
    return NextResponse.redirect(url)
  }

  // 4) Autenticado: checa status do tenant (trial + subscription)
  if (user && !isPublic) {
    const isAlwaysAllowed = ALWAYS_ALLOWED_FOR_AUTHED.some(
      (r) => pathname === r || pathname.startsWith(`${r}/`)
    )

    if (!isAlwaysAllowed) {
      const tenantStatus = await fetchTenantStatus(request, user.id)

      if (tenantStatus) {
        const blocked = isAccessBlocked(tenantStatus)
        if (blocked) {
          const url = request.nextUrl.clone()
          url.pathname = "/billing"
          url.searchParams.set("reason", blocked)
          return NextResponse.redirect(url)
        }
      }
    }
  }

  return response
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type TenantStatus = {
  tier: "trial" | "pro" | "enterprise"
  subscription_status: "active" | "past_due" | "canceled"
  trial_ends_at: string
}

async function fetchTenantStatus(
  request: NextRequest,
  userId: string
): Promise<TenantStatus | null> {
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

  const { data, error } = await supabase
    .from("tenants")
    .select("tier, subscription_status, trial_ends_at")
    .limit(1)
    .maybeSingle()

  if (error || !data) {
    console.error("[proxy] fetchTenantStatus:", error?.message, "user:", userId)
    return null
  }

  return data as TenantStatus
}

function isAccessBlocked(
  status: TenantStatus
): "trial_expired" | "past_due" | "canceled" | null {
  if (status.subscription_status === "canceled") return "canceled"
  if (status.subscription_status === "past_due") return "past_due"

  if (status.tier === "trial") {
    const trialEnd = new Date(status.trial_ends_at).getTime()
    if (trialEnd < Date.now()) return "trial_expired"
  }

  return null
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}