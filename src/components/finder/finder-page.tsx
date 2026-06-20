"use client"

import { useEffect, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"

const CORE_SCRIPTS = [
  "/finder/js/theme.js",
  "/finder/js/ui.js",
  "/finder/js/api.js",
  "/finder/js/auth.js",
  "/finder/js/router.js",
] as const

const PAGE_SCRIPTS: Record<string, string> = {
  dashboard: "/finder/js/pages/dashboard.js",
  buscar: "/finder/js/pages/buscar.js",
  leads: "/finder/js/pages/leads.js",
  kanban: "/finder/js/pages/kanban.js",
  historico: "/finder/js/pages/historico.js",
  equipe: "/finder/js/pages/equipe.js",
}

let coreReady: Promise<void> | null = null
const pageScriptsLoaded = new Set<string>()

function loadScript(src: string): Promise<void> {
  if (typeof document === "undefined") return Promise.resolve()

  const existing = document.querySelector<HTMLScriptElement>(
    `script[data-finder-src="${src}"]`
  )
  if (existing?.dataset.loaded) return Promise.resolve()

  if (existing) {
    return new Promise((resolve, reject) => {
      existing.addEventListener("load", () => resolve(), { once: true })
      existing.addEventListener("error", reject, { once: true })
    })
  }

  return new Promise((resolve, reject) => {
    const el = document.createElement("script")
    el.src = src
    el.defer = true
    el.dataset.finderSrc = src
    el.onload = () => {
      el.dataset.loaded = "1"
      resolve()
    }
    el.onerror = reject
    document.body.appendChild(el)
  })
}

function ensureCoreScripts() {
  if (!coreReady) {
    coreReady = (async () => {
      for (const src of CORE_SCRIPTS) {
        await loadScript(src)
      }
    })()
  }
  return coreReady
}

async function ensurePageScript(route: string, leadId?: string | null) {
  const scripts: string[] = []
  const pageScript = PAGE_SCRIPTS[route]
  if (pageScript && !pageScriptsLoaded.has(pageScript)) {
    scripts.push(pageScript)
  }
  if (route === "leads" && leadId) {
    const detail = "/finder/js/pages/lead-detail.js"
    if (!pageScriptsLoaded.has(detail)) scripts.push(detail)
  }

  for (const src of scripts) {
    await loadScript(src)
    pageScriptsLoaded.add(src)
  }
}

async function loadAppConfig() {
  const API = window.API
  if (!API) return

  try {
    const cfg = await API.config()
    const adminUrl = cfg.urls?.admin
    const nav = document.getElementById("nav")
    if (adminUrl && nav && !document.getElementById("nav-admin-link")) {
      const a = document.createElement("a")
      a.id = "nav-admin-link"
      a.href = adminUrl
      a.target = "_blank"
      a.rel = "noopener noreferrer"
      a.className = "nav-item"
      a.innerHTML = `
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
        <span>Admin Azulli</span>`
      nav.appendChild(a)
    }
    window.__FINDER_PLANS = cfg.plans || []

    const chip = document.getElementById("ai-status")
    if (chip) {
      chip.classList.remove("hidden")
      chip.innerHTML = cfg.ai
        ? '<span class="w-1.5 h-1.5 rounded-full bg-brand"></span> IA: ON'
        : '<span class="w-1.5 h-1.5 rounded-full bg-muted-foreground"></span> IA: OFF'
    }
  } catch {
    /* ignore */
  }
}

declare global {
  interface Window {
    __FINDER_NEXT_ROUTES__?: boolean
    __FINDER_NAV__?: { go: (path: string) => void }
    __FINDER_PLANS?: unknown[]
    API?: {
      config: () => Promise<{ urls?: { admin?: string }; plans?: unknown[]; ai?: boolean }>
      token: { get: () => string | null; clear: () => void }
      user: { get: () => { nome?: string; email?: string; role?: string } | null; set: (u: unknown) => void }
      auth: { me: () => Promise<{ user: unknown }> }
    }
    Theme?: { init: () => void }
    Auth?: {
      ensureSession: () => Promise<boolean>
      bindLogout: () => void
      showApp: () => void
      renderUserChip?: () => void
    }
    Router?: {
      renderPage: (ctx: {
        route: string
        id?: string | null
        params: URLSearchParams
        container: HTMLElement
      }) => Promise<void>
      bindHashLinks: () => void
    }
    UI?: { toast: (msg: string, type?: string) => void }
  }
}

type FinderPageProps = {
  route: string
  leadId?: string | null
}

export function FinderPage({ route, leadId = null }: FinderPageProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const booted = useRef(false)

  useEffect(() => {
    window.__FINDER_NEXT_ROUTES__ = true
    window.__FINDER_NAV__ = {
      go(path: string) {
        const clean = path.replace(/^#\/?/, "").replace(/^\//, "")
        const [pathPart, query = ""] = clean.split("?")
        const [segment, ...rest] = pathPart.split("/")
        const idPart = rest[0]
        const base = `/finder/${segment || "dashboard"}${idPart ? `/${idPart}` : ""}`
        router.push(query ? `${base}?${query}` : base)
      },
    }

    window.Router?.bindHashLinks?.()

    return () => {
      delete window.__FINDER_NAV__
    }
  }, [router])

  useEffect(() => {
    const container = document.getElementById("page-content")
    if (!container) return

    let cancelled = false

    ;(async () => {
      await ensureCoreScripts()
      if (cancelled) return

      if (!booted.current) {
        window.Theme?.init()
        window.Auth?.bindLogout()
        booted.current = true
      }

      const ok = await window.Auth?.ensureSession()
      if (cancelled) return

      if (!ok) {
        router.replace("/finder/login")
        return
      }

      window.Auth?.showApp?.()
      await ensurePageScript(route, leadId)
      if (cancelled) return

      await loadAppConfig()
      if (cancelled) return

      const params = new URLSearchParams(searchParams.toString())
      await window.Router?.renderPage({
        route,
        id: leadId,
        params,
        container,
      })
    })().catch((err) => {
      console.error("[finder-page]", err)
      container.innerHTML = `<div class="bg-destructive/10 border border-destructive/30 text-destructive p-4 rounded-lg text-sm">Erro ao carregar a página.</div>`
    })

    return () => {
      cancelled = true
    }
  }, [route, leadId, router, searchParams])

  return null
}
