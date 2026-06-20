"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import { usePathname, useRouter } from "next/navigation"

import { finderClient } from "@/lib/finder/client"
import { DEFAULT_PLANS } from "@/lib/finder/constants"
import type { FinderConfig, FinderPlan, User } from "@/lib/finder/types"

type PageMeta = {
  title: string
  subtitle?: string
}

type FinderContextValue = {
  user: User | null
  config: FinderConfig | null
  plans: FinderPlan[]
  adminUrl: string | null
  aiEnabled: boolean
  isLoading: boolean
  isAuthenticated: boolean
  pageMeta: PageMeta
  setPageMeta: (meta: PageMeta) => void
  refreshUser: () => Promise<void>
  logout: () => void
}

const DEFAULT_PAGE_META: PageMeta = {
  title: "Dashboard",
  subtitle: "Visão geral da prospecção",
}

const FinderContext = createContext<FinderContextValue | null>(null)

export function FinderProvider({ children }: { children: ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [user, setUser] = useState<User | null>(null)
  const [config, setConfig] = useState<FinderConfig | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [pageMeta, setPageMetaState] = useState<PageMeta>(DEFAULT_PAGE_META)

  const setPageMeta = useCallback((meta: PageMeta) => {
    setPageMetaState(meta)
  }, [])

  const refreshUser = useCallback(async () => {
    const { user: me } = await finderClient.auth.me()
    finderClient.user.set(me)
    setUser(me)
  }, [])

  const logout = useCallback(() => {
    finderClient.token.clear()
    setUser(null)
    router.push("/finder/login")
  }, [router])

  useEffect(() => {
    let cancelled = false

    ;(async () => {
      if (!finderClient.token.get()) {
        if (!cancelled) {
          setIsLoading(false)
          router.replace("/finder/login")
        }
        return
      }

      try {
        const cached = finderClient.user.get()
        if (cached && !cancelled) setUser(cached)

        const [{ user: me }, cfg] = await Promise.all([
          finderClient.auth.me(),
          finderClient.config().catch(() => null),
        ])

        if (cancelled) return

        finderClient.user.set(me)
        setUser(me)
        if (cfg) setConfig(cfg)
      } catch {
        if (cancelled) return
        finderClient.token.clear()
        router.replace("/finder/login")
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [router])

  useEffect(() => {
    setPageMetaState(DEFAULT_PAGE_META)
  }, [pathname])

  const value = useMemo<FinderContextValue>(
    () => ({
      user,
      config,
      plans: config?.plans?.length ? config.plans : DEFAULT_PLANS,
      adminUrl: config?.urls?.admin ?? null,
      aiEnabled: Boolean(config?.ai),
      isLoading,
      isAuthenticated: Boolean(user),
      pageMeta,
      setPageMeta,
      refreshUser,
      logout,
    }),
    [user, config, isLoading, pageMeta, setPageMeta, refreshUser, logout]
  )

  if (isLoading) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-surface">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <div className="h-9 w-9 rounded-full border-2 border-brand/20 border-t-brand animate-spin" />
          <p className="text-sm">Carregando Finder…</p>
        </div>
      </div>
    )
  }

  if (!user) return null

  return <FinderContext.Provider value={value}>{children}</FinderContext.Provider>
}

export function useFinderContext() {
  const ctx = useContext(FinderContext)
  if (!ctx) {
    throw new Error("useFinderContext must be used within FinderProvider")
  }
  return ctx
}

export function useFinderPageMeta(meta: PageMeta) {
  const { setPageMeta } = useFinderContext()

  useEffect(() => {
    setPageMeta(meta)
  }, [meta.title, meta.subtitle, setPageMeta])
}
