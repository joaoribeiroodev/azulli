import * as XLSX from "xlsx"

export type FormattedSheetOptions = {
  /** Column widths in characters */
  colWidths?: number[]
  /** Column index (0-based) for BRL currency format */
  currencyColumns?: number[]
  /** Column index for date strings (YYYY-MM-DD) */
  dateColumns?: number[]
  autofilter?: boolean
  freezeHeader?: boolean
}

const BRL_FORMAT = '"R$" #,##0.00'
const DATE_FORMAT = "dd/mm/yyyy"

const DEFAULT_WIDTHS = [12, 36, 22, 24, 24, 14, 12, 12, 14, 18]

/**
 * Formata worksheet SheetJS: larguras, BRL, datas, autofilter, freeze.
 */
export function formatWorksheet(
  ws: XLSX.WorkSheet,
  options: FormattedSheetOptions = {}
): void {
  const range = XLSX.utils.decode_range(ws["!ref"] ?? "A1")
  const currencyCols = options.currencyColumns ?? []
  const dateCols = options.dateColumns ?? []
  const colWidths = options.colWidths ?? DEFAULT_WIDTHS

  ws["!cols"] = colWidths.map((wch) => ({ wch }))

  for (let R = 1; R <= range.e.r; R++) {
    for (const c of currencyCols) {
      const addr = XLSX.utils.encode_cell({ c, r: R })
      const cell = ws[addr]
      if (cell && typeof cell.v === "number") {
        cell.z = BRL_FORMAT
        cell.t = "n"
      }
    }
    for (const c of dateCols) {
      const addr = XLSX.utils.encode_cell({ c, r: R })
      const cell = ws[addr]
      if (cell && cell.v) {
        const str = String(cell.v)
        if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
          cell.v = str.slice(0, 10)
          cell.z = DATE_FORMAT
        }
      }
    }
  }

  if (options.autofilter) {
    ws["!autofilter"] = {
      ref: XLSX.utils.encode_range({
        s: { c: 0, r: 0 },
        e: { c: range.e.c, r: range.e.r },
      }),
    }
  }

  if (options.freezeHeader) {
    ws["!freeze"] = { xSplit: 0, ySplit: 1 }
  }
}

export function writeWorkbookBuffer(wb: XLSX.WorkBook): Uint8Array {
  const buffer = XLSX.write(wb, {
    type: "buffer",
    bookType: "xlsx",
    compression: true,
  }) as Buffer
  return new Uint8Array(buffer)
}

export function jsonToFormattedSheet(
  rows: Record<string, unknown>[],
  headers: string[],
  formatOptions: FormattedSheetOptions
): XLSX.WorkSheet {
  const ws = XLSX.utils.json_to_sheet(rows, { header: headers })
  formatWorksheet(ws, formatOptions)
  return ws
}

export const XLSX_BRL_FORMAT = BRL_FORMAT
