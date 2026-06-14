"use client"

import { useState, useTransition } from "react"
import { FileText, Loader2 } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

import { issueInvoiceAction } from "@/lib/invoices/actions"

type Props = {
  transactionId: string
  transactionStatus: "pending" | "paid" | "overdue"
  transactionType: "income" | "expense"
  allowsNFe: boolean
  hasExistingInvoice: boolean
}

export function IssueInvoiceButton({
  transactionId,
  transactionStatus,
  transactionType,
  allowsNFe,
  hasExistingInvoice,
}: Props) {
  const [isPending, startTransition] = useTransition()
  const [open, setOpen] = useState(false)

  if (transactionType !== "income") return null

  const disabled = transactionStatus !== "paid" || hasExistingInvoice
  const disabledReason = hasExistingInvoice
    ? "Já existe uma nota emitida"
    : transactionStatus !== "paid"
      ? "Marque como pago primeiro"
      : null

  function issue(type: "nfse" | "nfe") {
    setOpen(false)
    startTransition(async () => {
      const result = await issueInvoiceAction({
        transaction_id: transactionId,
        type,
      })
      if (!result.success) {
        toast.error(result.error)
        return
      }
      toast.success("Nota emitida! 📄", {
        description: "XML e PDF já estão disponíveis em /notas.",
      })
    })
  }

  if (disabled && disabledReason) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span tabIndex={0}>
              <Button
                variant="ghost"
                size="sm"
                disabled
                className="gap-1.5 text-xs h-7"
              >
                <FileText className="h-3.5 w-3.5" />
                Emitir nota
              </Button>
            </span>
          </TooltipTrigger>
          <TooltipContent>{disabledReason}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          disabled={isPending}
          className="gap-1.5 text-xs h-7 hover:text-brand"
        >
          {isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <FileText className="h-3.5 w-3.5" />
          )}
          {isPending ? "Emitindo..." : "Emitir nota"}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Tipo de nota</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => issue("nfse")}>
          <div>
            <p className="text-sm font-medium">NFS-e (Serviço)</p>
            <p className="text-xs text-muted-foreground">
              Para prestação de serviços
            </p>
          </div>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => issue("nfe")}
          disabled={!allowsNFe}
          className="flex-col items-start"
        >
          <div className="w-full">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">NF-e (Produto)</p>
              {!allowsNFe && (
                <span className="text-[10px] bg-brand-soft text-brand px-1.5 py-0.5 rounded">
                  Empresarial
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Para venda de produtos
            </p>
          </div>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
