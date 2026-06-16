"use client"

import { Barcode, Zap, CreditCard } from "lucide-react"
import { cn } from "@/lib/utils"

export type BillingType = "BOLETO" | "PIX" | "CREDIT_CARD"

type Props = {
  value: BillingType
  onChange: (v: BillingType) => void
}

const OPTIONS = [
  {
    id: "PIX" as BillingType,
    label: "PIX",
    description: "Pagamento instantâneo.",
    Icon: Zap,
  },
  {
    id: "BOLETO" as BillingType,
    label: "Boleto",
    description: "Vencimento em 3 dias.",
    Icon: Barcode,
  },
  {
    id: "CREDIT_CARD" as BillingType,
    label: "Cartão",
    description: "Crédito ou débito.",
    Icon: CreditCard,
  },
]

export function BillingTypeSelector({ value, onChange }: Props) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {OPTIONS.map(({ id, label, description, Icon }) => {
        const active = value === id
        return (
          <button
            key={id}
            type="button"
            onClick={() => onChange(id)}
            className={cn(
              "flex flex-col items-start gap-1 rounded-lg border p-3 text-left transition-colors",
              active
                ? "border-brand bg-brand-soft text-brand-ink"
                : "border-border bg-card text-muted-foreground hover:border-brand/50"
            )}
          >
            <Icon
              className={cn(
                "h-4 w-4 shrink-0",
                active ? "text-brand" : "text-muted-foreground"
              )}
            />
            <span
              className={cn(
                "text-xs font-medium",
                active ? "text-brand-ink" : "text-foreground"
              )}
            >
              {label}
            </span>
            <span className="text-[11px] leading-snug text-muted-foreground">
              {description}
            </span>
          </button>
        )
      })}
    </div>
  )
}
