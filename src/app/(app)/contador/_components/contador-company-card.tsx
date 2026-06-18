import { Building2, Mail, MapPin, Phone } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { getAccountantCompanyProfile } from "@/lib/accountant/queries"

function formatDocument(doc: string | null): string | null {
  if (!doc) return null
  const digits = doc.replace(/\D/g, "")
  if (digits.length === 14) {
    return digits.replace(
      /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
      "$1.$2.$3/$4-$5"
    )
  }
  if (digits.length === 11) {
    return digits.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, "$1.$2.$3-$4")
  }
  return doc
}

export async function ContadorCompanyCard() {
  const company = await getAccountantCompanyProfile()
  if (!company) return null

  const doc = formatDocument(company.document)
  const location =
    company.cidade && company.uf
      ? `${company.cidade} — ${company.uf}`
      : company.cidade || company.uf

  return (
    <Card className="border-border/80">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Building2 className="h-5 w-5 text-brand" aria-hidden />
          Dados da empresa
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-semibold text-brand-ink text-lg">{company.name}</p>
          {company.taxRegime && (
            <Badge variant="secondary" className="font-normal">
              {company.taxRegime}
            </Badge>
          )}
          {company.businessType && (
            <Badge variant="outline" className="font-normal text-xs">
              {company.businessType}
            </Badge>
          )}
        </div>
        <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-2 text-muted-foreground">
          {doc && (
            <div>
              <dt className="text-xs uppercase tracking-wide">CNPJ / CPF</dt>
              <dd className="font-medium text-foreground mt-0.5">{doc}</dd>
            </div>
          )}
          {company.email && (
            <div className="flex items-start gap-2">
              <Mail className="h-4 w-4 shrink-0 mt-0.5" aria-hidden />
              <div>
                <dt className="text-xs uppercase tracking-wide">E-mail</dt>
                <dd className="font-medium text-foreground mt-0.5">
                  {company.email}
                </dd>
              </div>
            </div>
          )}
          {company.phone && (
            <div className="flex items-start gap-2">
              <Phone className="h-4 w-4 shrink-0 mt-0.5" aria-hidden />
              <div>
                <dt className="text-xs uppercase tracking-wide">Telefone</dt>
                <dd className="font-medium text-foreground mt-0.5">
                  {company.phone}
                </dd>
              </div>
            </div>
          )}
          {location && (
            <div className="flex items-start gap-2">
              <MapPin className="h-4 w-4 shrink-0 mt-0.5" aria-hidden />
              <div>
                <dt className="text-xs uppercase tracking-wide">Local</dt>
                <dd className="font-medium text-foreground mt-0.5">
                  {location}
                </dd>
              </div>
            </div>
          )}
        </dl>
      </CardContent>
    </Card>
  )
}
