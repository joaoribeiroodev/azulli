import { ImportWizard } from "./_components/import-wizard"
import { BackLink } from "@/components/app/back-link"

export const metadata = { title: "Importar extrato OFX — Azulli" }

export default function ImportarPage() {
  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
      <div>
        <BackLink href="/lancamentos" className="mb-2">
          Voltar para lançamentos
        </BackLink>
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
