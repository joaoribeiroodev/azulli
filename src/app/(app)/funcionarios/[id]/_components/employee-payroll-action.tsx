"use client"

import { useState } from "react"
import { Banknote } from "lucide-react"

import { Button } from "@/components/ui/button"
import { TransactionDialog } from "@/components/app/transaction-dialog"
import {
  buildSalaryDescription,
  DEFAULT_PAYROLL_CATEGORY,
} from "@/lib/employees/payroll-match"
import type { EmployeeDetail } from "@/lib/employees/payroll-queries"

type Props = {
  employee: EmployeeDetail
  suppliers?: { id: string; name: string }[]
  recentExpenseCategories?: string[]
}

export function EmployeePayrollAction({
  employee,
  suppliers = [],
  recentExpenseCategories = [],
}: Props) {
  const [open, setOpen] = useState(false)

  if (!employee.is_active) return null

  const categories = [
    DEFAULT_PAYROLL_CATEGORY,
    ...recentExpenseCategories.filter((c) => c !== DEFAULT_PAYROLL_CATEGORY),
  ]

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        className="gap-2 bg-brand hover:bg-brand-hover shrink-0"
      >
        <Banknote className="h-4 w-4" aria-hidden />
        Registrar salário
      </Button>

      <TransactionDialog
        open={open}
        type="expense"
        onOpenChange={setOpen}
        suppliers={suppliers}
        defaultDescription={buildSalaryDescription(employee.name)}
        defaultCategory={DEFAULT_PAYROLL_CATEGORY}
        defaultAmount={employee.salary ?? null}
        recentCategories={categories}
      />
    </>
  )
}
