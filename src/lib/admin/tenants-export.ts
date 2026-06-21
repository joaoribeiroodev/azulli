import "server-only"

import * as XLSX from "xlsx"

import {
  jsonToFormattedSheet,
  writeWorkbookBuffer,
} from "@/lib/export/xlsx-format"
import type { TenantDirectoryRow } from "@/lib/admin/tenant-directory"
import { formatDateInBR } from "@/lib/utils/date"

function tierLabel(tier: string): string {
  if (tier === "trial") return "Trial"
  if (tier === "pro") return "Pro"
  if (tier === "enterprise") return "Empresarial"
  return tier
}

function subscriptionStatusLabel(status: string): string {
  if (status === "active") return "Ativa"
  if (status === "past_due") return "Inadimplente"
  if (status === "canceled") return "Cancelada"
  return status
}

const EXPORT_HEADERS = [
  "Empresa",
  "Plano",
  "Status assinatura",
  "Trial até",
  "Cadastro",
  "E-mail owner",
  "Telefone",
  "E-mail empresa",
  "ID",
] as const

export function buildTenantsXlsxBuffer(rows: TenantDirectoryRow[]): Uint8Array {
  const sheetRows = rows.map((row) => ({
    Empresa: row.name,
    Plano: tierLabel(row.tier),
    "Status assinatura": subscriptionStatusLabel(row.subscriptionStatus),
    "Trial até": row.trialEndsAt ? row.trialEndsAt.slice(0, 10) : "",
    Cadastro: row.createdAt.slice(0, 10),
    "E-mail owner": row.ownerEmail ?? "",
    Telefone: row.ownerPhone ?? "",
    "E-mail empresa": row.tenantEmail ?? "",
    ID: row.id,
  }))

  const ws = jsonToFormattedSheet(sheetRows, [...EXPORT_HEADERS], {
    colWidths: [28, 12, 16, 12, 12, 28, 16, 28, 38],
    dateColumns: [3, 4],
    autofilter: true,
    freezeHeader: true,
  })

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, "Empresas")
  return writeWorkbookBuffer(wb)
}

export function tenantsExportFilename(date = new Date()): string {
  const stamp = formatDateInBR(date)
  return `azulli-empresas-${stamp}.xlsx`
}
