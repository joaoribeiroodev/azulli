import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

type Props = {
  children: ReactNode
  className?: string
  /** Altura mínima do gráfico (Recharts precisa de dimensões > 0). */
  minHeight?: string
}

/**
 * Container para ResponsiveContainer — evita width/height -1 no Recharts.
 */
export function ChartPanel({
  children,
  className,
  minHeight = "12rem",
}: Props) {
  return (
    <div
      className={cn("relative min-w-0 w-full", className)}
      style={{ minHeight }}
    >
      {children}
    </div>
  )
}
