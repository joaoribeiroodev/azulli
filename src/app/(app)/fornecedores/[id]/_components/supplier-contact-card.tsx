import { Mail, Phone, FileText, ExternalLink, StickyNote } from "lucide-react"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import type { SupplierDetail } from "@/lib/financial/queries"

export function SupplierContactCard({
  supplier,
}: {
  supplier: SupplierDetail
}) {
  const phoneDigits = supplier.phone?.replace(/\D/g, "")
  const whatsappUrl = phoneDigits
    ? `https://wa.me/${
        phoneDigits.startsWith("55") ? phoneDigits : `55${phoneDigits}`
      }`
    : null

  const hasAnyContact =
    !!supplier.email ||
    !!supplier.phone ||
    !!supplier.document ||
    !!supplier.notes

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Contato</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {!hasAnyContact && (
          <p className="text-sm text-muted-foreground py-2">
            Nenhuma informação cadastrada.
          </p>
        )}

        {supplier.email && (
          <>
            <a
              href={`mailto:${supplier.email}`}
              className="flex items-center gap-3 text-foreground hover:text-brand transition-colors group"
            >
              <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="flex-1 truncate">{supplier.email}</span>
              <ExternalLink className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </a>
            <Separator />
          </>
        )}

        {supplier.phone && (
          <>
            {whatsappUrl ? (
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 text-foreground hover:text-success-ink transition-colors group"
              >
                <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="flex-1">{supplier.phone}</span>
                <ExternalLink className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </a>
            ) : (
              <div className="flex items-center gap-3">
                <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                <span>{supplier.phone}</span>
              </div>
            )}
            <Separator />
          </>
        )}

        {supplier.document && (
          <>
            <div className="flex items-center gap-3 text-foreground">
              <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
              <span>{supplier.document}</span>
            </div>
            {supplier.notes && <Separator />}
          </>
        )}

        {supplier.notes && (
          <div className="flex items-start gap-3 text-foreground">
            <StickyNote className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
            <span className="text-sm text-muted-foreground italic">
              {supplier.notes}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
