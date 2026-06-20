import { STATUS_LABEL } from "@/lib/finder/constants"
import type { LeadStatus } from "@/lib/finder/types"
import { cn } from "@/lib/utils"

const STATUS_STYLES: Record<LeadStatus, string> = {
  novo: "bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300",
  qualificado: "bg-cyan-50 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-300",
  contatado: "bg-yellow-50 text-yellow-700 dark:bg-yellow-500/15 dark:text-yellow-300",
  em_negociacao: "bg-orange-50 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300",
  assinante: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
  descartado: "bg-slate-100 text-slate-600 dark:bg-slate-500/15 dark:text-slate-300",
}

type LeadStatusBadgeProps = {
  status: LeadStatus | string
  className?: string
}

export function LeadStatusBadge({ status, className }: LeadStatusBadgeProps) {
  const key = status as LeadStatus
  const label = STATUS_LABEL[key] || status
  const styles = STATUS_STYLES[key] || STATUS_STYLES.descartado

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
        styles,
        className
      )}
    >
      {label}
    </span>
  )
}
