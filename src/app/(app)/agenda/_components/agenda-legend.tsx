import {
  AGENDA_COLOR_SCAN,
  AGENDA_LEGEND_ITEMS,
  getAgendaToneLabel,
} from "@/lib/agenda/legend"
import { cn } from "@/lib/utils"

type Props = {
  className?: string
}

export function AgendaLegend({ className }: Props) {
  return (
    <section
      className={cn(
        "rounded-xl border bg-card p-3 sm:p-4 space-y-3",
        className
      )}
      aria-label="Legenda de cores dos eventos"
    >
      <div className="space-y-1">
        <h2 className="text-xs font-semibold text-foreground">
          O que cada cor significa
        </h2>
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          {AGENDA_COLOR_SCAN}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2">
        {AGENDA_LEGEND_ITEMS.map((item) => (
          <div
            key={item.kind}
            className={cn(
              "flex items-start gap-2.5 rounded-lg border px-2.5 py-2",
              item.chipClass
            )}
          >
            <span
              className={cn(
                "mt-1 h-2.5 w-2.5 shrink-0 rounded-full",
                item.dotClass
              )}
              aria-hidden
            />
            <div className="min-w-0">
              <p className="text-xs font-medium leading-tight text-foreground">
                {item.label}
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {item.hint}
                <span className="text-muted-foreground/70">
                  {" "}
                  · {getAgendaToneLabel(item.tone)}
                </span>
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
