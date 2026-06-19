"use client"

import { useRef, useState, useTransition, useMemo } from "react"
import { useRouter } from "next/navigation"
import {
  Upload,
  FileText,
  Loader2,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  ArrowDownRight,
  ArrowUpRight,
} from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  TransactionDetailDialog,
  type TransactionDetailData,
} from "@/components/app/transaction-detail-dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

import { formatBRL } from "@/lib/utils/currency"
import { formatDateBR } from "@/lib/utils/date"
import {
  parseOfxAction,
  confirmImportAction,
  discardImportBatchAction,
  type ParseOfxResult,
} from "@/lib/imports/actions"

type Step = "upload" | "review"

type EditableRow = {
  rowId: string
  fitId: string
  type: "income" | "expense"
  amount: number
  date: string
  description: string
  category: string
  duplicate: boolean
  selected: boolean
}

const MAX_FILE_SIZE_MB = 5

export function ImportWizard() {
  const [step, setStep] = useState<Step>("upload")
  const [parseData, setParseData] = useState<ParseOfxResult | null>(null)
  const [rows, setRows] = useState<EditableRow[]>([])
  const [isParsing, startParse] = useTransition()
  const [isConfirming, startConfirm] = useTransition()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  function handleFileSelected(file: File) {
    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      toast.error(`Arquivo muito grande. Máximo ${MAX_FILE_SIZE_MB}MB.`)
      return
    }

    const formData = new FormData()
    formData.append("file", file)

    startParse(async () => {
      const result = await parseOfxAction(formData)
      if (!result.success) {
        toast.error(result.error)
        return
      }
      setParseData(result.data)
      setRows(
        result.data.rows.map((r) => ({
          rowId: r.rowId,
          fitId: r.fitId,
          type: r.type,
          amount: r.amount,
          date: r.date,
          description: r.description,
          category: r.suggestedCategory ?? "",
          duplicate: r.duplicate,
          selected: !r.duplicate,
        }))
      )
      setStep("review")
    })
  }

  function handleConfirm() {
    if (!parseData) return
    const selected = rows.filter((r) => r.selected && !r.duplicate)
    if (selected.length === 0) {
      toast.error("Selecione pelo menos um lançamento.")
      return
    }
    setConfirmOpen(false)

    startConfirm(async () => {
      const result = await confirmImportAction({
        batchId: parseData.batchId,
        rows: selected.map((r) => ({
          rowId: r.rowId,
          fitId: r.fitId,
          type: r.type,
          amount: r.amount,
          date: r.date,
          description: r.description,
          category: r.category.trim() || null,
        })),
      })
      if (!result.success) {
        toast.error(result.error)
        return
      }
      toast.success(
        `${result.data.imported} lançamento${result.data.imported === 1 ? "" : "s"} importado${result.data.imported === 1 ? "" : "s"}! 🎉`
      )
      router.push("/lancamentos")
    })
  }

  async function handleStartOver() {
    if (parseData) {
      void discardImportBatchAction(parseData.batchId)
    }
    setParseData(null)
    setRows([])
    setStep("upload")
  }

  if (step === "upload") {
    return (
      <UploadStep
        isParsing={isParsing}
        onFile={handleFileSelected}
        inputRef={fileInputRef}
      />
    )
  }

  return (
    <>
      <ReviewStep
        parseData={parseData!}
        rows={rows}
        setRows={setRows}
        isConfirming={isConfirming}
        onConfirm={() => setConfirmOpen(true)}
        onStartOver={handleStartOver}
      />
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar importação?</AlertDialogTitle>
            <AlertDialogDescription>
              Vamos criar {rows.filter((r) => r.selected && !r.duplicate).length}{" "}
              lançamentos no seu Azulli, todos com status &quot;Pago&quot;.
              Você pode editar ou excluir cada um depois.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirm}>
              Importar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

// ---------------------------------------------------------------------------
// Step 1 — Upload
// ---------------------------------------------------------------------------

function UploadStep({
  isParsing,
  onFile,
  inputRef,
}: {
  isParsing: boolean
  onFile: (file: File) => void
  inputRef: React.RefObject<HTMLInputElement | null>
}) {
  const [dragOver, setDragOver] = useState(false)

  return (
    <Card>
      <CardContent className="p-4 sm:p-8">
        <div
          onDragOver={(e) => {
            e.preventDefault()
            setDragOver(true)
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault()
            setDragOver(false)
            const file = e.dataTransfer.files?.[0]
            if (file) onFile(file)
          }}
          className={`relative flex flex-col items-center justify-center gap-4 border-2 border-dashed rounded-xl min-h-[min(320px,50vh)] w-full p-8 sm:p-12 text-center transition-colors ${
            dragOver
              ? "border-brand bg-brand-soft/40"
              : "border-border hover:border-brand/40 hover:bg-muted/30"
          }`}
        >
          <input
            ref={inputRef}
            id="ofx-file"
            type="file"
            accept=".ofx,.qfx"
            disabled={isParsing}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) onFile(file)
              e.target.value = ""
            }}
          />
          {isParsing ? (
            <>
              <Loader2 className="h-10 w-10 text-brand animate-spin pointer-events-none" />
              <div className="pointer-events-none">
                <p className="font-medium">Lendo seu extrato…</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Categorizando automaticamente com IA. Pode levar alguns segundos.
                </p>
              </div>
            </>
          ) : (
            <>
              <div className="h-14 w-14 rounded-full bg-brand-soft flex items-center justify-center pointer-events-none">
                <Upload className="h-6 w-6 text-brand" />
              </div>
              <div className="pointer-events-none">
                <p className="font-medium">
                  Arraste o arquivo OFX aqui ou toque para selecionar
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Aceita .ofx e .qfx até {MAX_FILE_SIZE_MB}MB
                </p>
              </div>
              <span
                className="pointer-events-none inline-flex items-center justify-center rounded-md border border-input bg-background px-3 py-1.5 text-sm font-medium shadow-xs"
              >
                Selecionar arquivo
              </span>
            </>
          )}
        </div>

        <div className="mt-6 grid sm:grid-cols-3 gap-3 text-sm text-muted-foreground">
          <div className="flex gap-2">
            <Sparkles className="h-4 w-4 text-brand shrink-0 mt-0.5" />
            <span>
              <strong className="text-foreground">Categorização IA</strong>
              <br />
              Aprende com seus lançamentos antigos.
            </span>
          </div>
          <div className="flex gap-2">
            <CheckCircle2 className="h-4 w-4 text-success-ink shrink-0 mt-0.5" />
            <span>
              <strong className="text-foreground">Sem duplicação</strong>
              <br />
              Detectamos e ignoramos linhas já importadas.
            </span>
          </div>
          <div className="flex gap-2">
            <FileText className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
            <span>
              <strong className="text-foreground">Você revisa</strong>
              <br />
              Edita categoria e desmarca o que não quiser importar.
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Step 2 — Review
// ---------------------------------------------------------------------------

function ReviewStep({
  parseData,
  rows,
  setRows,
  isConfirming,
  onConfirm,
  onStartOver,
}: {
  parseData: ParseOfxResult
  rows: EditableRow[]
  setRows: (rows: EditableRow[]) => void
  isConfirming: boolean
  onConfirm: () => void
  onStartOver: () => void
}) {
  const { statement } = parseData
  const [monthFilter, setMonthFilter] = useState<string>("all")
  const [detailRow, setDetailRow] = useState<TransactionDetailData | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)

  const monthOptions = useMemo(() => {
    const fmt = new Intl.DateTimeFormat("pt-BR", {
      month: "long",
      year: "numeric",
    })
    const months = Array.from(
      new Set(rows.map((r) => r.date.slice(0, 7)))
    ).sort()
    return months.map((value) => {
      const [y, m] = value.split("-").map(Number)
      const label = fmt
        .format(new Date(y, m - 1, 1))
        .replace(/^\w/, (c) => c.toUpperCase())
      return { value, label }
    })
  }, [rows])

  const rowDateRange = useMemo(() => {
    if (rows.length === 0) return null
    const sorted = [...rows].map((r) => r.date).sort()
    return { start: sorted[0], end: sorted[sorted.length - 1] }
  }, [rows])

  const displayRows =
    monthFilter === "all"
      ? rows
      : rows.filter((r) => r.date.startsWith(monthFilter))

  const selectableRows = displayRows.filter((r) => !r.duplicate)
  const selectedCount = selectableRows.filter((r) => r.selected).length
  const allSelected =
    selectableRows.length > 0 && selectedCount === selectableRows.length

  function toggleAll(checked: boolean) {
    const visibleIds = new Set(displayRows.map((r) => r.rowId))
    setRows(
      rows.map((r) =>
        visibleIds.has(r.rowId) && !r.duplicate
          ? { ...r, selected: checked }
          : r
      )
    )
  }

  function patchRow(rowId: string, patch: Partial<EditableRow>) {
    setRows(rows.map((r) => (r.rowId === rowId ? { ...r, ...patch } : r)))
  }

  function openDetail(row: EditableRow) {
    setDetailRow({
      type: row.type,
      amount: row.amount,
      status: "paid",
      due_date: row.date,
      paid_at: row.date,
      description: row.description,
      category: row.category || null,
      source: "ofx_import",
    })
    setDetailOpen(true)
  }

  const periodLabel =
    rowDateRange
      ? `${formatDateBR(rowDateRange.start)} a ${formatDateBR(rowDateRange.end)}`
      : statement.periodStart && statement.periodEnd
        ? `${formatDateBR(statement.periodStart)} a ${formatDateBR(statement.periodEnd)}`
        : "Período não informado"

  return (
    <div className="space-y-4">
      {/* Resumo do extrato */}
      <Card>
        <CardContent className="p-5">
          <div className="flex items-start gap-4 flex-wrap">
            <div className="h-10 w-10 rounded-full bg-brand-soft flex items-center justify-center shrink-0">
              <FileText className="h-5 w-5 text-brand" />
            </div>
            <div className="flex-1 min-w-[200px]">
              <p className="font-medium text-sm break-all">
                {statement.fileName}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {statement.bankId && `Banco ${statement.bankId} · `}
                {statement.accountId && `Conta ${statement.accountId} · `}
                {periodLabel}
              </p>
            </div>
            <div className="grid grid-cols-3 gap-2 sm:gap-4 text-center w-full sm:w-auto">
              <Stat label="No filtro" value={displayRows.length} />
              <Stat
                label="Duplicados"
                value={displayRows.filter((r) => r.duplicate).length}
                muted
              />
              <Stat label="Selecionados" value={selectedCount} highlight />
            </div>
          </div>
        </CardContent>
      </Card>

      {monthOptions.length > 1 && (
        <div className="flex flex-wrap items-center gap-3">
          <Label className="text-sm text-muted-foreground shrink-0">
            Filtrar por mês do extrato
          </Label>
          <Select value={monthFilter} onValueChange={setMonthFilter}>
            <SelectTrigger className="w-full max-w-[220px]">
              <SelectValue placeholder="Todos os meses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os meses</SelectItem>
              {monthOptions.map((m) => (
                <SelectItem key={m.value} value={m.value}>
                  {m.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {monthFilter !== "all" && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setMonthFilter("all")}
            >
              Limpar filtro
            </Button>
          )}
        </div>
      )}

      {/* Aviso de duplicatas */}
      {statement.totalDuplicates > 0 && (
        <div className="flex gap-3 items-start rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm">
          <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-amber-900">
            <strong>{statement.totalDuplicates} lançamento(s) já importados</strong>{" "}
            antes — vão aparecer marcados e não serão duplicados.
          </p>
        </div>
      )}

      {/* Tabela de revisão */}
      <Card>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={allSelected}
                    onCheckedChange={(c) => toggleAll(Boolean(c))}
                    aria-label="Selecionar todos"
                  />
                </TableHead>
                <TableHead className="w-12"></TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead className="w-32">Data</TableHead>
                <TableHead className="w-48">Categoria</TableHead>
                <TableHead className="text-right w-32">Valor</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayRows.map((row) => {
                const isIncome = row.type === "income"
                const Icon = isIncome ? ArrowUpRight : ArrowDownRight
                return (
                  <TableRow
                    key={row.rowId}
                    className={
                      row.duplicate
                        ? "opacity-50 bg-muted/30"
                        : !row.selected
                          ? "opacity-60"
                          : ""
                    }
                  >
                    <TableCell>
                      <Checkbox
                        checked={row.selected}
                        disabled={row.duplicate}
                        onCheckedChange={(c) =>
                          patchRow(row.rowId, { selected: Boolean(c) })
                        }
                        aria-label="Importar este lançamento"
                      />
                    </TableCell>
                    <TableCell>
                      <div
                        className={`h-7 w-7 rounded-full flex items-center justify-center ${
                          isIncome
                            ? "bg-success-soft text-success-ink"
                            : "bg-red-50 text-destructive dark:bg-red-950/40"
                        }`}
                      >
                        <Icon className="h-3.5 w-3.5" />
                      </div>
                    </TableCell>
                    <TableCell className="max-w-[280px]">
                      <p className="text-sm font-medium truncate">
                        {row.description}
                      </p>
                      {row.description.length > 48 && (
                        <button
                          type="button"
                          onClick={() => openDetail(row)}
                          className="text-xs text-brand hover:underline mt-0.5"
                        >
                          Ver detalhes
                        </button>
                      )}
                      {row.duplicate && (
                        <Badge
                          variant="secondary"
                          className="mt-1 bg-amber-100 text-amber-800 hover:bg-amber-100"
                        >
                          Já importado
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground whitespace-nowrap text-sm">
                      {formatDateBR(row.date)}
                    </TableCell>
                    <TableCell>
                      <Input
                        value={row.category}
                        disabled={row.duplicate || !row.selected}
                        placeholder="Sem categoria"
                        onChange={(e) =>
                          patchRow(row.rowId, { category: e.target.value })
                        }
                        className="h-8 text-sm"
                      />
                    </TableCell>
                    <TableCell
                      className={`text-right font-semibold whitespace-nowrap ${
                        isIncome ? "text-success-ink" : "text-foreground"
                      }`}
                    >
                      {isIncome ? "+" : "-"} {formatBRL(row.amount)}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Footer ações */}
      <div className="flex items-center justify-between gap-3 flex-wrap sticky bottom-4 bg-background/95 backdrop-blur p-4 rounded-xl border shadow-sm">
        <Button
          variant="ghost"
          onClick={onStartOver}
          disabled={isConfirming}
        >
          Trocar arquivo
        </Button>
        <Button
          onClick={onConfirm}
          disabled={selectedCount === 0 || isConfirming}
        >
          {isConfirming ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Importando…
            </>
          ) : (
            <>
              Importar {selectedCount} lançamento
              {selectedCount === 1 ? "" : "s"}
            </>
          )}
        </Button>
      </div>

      <TransactionDetailDialog
        open={detailOpen}
        onOpenChange={setDetailOpen}
        transaction={detailRow}
      />
    </div>
  )
}

function Stat({
  label,
  value,
  muted,
  highlight,
}: {
  label: string
  value: number
  muted?: boolean
  highlight?: boolean
}) {
  return (
    <div>
      <p
        className={`text-2xl font-display font-bold tabular-nums ${
          highlight
            ? "text-brand"
            : muted
              ? "text-muted-foreground"
              : "text-foreground"
        }`}
      >
        {value}
      </p>
      <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
    </div>
  )
}
