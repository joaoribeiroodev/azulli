"use client"

import { useState, useTransition } from "react"
import { Download, MoreHorizontal, RefreshCcw, Eye } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

import { formatBRL } from "@/lib/utils/currency"
import { formatDateBR } from "@/lib/utils/date"
import { retryInvoiceAction } from "@/lib/invoices/actions"
import type { InvoiceRow } from "@/lib/invoices/queries"

import { InvoiceStatusBadge } from "./invoice-status-badge"
import { InvoiceDetailDialog } from "./invoice-detail-dialog"

export function InvoicesTable({ rows }: { rows: InvoiceRow[] }) {
  const [detail, setDetail] = useState<InvoiceRow | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleRetry(row: InvoiceRow) {
    startTransition(async () => {
      const result = await retryInvoiceAction(row.id)
      if (!result.success) {
        toast.error(result.error)
        return
      }
      toast.success("Nota reenviada! 📄")
    })
  }

  if (rows.length === 0) {
    return (
      <div className="rounded-xl border bg-card py-16 text-center">
        <p className="text-sm text-muted-foreground">
          Nenhuma nota emitida ainda.
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Vá em Lançamentos, marque uma receita como paga e clique em
          &quot;Emitir nota&quot;.
        </p>
      </div>
    )
  }

  return (
    <>
      <div className="rounded-xl border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tipo</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead className="hidden md:table-cell">Cliente</TableHead>
              <TableHead>Data</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Valor</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell>
                  <span className="inline-block text-[10px] font-semibold uppercase tracking-wide bg-brand-soft text-brand px-2 py-0.5 rounded">
                    {row.type === "nfe" ? "NF-e" : "NFS-e"}
                  </span>
                </TableCell>
                <TableCell className="font-medium">
                  {row.transaction_description ?? "Receita"}
                </TableCell>
                <TableCell className="hidden md:table-cell text-muted-foreground">
                  {row.customer_name ?? "—"}
                </TableCell>
                <TableCell className="text-muted-foreground whitespace-nowrap">
                  {formatDateBR(row.created_at)}
                </TableCell>
                <TableCell>
                  <InvoiceStatusBadge status={row.status} />
                </TableCell>
                <TableCell className="text-right font-semibold whitespace-nowrap">
                  {formatBRL(row.transaction_amount)}
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" disabled={isPending}>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setDetail(row)}>
                        <Eye className="mr-2 h-4 w-4" />
                        Ver detalhes
                      </DropdownMenuItem>
                      {row.status === "authorized" && row.pdf_url && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem asChild>
                            <a
                              href={row.pdf_url}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <Download className="mr-2 h-4 w-4" />
                              Baixar PDF
                            </a>
                          </DropdownMenuItem>
                          {row.xml_url && (
                            <DropdownMenuItem asChild>
                              <a
                                href={row.xml_url}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <Download className="mr-2 h-4 w-4" />
                                Baixar XML
                              </a>
                            </DropdownMenuItem>
                          )}
                        </>
                      )}
                      {row.status === "error" && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => handleRetry(row)}>
                            <RefreshCcw className="mr-2 h-4 w-4" />
                            Tentar novamente
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {detail && (
        <InvoiceDetailDialog
          invoice={detail}
          open={!!detail}
          onOpenChange={(o) => !o && setDetail(null)}
        />
      )}
    </>
  )
}
