import { createRequire } from "node:module"
import { NextResponse } from "next/server"

import { convertFinderLead } from "@/lib/finder/convert-lead"
import {
  hasFinderPermission,
  type FinderPermission,
} from "@/lib/finder/roles"

const require = createRequire(import.meta.url)
const SERVER = "./server"

type RouteHandler = (
  req: MockReq,
  res: MockRes,
  next: (err?: unknown) => void
) => void | Promise<void>

type MockReq = {
  method: string
  url: string
  path: string
  params: Record<string, string>
  query: Record<string, string | string[] | undefined>
  body: unknown
  headers: Headers
  auth?: {
    sub: string
    role: string
    nome: string
    email: string
  }
}

type MockRes = {
  statusCode: number
  body: unknown
  status(code: number): MockRes
  json(data: unknown): void
}

let runtimeInitialized = false

function ensureFinderRuntime() {
  if (runtimeInitialized) return
  runtimeInitialized = true
  ;(globalThis as typeof globalThis & {
    __AZULLI_FINDER_CONVERT__?: typeof convertFinderLead
  }).__AZULLI_FINDER_CONVERT__ = convertFinderLead
}

function load<T>(modulePath: string): T {
  return require(`${SERVER}/${modulePath}`) as T
}

function createMockRes(): MockRes {
  const res: MockRes = {
    statusCode: 200,
    body: null,
    status(code: number) {
      this.statusCode = code
      return this
    },
    json(data: unknown) {
      this.body = data
    },
  }
  return res
}

function runHandler(
  handler: RouteHandler,
  req: MockReq,
  res: MockRes,
  options: { middleware?: boolean } = {}
): Promise<void> {
  return new Promise((resolve, reject) => {
    let settled = false
    const finish = (err?: unknown) => {
      if (settled) return
      settled = true
      if (err) reject(err)
      else resolve()
    }

    const originalJson = res.json.bind(res)
    res.json = (data: unknown) => {
      originalJson(data)
      if (!options.middleware) finish()
    }

    const next = (err?: unknown) => {
      if (err) {
        finish(err)
        return
      }
      if (options.middleware) finish()
    }

    try {
      const result = handler(req, res, next)
      if (result && typeof (result as Promise<void>).then === "function") {
        ;(result as Promise<void>)
          .then(() => {
            if (!options.middleware && res.body !== null && !settled) finish()
          })
          .catch(finish)
      }
    } catch (err) {
      finish(err)
    }
  })
}

async function parseBody(request: Request): Promise<unknown> {
  if (request.method === "GET" || request.method === "HEAD") return {}
  const text = await request.text()
  if (!text) return {}
  try {
    return JSON.parse(text)
  } catch {
    return {}
  }
}

function buildMockReq(
  request: Request,
  params: Record<string, string>
): MockReq {
  const url = new URL(request.url)
  const query: Record<string, string> = {}
  url.searchParams.forEach((v, k) => {
    query[k] = v
  })

  return {
    method: request.method,
    url: url.pathname + url.search,
    path: url.pathname,
    params,
    query,
    body: {},
    headers: request.headers,
  }
}

function errorStatus(err: unknown): number {
  if (err && typeof err === "object") {
    const e = err as { status?: number; statusCode?: number }
    if (typeof e.status === "number") return e.status
    if (typeof e.statusCode === "number") return e.statusCode
  }
  return 500
}

function errorMessage(err: unknown): string {
  if (err && typeof err === "object") {
    const e = err as { publicMessage?: string; message?: string }
    if (e.publicMessage) return e.publicMessage
    if (e.message) return e.message
  }
  return "Erro interno do servidor"
}

function getAuthMiddleware() {
  return load<{ requireAuth: RouteHandler }>("middleware/auth.js").requireAuth
}

async function withAuth(
  req: MockReq,
  res: MockRes,
  handler: RouteHandler
): Promise<NextResponse> {
  const authMw = getAuthMiddleware()

  try {
    await runHandler(authMw, req, res, { middleware: true })
    if (res.body !== null) {
      return NextResponse.json(res.body, { status: res.statusCode })
    }

    const inner = createMockRes()
    await runHandler(handler, req, inner)
    return NextResponse.json(inner.body ?? {}, { status: inner.statusCode })
  } catch (err) {
    console.error("[finder/api] handler", err)
    return NextResponse.json({ erro: errorMessage(err) }, { status: errorStatus(err) })
  }
}

function permissionMiddleware(permission: FinderPermission): RouteHandler {
  return (req, res, next) => {
    if (!req.auth) {
      res.status(401).json({ erro: "Não autenticado" })
      return
    }
    if (!hasFinderPermission(req.auth.role, permission)) {
      res.status(403).json({ erro: "Sem permissão para esta ação." })
      return
    }
    next()
  }
}

async function withPermission(
  req: MockReq,
  res: MockRes,
  permission: FinderPermission,
  handler: RouteHandler
): Promise<NextResponse> {
  const authMw = getAuthMiddleware()
  const permMw = permissionMiddleware(permission)

  try {
    await runHandler(authMw, req, res, { middleware: true })
    if (res.body !== null) {
      return NextResponse.json(res.body, { status: res.statusCode })
    }

    const permRes = createMockRes()
    await runHandler(permMw, req, permRes, { middleware: true })
    if (permRes.body !== null) {
      return NextResponse.json(permRes.body, { status: permRes.statusCode })
    }

    const inner = createMockRes()
    await runHandler(handler, req, inner)
    return NextResponse.json(inner.body ?? {}, { status: inner.statusCode })
  } catch (err) {
    console.error("[finder/api] handler", err)
    return NextResponse.json({ erro: errorMessage(err) }, { status: errorStatus(err) })
  }
}

export async function handleFinderApi(
  request: Request,
  slug: string[] = []
): Promise<NextResponse> {
  try {
    ensureFinderRuntime()
    return await dispatchFinderApi(request, slug)
  } catch (err) {
    console.error("[finder/api] bootstrap", err)
    const message =
      err instanceof Error ? err.message : "Falha ao iniciar o Finder"
    return NextResponse.json(
      {
        erro: message,
        hint:
          "Confira DATABASE_URL e FINDER_JWT_SECRET na Vercel. O backend do Finder deve estar em src/lib/finder/server.",
      },
      { status: 500 }
    )
  }
}

async function dispatchFinderApi(
  request: Request,
  slug: string[]
): Promise<NextResponse> {
  const req = buildMockReq(request, {})
  req.body = await parseBody(request)
  const res = createMockRes()

  const segment = slug[0] ?? ""
  const id = slug[1]
  const action = slug[2]

  try {
    if (segment === "health" && request.method === "GET") {
      const finderDb = load<{ healthcheck: () => Promise<{ now: unknown }> }>(
        "config/database.js"
      )
      const finderEnv = load<{ nodeEnv: string }>("config/env.js")
      const aiService = load<{ isEnabled: () => boolean }>("services/aiService.js")

      try {
        const dbInfo = await finderDb.healthcheck()
        return NextResponse.json({
          status: "ok",
          time: dbInfo.now,
          env: finderEnv.nodeEnv,
          ai: aiService.isEnabled() ? "on" : "off",
        })
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Falha na conexão com o banco"
        console.error("[finder/health]", err)
        return NextResponse.json(
          {
            status: "degraded",
            erro: message,
            hint:
              "Supabase: use Transaction pooler (porta 6543) na DATABASE_URL para serverless/Vercel. Session pooler (5432) limita ~15 conexões totais.",
          },
          { status: 503 }
        )
      }
    }

    if (segment === "config" && request.method === "GET") {
      const finderEnv = load<{
        urls: { admin: string | null; app: string | null; finderPublic: string | null }
      }>("config/env.js")
      const { PLANS } = load<{ PLANS: Record<string, unknown> }>("config/plans.js")
      const aiService = load<{ isEnabled: () => boolean }>("services/aiService.js")
      const azulliCore = load<{ isConfigured: () => boolean }>("services/azulliCore.js")
      const searchConfig = load<{
        isSearchConfigured: () => boolean
        searchProvider: () => string
      }>("scrapers/search-config.js")

      return withAuth(req, res, (_req, innerRes) => {
        innerRes.json({
          app: "Azulli Finder",
          plans: Object.values(PLANS),
          ai: aiService.isEnabled(),
          search: {
            configured: searchConfig.isSearchConfigured(),
            provider: searchConfig.searchProvider(),
          },
          integration: { azulliCore: azulliCore.isConfigured() },
          urls: {
            admin: finderEnv.urls.admin,
            app: finderEnv.urls.app,
            finder: finderEnv.urls.finderPublic,
          },
        })
      })
    }

    if (segment === "auth") {
      const authCtrl = load<{ login: RouteHandler; me: RouteHandler }>(
        "controllers/authController.js"
      )

      if (slug[1] === "login" && request.method === "POST") {
        await runHandler(authCtrl.login, req, res)
        return NextResponse.json(res.body ?? {}, { status: res.statusCode })
      }
      if (slug[1] === "me" && request.method === "GET") {
        return withAuth(req, res, authCtrl.me)
      }
    }

    if (segment === "users") {
      const userCtrl = load<{
        list: RouteHandler
        create: RouteHandler
        update: RouteHandler
      }>("controllers/userController.js")

      if (!id && request.method === "GET") {
        return withPermission(req, res, "leads.read", userCtrl.list)
      }
      if (!id && request.method === "POST") {
        return withPermission(req, res, "users.manage", userCtrl.create)
      }
      if (id && request.method === "PATCH") {
        req.params = { id }
        return withPermission(req, res, "users.manage", userCtrl.update)
      }
    }

    if (segment === "searches") {
      const searchCtrl = load<{ buscar: RouteHandler; listar: RouteHandler }>(
        "controllers/searchController.js"
      )

      if (request.method === "POST") {
        return withPermission(req, res, "searches.run", searchCtrl.buscar)
      }
      if (request.method === "GET") {
        return withPermission(req, res, "leads.read", searchCtrl.listar)
      }
    }

    if (segment === "leads") {
      const leadCtrl = load<Record<string, RouteHandler>>("controllers/leadController.js")

      if (slug[1] === "stats" && request.method === "GET") {
        return withPermission(req, res, "leads.read", leadCtrl.stats)
      }
      if (!id && request.method === "GET") {
        return withPermission(req, res, "leads.read", leadCtrl.listar)
      }
      if (id && !action && request.method === "GET") {
        req.params = { id }
        return withPermission(req, res, "leads.read", leadCtrl.obter)
      }
      if (id && !action && request.method === "PATCH") {
        req.params = { id }
        return withPermission(req, res, "leads.write", leadCtrl.atualizar)
      }
      if (id && !action && request.method === "DELETE") {
        req.params = { id }
        return withPermission(req, res, "leads.delete", leadCtrl.excluir)
      }
      if (id && action === "status" && request.method === "POST") {
        req.params = { id }
        return withPermission(req, res, "leads.write", leadCtrl.trocarStatus)
      }
      if (id && action === "atribuir" && request.method === "POST") {
        req.params = { id }
        return withPermission(req, res, "leads.write", leadCtrl.atribuir)
      }
      if (id && action === "pegar" && request.method === "POST") {
        req.params = { id }
        return withPermission(req, res, "leads.write", leadCtrl.pegarParaMim)
      }
      if (id && action === "enriquecer" && request.method === "POST") {
        req.params = { id }
        return withPermission(req, res, "leads.write", leadCtrl.reEnriquecer)
      }
      if (id && action === "pitch" && request.method === "POST") {
        req.params = { id }
        return withPermission(req, res, "leads.write", leadCtrl.regerarPitch)
      }
      if (id && action === "converter" && request.method === "POST") {
        req.params = { id }
        return withPermission(req, res, "leads.convert", leadCtrl.converter)
      }
    }

    return NextResponse.json({ erro: "Rota não encontrada" }, { status: 404 })
  } catch (err) {
    console.error("[finder/api]", err)
    const message =
      err instanceof Error ? err.message : "Erro interno do servidor"
    return NextResponse.json({ erro: message }, { status: 500 })
  }
}

export const maxDuration = 120
