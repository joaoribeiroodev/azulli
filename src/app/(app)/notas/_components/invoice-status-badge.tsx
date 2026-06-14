import { Badge } from "@/components/ui/badge"
import type { InvoiceRow } from "@/lib/invoices/queries"

const STYLES: Record<
  InvoiceRow["status"],
  { label: string; className: string }
> = {
  authorized: {
    label: "Autorizada",
    className: "bg-success-soft text-success-ink hover:bg-success-soft",
  },
  processing: {
    label: "Processando",
    className: "bg-blue-100 text-blue-800 hover:bg-blue-100",
  },
  error: {
    label: "Erro",
    className: "bg-red-100 text-red-800 hover:bg-red-100",
  },
}

export function InvoiceStatusBadge({
  status,
}: {
  status: InvoiceRow["status"]
}) {
  const s = STYLES[status]
  return (
    <Badge variant="secondary" className={s.className}>
      {s.label}
    </Badge>
  )
}
