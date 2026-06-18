"use client"

import { useEffect, useState } from "react"
import { X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const STORAGE_KEY = "azulli_dashboard_tour_v1"

const STEPS = [
  {
    target: "dashboard-kpis",
    title: "KPIs do mês",
    body: "Entradas, saídas, saldo e pendências — sua foto financeira em segundos.",
  },
  {
    target: "dashboard-recent",
    title: "Movimentações recentes",
    body: "Confira o que entrou e saiu e marque pagamentos sem sair do painel.",
  },
  {
    target: "dashboard-quick-actions",
    title: "Lançamentos rápidos",
    body: "Nova receita ou despesa em dois cliques, direto daqui.",
  },
  {
    target: "dashboard-sidebar",
    title: "Menu lateral",
    body: "Clientes, produtos, assistente IA, metas e muito mais — explore quando quiser.",
  },
] as const

export function DashboardTour() {
  const [active, setActive] = useState(false)
  const [index, setIndex] = useState(0)

  useEffect(() => {
    try {
      if (localStorage.getItem(STORAGE_KEY)) return undefined
      const timer = window.setTimeout(() => setActive(true), 800)
      return () => window.clearTimeout(timer)
    } catch {
      return undefined
    }
  }, [])

  function dismiss() {
    try {
      localStorage.setItem(STORAGE_KEY, "1")
    } catch {
      /* ignore */
    }
    setActive(false)
  }

  if (!active) return null

  const step = STEPS[index]
  const target = document.querySelector(`[data-tour="${step.target}"]`)
  const rect = target?.getBoundingClientRect()

  return (
    <>
      <div
        className="fixed inset-0 z-[60] bg-black/40"
        aria-hidden
        onClick={dismiss}
      />

      {rect && (
        <div
          className="fixed z-[61] rounded-xl ring-2 ring-brand ring-offset-2 ring-offset-background pointer-events-none transition-all duration-300"
          style={{
            top: rect.top - 4,
            left: rect.left - 4,
            width: rect.width + 8,
            height: rect.height + 8,
          }}
        />
      )}

      <div
        className={cn(
          "fixed z-[62] w-[min(100%,20rem)] rounded-xl border bg-card shadow-lg p-4 space-y-3",
          rect
            ? {
                top: Math.min(rect.bottom + 12, window.innerHeight - 220),
                left: Math.min(rect.left, window.innerWidth - 336),
              }
            : { bottom: 24, right: 24 }
        )}
      >
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-xs font-medium text-brand">
              Tour rápido · {index + 1}/{STEPS.length}
            </p>
            <p className="text-sm font-semibold text-foreground mt-0.5">
              {step.title}
            </p>
          </div>
          <button
            type="button"
            onClick={dismiss}
            className="p-1 rounded text-muted-foreground hover:text-foreground"
            aria-label="Fechar tour"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">
          {step.body}
        </p>
        <div className="flex gap-2">
          {index > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => setIndex((i) => i - 1)}
            >
              Anterior
            </Button>
          )}
          {index < STEPS.length - 1 ? (
            <Button
              size="sm"
              className="flex-1 bg-brand hover:bg-brand-hover"
              onClick={() => setIndex((i) => i + 1)}
            >
              Próximo
            </Button>
          ) : (
            <Button
              size="sm"
              className="flex-1 bg-brand hover:bg-brand-hover"
              onClick={dismiss}
            >
              Entendi!
            </Button>
          )}
        </div>
      </div>
    </>
  )
}
