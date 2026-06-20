import path from "node:path"
import { createRequire } from "node:module"
import { NextResponse } from "next/server"

import { convertFinderLead } from "@/lib/finder/convert-lead"

const require = createRequire(import.meta.url)
const APPS_FINDER = path.join(process.cwd(), "apps", "finder")

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

let initialized = false

function ensureFinderRuntime() {
  if (initialized) return
  initialized = true

  globalThis.__AZULLI_FINDER_CONVERT__ = async (payload: {
    finderLeadId: string
    email?: string | null
    nome: string
    telefone?: string | null
    cnpj?: string | null
    plano: "pro" | "enterprise"
  }) => convertFinderLead(payload)

  require(path.join(APPS_FINDER, "config", "env.js"))
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
  params: Record<string, string>,
  slug: string[]
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
  req: MockReq,
  res: MockRes,
  handler: RouteHandler
): Promise<NextResponse> {
  const authMw = require(path.join(APPS_FINDER, "middleware", "auth.js"))
    .requireAuth as RouteHandler

  await runHandler(authMw, req, res, { middleware: true })
  if (res.body !== null) {
    return NextResponse.json(res.body, { status: res.statusCode })
  }

  const inner = createMockRes()
  await runHandler(handler, req, inner)
  return NextResponse.json(inner.body ?? {}, { status: inner.statusCode })
}

async function withRole(
  req: MockReq,
  res: MockRes,
  roles: string[],
  handler: RouteHandler
): Promise<NextResponse> {
  const authMw = require(path.join(APPS_FINDER, "middleware", "auth.js"))
    .requireAuth as RouteHandler
  const roleMw = require(path.join(
    APPS_FINDER,
    "middleware",
    "requireRole.js"
  ))(...roles) as RouteHandler

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
  ensureFinderRuntime()

  const req = buildMockReq(request, {}, slug)
  req.body = await parseBody(request)
  const res = createMockRes()

  const segment = slug[0] ?? ""
  const id = slug[1]
  const action = slug[2]

  const health = require(path.join(APPS_FINDER, "config", "database.js"))
  const aiService = require(path.join(APPS_FINDER, "services", "aiService.js"))
  const authCtrl = require(path.join(
    APPS_FINDER,
    "controllers",
    "authController.js"
  ))
  const userCtrl = require(path.join(
    APPS_FINDER,
    "controllers",
    "userController.js"
  ))
  const searchCtrl = require(path.join(
    APPS_FINDER,
    "controllers",
    "searchController.js"
  ))
  const leadCtrl = require(path.join(
    APPS_FINDER,
    "controllers",
    "leadController.js"
  ))
  const env = require(path.join(APPS_FINDER, "config", "env.js"))
  const { PLANS } = require(path.join(APPS_FINDER, "config", "plans.js"))
  const azulliCore = require(path.join(
    APPS_FINDER,
    "services",
    "azulliCore.js"
  ))

  try {
    if (segment === "health" && request.method === "GET") {
      const dbInfo = await health.healthcheck()
      return NextResponse.json({
        status: "ok",
        time: dbInfo.now,
        env: env.nodeEnv,
        ai: aiService.isEnabled() ? "on" : "off",
      })
    }

    if (segment === "config" && request.method === "GET") {
      return withAuth(req, res, (_req, innerRes) => {
        innerRes.json({
          app: "Azulli Finder",
          plans: Object.values(PLANS),
          ai: aiService.isEnabled(),
          integration: { azulliCore: azulliCore.isConfigured() },
          urls: {
            admin: env.urls.admin,
            app: env.urls.app,
            finder: env.urls.finderPublic,
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
        return withAuth(req, res, authCtrl.me)
      }
    }

    if (segment === "users") {
      if (!id && request.method === "GET") {
        return withAuth(req, res, userCtrl.list)
      }
      if (!id && request.method === "POST") {
        return withRole(req, res, ["admin"], userCtrl.create)
      }
      if (id && request.method === "PATCH") {
        req.params = { id }
        return withRole(req, res, ["admin"], userCtrl.update)
      }
    }

    if (segment === "searches") {
      if (request.method === "POST") {
        return withAuth(req, res, searchCtrl.buscar)
      }
      if (request.method === "GET") {
        return withAuth(req, res, searchCtrl.listar)
      }
    }

    if (segment === "leads") {
      if (slug[1] === "stats" && request.method === "GET") {
        return withAuth(req, res, leadCtrl.stats)
      }
      if (!id && request.method === "GET") {
        return withAuth(req, res, leadCtrl.listar)
      }
      if (id && !action && request.method === "GET") {
        req.params = { id }
        return withAuth(req, res, leadCtrl.obter)
      }
      if (id && !action && request.method === "PATCH") {
        req.params = { id }
        return withAuth(req, res, leadCtrl.atualizar)
      }
      if (id && !action && request.method === "DELETE") {
        req.params = { id }
        return withRole(req, res, ["admin"], leadCtrl.excluir)
      }
      if (id && action === "status" && request.method === "POST") {
        req.params = { id }
        return withAuth(req, res, leadCtrl.trocarStatus)
      }
      if (id && action === "atribuir" && request.method === "POST") {
        req.params = { id }
        return withAuth(req, res, leadCtrl.atribuir)
      }
      if (id && action === "pegar" && request.method === "POST") {
        req.params = { id }
        return withAuth(req, res, leadCtrl.pegarParaMim)
      }
      if (id && action === "enriquecer" && request.method === "POST") {
        req.params = { id }
        return withAuth(req, res, leadCtrl.reEnriquecer)
      }
      if (id && action === "pitch" && request.method === "POST") {
        req.params = { id }
        return withAuth(req, res, leadCtrl.regerarPitch)
      }
      if (id && action === "converter" && request.method === "POST") {
        req.params = { id }
        return withRole(req, res, ["admin", "closer"], leadCtrl.converter)
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
