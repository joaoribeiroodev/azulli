"use client"

import { useState } from "react"
import { Plus, ArrowDownRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { TransactionDialog } from "@/components/app/transaction-dialog"

type Party = { id: string; name: string }

type Props = {
  customers: Party[]
  suppliers: Party[]
}

export function QuickActions({ customers, suppliers }: Props) {
  const [open, setOpen] = useState<"income" | "expense" | null>(null)

  return (
    <div className="flex gap-2">
      <Button
        variant="outline"
        onClick={() => setOpen("expense")}
        className="gap-2"
      >
        <ArrowDownRight className="h-4 w-4" />
        Nova despesa
      </Button>
      <Button
        onClick={() => setOpen("income")}
        className="bg-brand hover:bg-brand-hover gap-2"
      >
        <Plus className="h-4 w-4" />
        Nova receita
      </Button>

      <TransactionDialog
        open={open !== null}
        type={open ?? "income"}
        onOpenChange={(o) => !o && setOpen(null)}
        customers={customers}
        suppliers={suppliers}
      />
    </div>
  )
}
