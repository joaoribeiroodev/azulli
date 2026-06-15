import { Mail, Phone, FileText, Calendar, Wallet, StickyNote } from "lucide-react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { formatBRL } from "@/lib/utils/currency"
import { formatDateBR } from "@/lib/utils/date"
import { formatWhatsAppBR } from "@/lib/utils/format"
import type { EmployeeRow } from "@/lib/employees/queries"

export function EmployeeInfoCard({ employee }: { employee: EmployeeRow }) {
  const hasContact = !!(employee.email || employee.phone)
  const hasPersonal = !!(employee.document || employee.hire_date)
  const hasFinancial = employee.salary !== null
  const hasNotes = !!employee.notes

  if (!hasContact && !hasPersonal && !hasFinancial && !hasNotes) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Informações</CardTitle>
          <CardDescription>Sem dados adicionais cadastrados.</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Informações</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {hasContact && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Contato
            </p>
            {employee.email && (
              <Button
                variant="ghost"
                size="sm"
                asChild
                className="w-full justify-start gap-2 h-auto py-2 px-2 -ml-2"
              >
                <a href={`mailto:${employee.email}`}>
                  <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-sm truncate">{employee.email}</span>
                </a>
              </Button>
            )}
            {employee.phone && (
              <Button
                variant="ghost"
                size="sm"
                asChild
                className="w-full justify-start gap-2 h-auto py-2 px-2 -ml-2"
              >
                <a
                  href={`https://wa.me/55${employee.phone.replace(/\D/g, "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-sm">
                    {formatWhatsAppBR(employee.phone)}
                  </span>
                </a>
              </Button>
            )}
          </div>
        )}

        {hasPersonal && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Dados pessoais
            </p>
            {employee.document && (
              <div className="flex items-center gap-2 text-sm">
                <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                <span>CPF: {employee.document}</span>
              </div>
            )}
            {employee.hire_date && (
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                <span>Admissão: {formatDateBR(employee.hire_date)}</span>
              </div>
            )}
          </div>
        )}

        {hasFinancial && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Folha de pagamento
            </p>
            <div className="flex items-center gap-2 text-sm">
              <Wallet className="h-4 w-4 text-success-ink shrink-0" />
              <span>
                Salário:{" "}
                <span className="font-semibold text-foreground">
                  {formatBRL(employee.salary!)}
                </span>
              </span>
            </div>
          </div>
        )}

        {hasNotes && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Observações
            </p>
            <div className="flex items-start gap-2 text-sm">
              <StickyNote className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
              <p className="text-sm text-foreground whitespace-pre-wrap">
                {employee.notes}
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
