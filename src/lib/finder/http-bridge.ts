import { createRequire } from "node:module"
import { NextResponse } from "next/server"

import { convertFinderLead } from "@/lib/finder/convert-lead"

const require = createRequire(import.meta.url)

const finderDb = require("../../../apps/finder/config/database.js")
const finderEnv = require("../../../apps/finder/config/env.js")
const { PLANS } = require("../../../apps/finder/config/plans.js")
const aiService = require("../../../apps/finder/services/aiService.js")
const azulliCore = require("../../../apps/finder/services/azulliCore.js")
const authCtrl = require("../../../apps/finder/controllers/authController.js")
const userCtrl = require("../../../apps/finder/controllers/userController.js")
const searchCtrl = require("../../../apps/finder/controllers/searchController.js")
const leadCtrl = require("../../../apps/finder/controllers/leadController.js")
const finderAuth = require("../../../apps/finder/middleware/auth.js")
const requireRoleFactory = require("../../../apps/finder/middleware/requireRole.js")

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

type FinderModules = {
  finderDb: { healthcheck: () => Promise<{ now: unknown }> }
  finderEnv: {
    nodeEnv: string
    urls: { admin: string | null; app: string | null; finderPublic: string | null }
  }
  PLANS: Record<string, unknown>
  aiService: { isEnabled: () => boolean }
  azulliCore: { isConfigured: () => boolean }
  authCtrl: {
    login: RouteHandler
    me: RouteHandler
  }
  userCtrl: {
    list: RouteHandler
    create: RouteHandler
    update: RouteHandler
  }
  searchCtrl: {
    buscar: RouteHandler
    listar: RouteHandler
  }
  leadCtrl: Record<string, RouteHandler>
  finderAuth: { requireAuth: RouteHandler }
  requireRoleFactory: (...roles: string[]) => RouteHandler
}

let finderModules: FinderModules | null = null
let runtimeInitialized = false

function getFinderModules(): FinderModules {
  if (finderModules) return finderModules

  finderModules = {
    finderDb,
    finderEnv,
    PLANS,
    aiService,
    azulliCore,
    authCtrl,
    userCtrl,
    searchCtrl,
    leadCtrl,
    finderAuth,
    requireRoleFactory,
  }

  return finderModules
}

function ensureFinderRuntime() {
  if (runtimeInitialized) return
  runtimeInitialized = true

  ;(globalThis as typeof globalThis & {
    __AZULLI_FINDER_CONVERT__?: typeof convertFinderLead
  }).__AZULLI_FINDER_CONVERT__ = convertFinderLead
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
      if (options.middleware) finish(err)
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

async function withAuth(
  mods: FinderModules,
  req: MockReq,
  res: MockRes,
  handler: RouteHandler
): Promise<NextResponse> {
  const authMw = mods.finderAuth.requireAuth

  await runHandler(authMw, req, res, { middleware: true })
  if (res.body !== null) {
    return NextResponse.json(res.body, { status: res.statusCode })
  }

  const inner = createMockRes()
  await runHandler(handler, req, inner)
  return NextResponse.json(inner.body ?? {}, { status: inner.statusCode })
}

async function withRole(
  mods: FinderModules,
  req: MockReq,
  res: MockRes,
  roles: string[],
  handler: RouteHandler
): Promise<NextResponse> {
  const authMw = mods.finderAuth.requireAuth
  const roleMw = mods.requireRoleFactory(...roles)

  await runHandler(authMw, req, res, { middleware: true })
  if (res.body !== null) {
    return NextResponse.json(res.body, { status: res.statusCode })
  }

  const roleRes = createMockRes()
  await runHandler(roleMw, req, roleRes, { middleware: true })
  if (roleRes.body !== null) {
    return NextResponse.json(roleRes.body, { status: roleRes.statusCode })
  }

  const inner = createMockRes()
  await runHandler(handler, req, inner)
  return NextResponse.json(inner.body ?? {}, { status: inner.statusCode })
}

export async function handleFinderApi(
  request: Request,
  slug: string[] = []
): Promise<NextResponse> {
  try {
    ensureFinderRuntime()
    const mods = getFinderModules()
    return await dispatchFinderApi(request, slug, mods)
  } catch (err) {
    console.error("[finder/api] bootstrap", err)
    const message =
      err instanceof Error ? err.message : "Falha ao iniciar o Finder"
    return NextResponse.json(
      {
        erro: message,
        hint:
          "Confira DATABASE_URL e FINDER_JWT_SECRET na Vercel. O diretório apps/finder deve estar no deploy.",
      },
      { status: 500 }
    )
  }
}

async function dispatchFinderApi(
  request: Request,
  slug: string[],
  mods: FinderModules
): Promise<NextResponse> {
  const {
    finderDb,
    finderEnv,
    PLANS,
    aiService,
    azulliCore,
    authCtrl,
    userCtrl,
    searchCtrl,
    leadCtrl,
  } = mods

  const req = buildMockReq(request, {})
  req.body = await parseBody(request)
  const res = createMockRes()

  const segment = slug[0] ?? ""
  const id = slug[1]
  const action = slug[2]

  try {
    if (segment === "health" && request.method === "GET") {
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
              "Use a connection string do Supabase (Connect → URI). Em serverless, prefira o Session pooler (porta 5432).",
          },
          { status: 503 }
        )
      }
    }

    if (segment === "config" && request.method === "GET") {
      return withAuth(mods, req, res, (_req, innerRes) => {
        innerRes.json({
          app: "Azulli Finder",
          plans: Object.values(PLANS),
          ai: aiService.isEnabled(),
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
      if (slug[1] === "login" && request.method === "POST") {
        await runHandler(authCtrl.login, req, res)
        return NextResponse.json(res.body ?? {}, { status: res.statusCode })
      }
      if (slug[1] === "me" && request.method === "GET") {
        return withAuth(mods, req, res, authCtrl.me)
      }
    }

    if (segment === "users") {
      if (!id && request.method === "GET") {
        return withAuth(mods, req, res, userCtrl.list)
      }
      if (!id && request.method === "POST") {
        return withRole(mods, req, res, ["admin"], userCtrl.create)
      }
      if (id && request.method === "PATCH") {
        req.params = { id }
        return withRole(mods, req, res, ["admin"], userCtrl.update)
      }
    }

    if (segment === "searches") {
      if (request.method === "POST") {
        return withAuth(mods, req, res, searchCtrl.buscar)
      }
      if (request.method === "GET") {
        return withAuth(mods, req, res, searchCtrl.listar)
      }
    }

    if (segment === "leads") {
      if (slug[1] === "stats" && request.method === "GET") {
        return withAuth(mods, req, res, leadCtrl.stats)
      }
      if (!id && request.method === "GET") {
        return withAuth(mods, req, res, leadCtrl.listar)
      }
      if (id && !action && request.method === "GET") {
        req.params = { id }
        return withAuth(mods, req, res, leadCtrl.obter)
      }
      if (id && !action && request.method === "PATCH") {
        req.params = { id }
        return withAuth(mods, req, res, leadCtrl.atualizar)
      }
      if (id && !action && request.method === "DELETE") {
        req.params = { id }
        return withRole(mods, req, res, ["admin"], leadCtrl.excluir)
      }
      if (id && action === "status" && request.method === "POST") {
        req.params = { id }
        return withAuth(mods, req, res, leadCtrl.trocarStatus)
      }
      if (id && action === "atribuir" && request.method === "POST") {
        req.params = { id }
        return withAuth(mods, req, res, leadCtrl.atribuir)
      }
      if (id && action === "pegar" && request.method === "POST") {
        req.params = { id }
        return withAuth(mods, req, res, leadCtrl.pegarParaMim)
      }
      if (id && action === "enriquecer" && request.method === "POST") {
        req.params = { id }
        return withAuth(mods, req, res, leadCtrl.reEnriquecer)
      }
      if (id && action === "pitch" && request.method === "POST") {
        req.params = { id }
        return withAuth(mods, req, res, leadCtrl.regerarPitch)
      }
      if (id && action === "converter" && request.method === "POST") {
        req.params = { id }
        return withRole(mods, req, res, ["admin", "closer"], leadCtrl.converter)
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
