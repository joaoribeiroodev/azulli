import { Mail, Phone, FileText, ExternalLink } from "lucide-react"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import type { CustomerDetail } from "@/lib/financial/queries"

export function CustomerContactCard({
  customer,
}: {
  customer: CustomerDetail
}) {
  const phoneDigits = customer.phone?.replace(/\D/g, "")
  const whatsappUrl = phoneDigits
    ? `https://wa.me/${
        phoneDigits.startsWith("55") ? phoneDigits : `55${phoneDigits}`
      }`
    : null

  const hasAnyContact =
    !!customer.email || !!customer.phone || !!customer.document

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Contato</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {!hasAnyContact && (
          <p className="text-sm text-muted-foreground py-2">
            Nenhuma informação de contato cadastrada.
          </p>
        )}

        {customer.email && (
          <>
            <a
              href={`mailto:${customer.email}`}
              className="flex items-center gap-3 text-foreground hover:text-brand transition-colors group"
            >
              <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="flex-1 truncate">{customer.email}</span>
              <ExternalLink className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </a>
            <Separator />
          </>
        )}

        {customer.phone && (
          <>
            {whatsappUrl ? (
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 text-foreground hover:text-success-ink transition-colors group"
              >
                <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="flex-1">{customer.phone}</span>
                <ExternalLink className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </a>
            ) : (
              <div className="flex items-center gap-3">
                <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                <span>{customer.phone}</span>
              </div>
            )}
            <Separator />
          </>
        )}

        {customer.document && (
          <div className="flex items-center gap-3 text-foreground">
            <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
            <span>{customer.document}</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
