import * as XLSX from "xlsx"
import { toast } from "sonner"

import { STATUS_LABEL } from "@/lib/finder/constants"
import { fmtDate } from "@/lib/finder/format"
import type { Lead } from "@/lib/finder/types"

type ExportOptions = {
  filenamePrefix?: string
}

export function exportLeadsExcel(
  leads: Lead[] | null | undefined,
  { filenamePrefix = "Azulli_Prospects" }: ExportOptions = {}
): void {
  if (!leads || leads.length === 0) {
    toast.warning("Nenhum lead para exportar.")
    return
  }

  const dados = leads.map((l, i) => ({
    "#": i + 1,
    Negócio: l.nome || "",
    Segmento: l.segmento || "",
    Porte: l.porte || "",
    Telefone: l.telefone || "",
    WhatsApp: l.whatsapp || "",
    "E-mail": l.email || "",
    Endereço: l.endereco || "",
    Cidade: l.cidade || "",
    UF: l.uf || "",
    "Avaliação Google": l.avaliacao ?? "",
    "ICP score": l.icp_score ?? "",
    Status: STATUS_LABEL[l.status] || l.status || "",
    Responsável: l.responsavel_nome || "",
    Website: l.website || "",
    Maps: l.maps_url || "",
    "Data prospecção": fmtDate(l.created_at),
  }))

  const ws = XLSX.utils.json_to_sheet(dados)
  ws["!cols"] = [
    { wch: 4 },
    { wch: 30 },
    { wch: 14 },
    { wch: 10 },
    { wch: 16 },
    { wch: 16 },
    { wch: 24 },
    { wch: 38 },
    { wch: 18 },
    { wch: 4 },
    { wch: 12 },
    { wch: 8 },
    { wch: 14 },
    { wch: 18 },
    { wch: 24 },
    { wch: 28 },
    { wch: 18 },
  ]
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, "Prospects")
  const stamp = new Date().toISOString().slice(0, 19).replace(/:/g, "-")
  XLSX.writeFile(wb, `${filenamePrefix}_${stamp}.xlsx`)
  toast.success(`${leads.length} lead(s) exportado(s) para Excel.`)
}
