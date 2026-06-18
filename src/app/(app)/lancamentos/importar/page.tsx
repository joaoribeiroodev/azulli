import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ImportWizard } from "./_components/import-wizard"

export const metadata = { title: "Importar extrato OFX — Azulli" }

export default function ImportarPage() {
  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
      <div>
        <Button variant="ghost" size="sm" asChild className="-ml-2 mb-2">
          <Link href="/lancamentos">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Voltar para lançamentos
          </Link>
        </Button>
        <h1 className="text-2xl lg:text-3xl font-display font-bold text-brand-ink">
          Importar extrato bancário
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Envie o arquivo OFX exportado do seu banco. Categorizamos
          automaticamente e você confirma antes de importar.
        </p>
      </div>

      <ImportWizard />
    </div>
  )
}
