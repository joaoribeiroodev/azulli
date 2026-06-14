"use client"

import { Download, ExternalLink } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { formatBRL } from "@/lib/utils/currency"
import { formatDateBR } from "@/lib/utils/date"
import type { InvoiceRow } from "@/lib/invoices/queries"
import { InvoiceStatusBadge } from "./invoice-status-badge"

type Props = {
  invoice: InvoiceRow
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function InvoiceDetailDialog({ invoice, open, onOpenChange }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2">
            {invoice.type === "nfe" ? "NF-e" : "NFS-e"}
            <InvoiceStatusBadge status={invoice.status} />
          </DialogTitle>
          <DialogDescription>
            Detalhes da nota fiscal emitida
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 text-sm py-2">
          <InfoRow
            label="Descrição"
            value={invoice.transaction_description ?? "—"}
          />
          <Separator />
          <InfoRow label="Cliente" value={invoice.customer_name ?? "—"} />
          <Separator />
          <InfoRow
            label="Valor"
            value={formatBRL(invoice.transaction_amount)}
          />
          <Separator />
          <InfoRow
            label="Emitida em"
            value={formatDateBR(invoice.created_at)}
          />
          {invoice.external_id && (
            <>
              <Separator />
              <InfoRow
                label="ID do provedor"
                value={
                  <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                    {invoice.external_id}
                  </code>
                }
              />
            </>
          )}
          {invoice.error_message && (
            <>
              <Separator />
              <div className="rounded-lg bg-red-50 border border-red-200 p-3">
                <p className="text-xs font-semibold text-red-900 mb-1">
                  Motivo do erro
                </p>
                <p className="text-xs text-red-800">{invoice.error_message}</p>
              </div>
            </>
          )}
        </div>

        {invoice.status === "authorized" && (
          <div className="flex gap-2 pt-2">
            {invoice.pdf_url && (
              <Button asChild variant="outline" className="flex-1">
                <a
                  href={invoice.pdf_url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Download className="mr-2 h-4 w-4" />
                  PDF
                </a>
              </Button>
            )}
            {invoice.xml_url && (
              <Button asChild variant="outline" className="flex-1">
                <a
                  href={invoice.xml_url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="mr-2 h-4 w-4" />
                  XML
                </a>
              </Button>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

function InfoRow({
  label,
  value,
}: {
  label: string
  value: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-right">{value}</span>
    </div>
  )
}
