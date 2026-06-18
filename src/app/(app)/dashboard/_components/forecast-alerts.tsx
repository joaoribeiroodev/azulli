"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import {
  AlertTriangle,
  AlertCircle,
  Info,
  X,
  ChevronRight,
  type LucideIcon,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { dismissAlertAction } from "@/lib/forecast/actions"
import type { ForecastAlert } from "@/lib/forecast/types"

type Props = {
  alerts: ForecastAlert[]
}

const SEVERITY_STYLES: Record<
  ForecastAlert["severity"],
  { bg: string; border: string; icon: string; iconBg: string; Icon: LucideIcon }
> = {
  critical: {
    bg: "bg-destructive/5",
    border: "border-destructive/30",
    icon: "text-destructive",
    iconBg: "bg-destructive/10",
    Icon: AlertTriangle,
  },
  warning: {
    bg: "bg-amber-50 dark:bg-amber-950/20",
    border: "border-amber-300 dark:border-amber-900",
    icon: "text-amber-600 dark:text-amber-400",
    iconBg: "bg-amber-100 dark:bg-amber-950/40",
    Icon: AlertCircle,
  },
  info: {
    bg: "bg-brand-soft",
    border: "border-brand/30",
    icon: "text-brand",
    iconBg: "bg-brand/10",
    Icon: Info,
  },
}

export function ForecastAlerts({ alerts }: Props) {
  // Otimismo local: ao dispensar, some na hora; se falhar, volta.
  const [hidden, setHidden] = useState<Set<string>>(new Set())

  const visible = alerts.filter((a) => !hidden.has(a.key))
  if (visible.length === 0) return null

  return (
    <section
      aria-label="Alertas de previsão de fluxo de caixa"
      className="space-y-2"
    >
      {visible.map((alert) => (
        <AlertCard
          key={alert.key}
          alert={alert}
          onDismissed={() =>
            setHidden((cur) => {
              const next = new Set(cur)
              next.add(alert.key)
              return next
            })
          }
          onRollback={() =>
            setHidden((cur) => {
              const next = new Set(cur)
              next.delete(alert.key)
              return next
            })
          }
        />
      ))}
    </section>
  )
}

function AlertCard({
  alert,
  onDismissed,
  onRollback,
}: {
  alert: ForecastAlert
  onDismissed: () => void
  onRollback: () => void
}) {
  const [, startTransition] = useTransition()
  const styles = SEVERITY_STYLES[alert.severity]
  const Icon = styles.Icon

  function handleDismiss() {
    onDismissed()
    startTransition(async () => {
      const result = await dismissAlertAction(alert.key)
      if (!result.success) {
        // Reverte UI se a action falhou
        onRollback()
      }
    })
  }

  return (
    <div
      role="alert"
      className={cn(
        "flex items-start gap-3 rounded-lg border px-4 py-3",
        styles.bg,
        styles.border
      )}
    >
      <div
        className={cn(
          "h-8 w-8 rounded-full flex items-center justify-center shrink-0",
          styles.iconBg
        )}
      >
        <Icon className={cn("h-4 w-4", styles.icon)} />
      </div>

      <div className="flex-1 min-w-0">
        <p className={cn("font-medium text-sm", styles.icon)}>{alert.title}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{alert.message}</p>

        {alert.action && (
          <Link
            href={alert.action.href}
            className={cn(
              "mt-2 inline-flex items-center gap-1 text-xs font-medium hover:underline",
              styles.icon
            )}
          >
            {alert.action.label}
            <ChevronRight className="h-3 w-3" />
          </Link>
        )}
      </div>

      <button
        type="button"
        onClick={handleDismiss}
        aria-label="Dispensar alerta"
        className="shrink-0 p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}
