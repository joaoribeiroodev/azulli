"use client"

import { useState, useTransition } from "react"
import { Building2, Loader2 } from "lucide-react"
import { toast } from "sonner"

import { saveCnpjAction } from "@/lib/billing/actions"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

function formatDocument(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 14)
  if (digits.length <= 11) {
    return digits
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d{1,2})$/, "$1-$2")
  }
  return digits
    .replace(/(\d{2})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1/$2")
    .replace(/(\d{4})(\d{1,2})$/, "$1-$2")
}

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function CnpjRequiredDialog({ open, onOpenChange, onSuccess }: Props) {
  const [value, setValue] = useState("")
  const [isPending, startTransition] = useTransition()

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setValue(formatDocument(e.target.value))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const digits = value.replace(/\D/g, "")
    if (digits.length !== 11 && digits.length !== 14) {
      toast.error("Informe um CPF (11 dígitos) ou CNPJ (14 dígitos) válido.")
      return
    }
    startTransition(async () => {
      const result = await saveCnpjAction(value)
      if (!result.success) {
        toast.error(result.error)
        return
      }
      setValue("")
      onOpenChange(false)
      onSuccess()
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-brand" />
            Informe o CNPJ/CPF da empresa
          </DialogTitle>
          <DialogDescription>
            O Asaas exige o documento para emitir cobranças. Após salvar, sua
            assinatura será processada automaticamente.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          <div className="space-y-1.5">
            <Label htmlFor="billing-cnpj">CNPJ ou CPF</Label>
            <Input
              id="billing-cnpj"
              type="text"
              inputMode="numeric"
              placeholder="00.000.000/0001-00"
              value={value}
              onChange={handleChange}
              autoFocus
              disabled={isPending}
            />
            <p className="text-xs text-muted-foreground">
              Salvo em Configurações → Empresa. Você pode editar lá a qualquer
              momento.
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-1">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="bg-brand hover:bg-brand-hover"
              disabled={isPending}
            >
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar e continuar
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
