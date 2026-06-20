import { cn } from "@/lib/utils"

type IcpBadgeProps = {
  score: number | null | undefined
  className?: string
}

export function IcpBadge({ score, className }: IcpBadgeProps) {
  if (score == null) {
    return (
      <span
        className={cn(
          "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-bold",
          "bg-red-50 text-red-700 dark:bg-red-500/15 dark:text-red-300",
          className
        )}
        title="Sem score"
      >
        —
      </span>
    )
  }

  let colors = "bg-red-50 text-red-700 dark:bg-red-500/15 dark:text-red-300"
  if (score >= 80) colors = "bg-indigo-50 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300"
  else if (score >= 60) colors = "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"
  else if (score >= 40) colors = "bg-orange-50 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300"

  return (
    <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-bold", colors, className)}>
      {score}
    </span>
  )
}
