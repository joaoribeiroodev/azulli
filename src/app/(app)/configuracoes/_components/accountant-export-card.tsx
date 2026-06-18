"use client"

import { useState } from "react"
import { FileSpreadsheet, Loader2, Download } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

async function downloadFromApi(format: "xlsx" | "json", month?: string) {
  const params = new URLSearchParams()
  if (format === "json") params.set("format", "json")
  if (month && /^\d{4}-\d{2}$/.test(month)) params.set("month", month)
  const qs = params.toString()
  const url = `/api/export/accountant${qs ? `?${qs}` : ""}`
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error("export_failed")
  }
  const blob = await res.blob()
  const disposition = res.headers.get("Content-Disposition") ?? ""
  const match = disposition.match(/filename="([^"]+)"/)
  const filename =
    match?.[1] ??
    (format === "json" ? "azulli_contador.json" : "azulli_contador.xlsx")

  const objectUrl = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = objectUrl
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(objectUrl)
}

export function AccountantExportCard({ month }: { month?: string }) {
  const [loading, setLoading] = useState<"xlsx" | "json" | null>(null)

  async function handleExport(format: "xlsx" | "json") {
    setLoading(format)
    try {
      await downloadFromApi(format, month)
      toast.success(
        format === "xlsx"
          ? "Excel baixado (lançamentos + resumo mensal)."
          : "JSON baixado."
      )
    } catch {
      toast.error("Não foi possível exportar o pacote.")
    } finally {
      setLoading(null)
    }
  }

  async function handlePackage() {
    setLoading("xlsx")
    try {
      await downloadFromApi("xlsx", month)
      await downloadFromApi("json", month)
      toast.success("Pacote completo baixado (Excel + JSON).")
    } catch {
      toast.error("Não foi possível exportar o pacote.")
    } finally {
      setLoading(null)
    }
  }

  return (
    <Card className="border-border/80">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileSpreadsheet className="h-5 w-5 text-brand" aria-hidden />
          Exportar para contador
        </CardTitle>
        <CardDescription>
          Baixe lançamentos e resumo do período em um clique — Excel com duas
          abas (lançamentos + resumo) e JSON. O mês selecionado no filtro abaixo
          é usado no resumo da exportação.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col sm:flex-row gap-3">
        <Button
          type="button"
          className="gap-2 bg-brand hover:bg-brand-hover"
          disabled={loading !== null}
          onClick={handlePackage}
        >
          {loading !== null ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          ) : (
            <Download className="h-4 w-4" aria-hidden />
          )}
          Pacote completo (Excel + JSON)
        </Button>
        <Button
          type="button"
          variant="outline"
          className="gap-2"
          disabled={loading !== null}
          onClick={() => handleExport("xlsx")}
        >
          Só Excel
        </Button>
      </CardContent>
    </Card>
  )
}
