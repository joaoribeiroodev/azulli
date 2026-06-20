import { TOKEN_KEY, USER_KEY } from "@/lib/finder/constants"
import type {
  FinderConfig,
  Lead,
  LeadConversion,
  LeadDetailResponse,
  LeadsListResponse,
  LeadsStatsResponse,
  Search,
  SearchCreateResponse,
  User,
} from "@/lib/finder/types"

export class ApiError extends Error {
  status: number
  payload: unknown

  constructor(message: string, status: number, payload: unknown) {
    super(message)
    this.name = "ApiError"
    this.status = status
    this.payload = payload
  }
}

type RequestOptions = {
  body?: unknown
  query?: Record<string, string | number | string[] | null | undefined>
}

function getToken(): string | null {
  if (typeof window === "undefined") return null
  return localStorage.getItem(TOKEN_KEY)
}

function setToken(t: string): void {
  localStorage.setItem(TOKEN_KEY, t)
}

function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
}

function getUser(): User | null {
  if (typeof window === "undefined") return null
  try {
    return JSON.parse(localStorage.getItem(USER_KEY) || "null") as User | null
  } catch {
    return null
  }
}

function setUser(u: User): void {
  localStorage.setItem(USER_KEY, JSON.stringify(u))
}

async function request<T>(
  method: string,
  path: string,
  { body, query }: RequestOptions = {}
): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" }
  const token = getToken()
  if (token) headers.Authorization = `Bearer ${token}`

  let url = path
  if (query) {
    const usp = new URLSearchParams()
    Object.entries(query).forEach(([k, v]) => {
      if (v == null || v === "") return
      if (Array.isArray(v)) usp.set(k, v.join(","))
      else usp.set(k, String(v))
    })
    const qs = usp.toString()
    if (qs) url += `?${qs}`
  }

  const res = await fetch(url, {
    method,
    headers,
    body: body == null ? undefined : JSON.stringify(body),
  })

  let payload: Record<string, unknown> | null = null
  const text = await res.text()
  if (text) {
    try {
      payload = JSON.parse(text) as Record<string, unknown>
    } catch {
      payload = { raw: text }
    }
  }

  if (res.status === 401) {
    clearToken()
    if (typeof window !== "undefined") {
      window.location.href = "/finder/login"
    }
    throw new ApiError(
      (payload?.erro as string) || "Sessão expirada",
      401,
      payload
    )
  }

  if (!res.ok) {
    const fallback504 =
      "A busca excedeu o tempo limite do servidor (504). Tente bairro + cidade ou aguarde e tente novamente."
    const msg =
      (payload?.erro as string) ||
      (res.status === 504 ? fallback504 : `HTTP ${res.status}`)
    throw new ApiError(msg, res.status, payload)
  }

  return payload as T
}

export const finderClient = {
  ApiError,
  token: { get: getToken, set: setToken, clear: clearToken },
  user: { get: getUser, set: setUser },

  health: () => request<{ ok?: boolean }>("GET", "/api/finder/health"),
  config: () => request<FinderConfig>("GET", "/api/finder/config"),

  auth: {
    login: (email: string, password: string) =>
      request<{ token: string; user: User }>("POST", "/api/finder/auth/login", {
        body: { email, password },
      }),
    me: () => request<{ user: User }>("GET", "/api/finder/auth/me"),
  },

  users: {
    list: () => request<{ users: User[] }>("GET", "/api/finder/users"),
    create: (data: {
      nome: string
      email: string
      password: string
      role: string
    }) => request<{ user: User }>("POST", "/api/finder/users", { body: data }),
    update: (id: string, data: Partial<Pick<User, "ativo">>) =>
      request<{ user: User }>("PATCH", `/api/finder/users/${id}`, { body: data }),
  },

  searches: {
    create: (termo: string, localizacao: string) =>
      request<SearchCreateResponse>("POST", "/api/finder/searches", {
        body: { termo, localizacao },
      }),
    list: (params?: Record<string, string | number | undefined>) =>
      request<{ searches: Search[] }>("GET", "/api/finder/searches", { query: params }),
  },

  leads: {
    list: (params?: Record<string, string | number | undefined>) =>
      request<LeadsListResponse>("GET", "/api/finder/leads", { query: params }),
    stats: () => request<LeadsStatsResponse>("GET", "/api/finder/leads/stats"),
    get: (id: string) => request<LeadDetailResponse>("GET", `/api/finder/leads/${id}`),
    update: (id: string, data: Partial<Pick<Lead, "notas">>) =>
      request<{ lead: Lead }>("PATCH", `/api/finder/leads/${id}`, { body: data }),
    destroy: (id: string) =>
      request<{ ok?: boolean }>("DELETE", `/api/finder/leads/${id}`),
    status: (id: string, status: string, motivo?: string) =>
      request<{ lead: Lead }>("POST", `/api/finder/leads/${id}/status`, {
        body: { status, motivo },
      }),
    atribuir: (id: string, responsavelId: string | null) =>
      request<{ lead: Lead }>("POST", `/api/finder/leads/${id}/atribuir`, {
        body: { responsavelId },
      }),
    pegar: (id: string) =>
      request<{ lead: Lead }>("POST", `/api/finder/leads/${id}/pegar`),
    enriquecer: (id: string) =>
      request<{ lead: Lead }>("POST", `/api/finder/leads/${id}/enriquecer`),
    regerarPitch: (id: string, canal = "whatsapp") =>
      request<{ pitch: string }>("POST", `/api/finder/leads/${id}/pitch`, {
        query: { canal },
      }),
    converter: (id: string, plano: string) =>
      request<{ conversao: LeadConversion }>("POST", `/api/finder/leads/${id}/converter`, {
        body: { plano },
      }),
  },
}
