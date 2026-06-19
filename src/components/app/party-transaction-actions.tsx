"use client"

import { useState } from "react"
import { Plus, ArrowDownRight } from "lucide-react"

import { Button } from "@/components/ui/button"
import { TransactionDialog } from "@/components/app/transaction-dialog"
import type { ProductLite } from "@/lib/products/queries"

type Party = { id: string; name: string }

type Props = {
  customers: Party[]
  suppliers: Party[]
  products?: ProductLite[]
  recentIncomeCategories?: string[]
  recentExpenseCategories?: string[]
  defaultCustomerId?: string
  defaultSupplierId?: string
  showIncome?: boolean
  showExpense?: boolean
}

export function PartyTransactionActions({
  customers,
  suppliers,
  products = [],
  recentIncomeCategories = [],
  recentExpenseCategories = [],
  defaultCustomerId,
  defaultSupplierId,
  showIncome = Boolean(defaultCustomerId),
  showExpense = Boolean(defaultSupplierId),
}: Props) {
  const [open, setOpen] = useState<"income" | "expense" | null>(null)

  if (!showIncome && !showExpense) return null

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {showExpense && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setOpen("expense")}
            className="gap-2"
          >
            <ArrowDownRight className="h-4 w-4" />
            Nova despesa
          </Button>
        )}
        {showIncome && (
          <Button
            size="sm"
            onClick={() => setOpen("income")}
            className="bg-brand hover:bg-brand-hover gap-2"
          >
            <Plus className="h-4 w-4" />
            Nova receita
          </Button>
        )}
      </div>

      <TransactionDialog
        open={open !== null}
        type={open ?? "income"}
        onOpenChange={(o) => !o && setOpen(null)}
        customers={customers}
        suppliers={suppliers}
        products={products}
        defaultCustomerId={defaultCustomerId}
        defaultSupplierId={defaultSupplierId}
        recentCategories={
          open === "income" ? recentIncomeCategories : recentExpenseCategories
        }
      />
    </>
  )
}
