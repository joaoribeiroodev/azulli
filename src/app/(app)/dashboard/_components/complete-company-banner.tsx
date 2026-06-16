import Link from "next/link"
import { Building2, ChevronRight } from "lucide-react"
import { createClient } from "@/lib/supabase/server"

/**
 * Banner que aparece apenas se o tenant não tem CNPJ/documento preenchido.
 * Some automaticamente assim que o usuário completa os dados em /configuracoes.
 * Não tem botão "Dispensar" (proposital — é importante completar).
 */
export async function CompleteCompanyBanner() {
  const supabase = await createClient()
  const { data: tenant } = await supabase
    .from("tenants")
    .select("document")
    .limit(1)
    .maybeSingle()

  // Se já tem CNPJ/CPF preenchido, banner some
  if (tenant?.document) return null

  return (
    <Link
      href="/configuracoes"
      className="block group rounded-xl border border-brand/30 bg-brand-soft/40 hover:bg-brand-soft transition-colors p-4"
    >
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-full bg-brand text-primary-foreground flex items-center justify-center shrink-0">
          <Building2 className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-brand-ink">
            Complete os dados da sua empresa
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            CNPJ/CPF e regime tributário são necessários para emitir notas
            fiscais e ativar todas as funcionalidades.
          </p>
        </div>
        <ChevronRight className="h-5 w-5 text-brand shrink-0 group-hover:translate-x-0.5 transition-transform" />
      </div>
    </Link>
  )
}
