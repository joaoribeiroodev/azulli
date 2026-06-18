import Link from "next/link"
import { Lightbulb } from "lucide-react"

import { getHumanInsight } from "@/lib/insights/human-insight"

export async function HumanInsightCard() {
  const insight = await getHumanInsight()
  if (!insight) return null

  return (
    <div className="rounded-xl border border-border/80 bg-card/60 p-4 flex items-start gap-3">
      <Lightbulb className="h-5 w-5 text-brand shrink-0 mt-0.5" aria-hidden />
      <div className="flex-1 min-w-0 space-y-2">
        <p className="text-sm text-foreground leading-relaxed">{insight.message}</p>
        {insight.href && insight.label && (
          <Link
            href={insight.href}
            className="text-xs font-medium text-brand hover:underline underline-offset-4"
          >
            {insight.label} →
          </Link>
        )}
      </div>
    </div>
  )
}
