import Link from "next/link"
import {
  Mail,
  Phone,
  FileText,
  Calendar,
  ExternalLink,
  Briefcase,
  Clock,
} from "lucide-react"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { formatDateBR } from "@/lib/utils/date"
import { formatWhatsAppBR } from "@/lib/utils/format"
import type { EmployeeDetail } from "@/lib/employees/payroll-queries"

export function EmployeeContactCard({ employee }: { employee: EmployeeDetail }) {
  const phoneDigits = employee.phone?.replace(/\D/g, "")
  const whatsappUrl = phoneDigits
    ? `https://wa.me/${
        phoneDigits.startsWith("55") ? phoneDigits : `55${phoneDigits}`
      }`
    : null

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Contato</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {!employee.email && !employee.phone && (
          <p className="text-sm text-muted-foreground py-2">
            Sem telefone ou e-mail cadastrado.
          </p>
        )}

        {employee.email && (
          <>
            <a
              href={`mailto:${employee.email}`}
              className="flex items-center gap-3 text-foreground hover:text-brand transition-colors group"
            >
              <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="flex-1 truncate">{employee.email}</span>
              <ExternalLink className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </a>
            <Separator />
          </>
        )}

        {employee.phone && (
          <>
            {whatsappUrl ? (
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 text-foreground hover:text-success-ink transition-colors group"
              >
                <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="flex-1">{formatWhatsAppBR(employee.phone)}</span>
                <ExternalLink className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </a>
            ) : (
              <div className="flex items-center gap-3">
                <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                <span>{employee.phone}</span>
              </div>
            )}
            <Separator />
          </>
        )}

        {employee.document && (
          <div className="flex items-center gap-3 text-foreground">
            <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
            <span>CPF {employee.document}</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export function EmployeeTenureCard({ employee }: { employee: EmployeeDetail }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Na empresa</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="flex items-center gap-3">
          <Briefcase className="h-4 w-4 text-muted-foreground shrink-0" />
          <div>
            <p className="font-medium">{employee.role ?? "Sem cargo definido"}</p>
            <p className="text-xs text-muted-foreground">Cargo</p>
          </div>
        </div>

        {employee.hire_date && (
          <>
            <Separator />
            <div className="flex items-center gap-3">
              <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
              <div>
                <p className="font-medium">{formatDateBR(employee.hire_date)}</p>
                <p className="text-xs text-muted-foreground">Data de admissão</p>
              </div>
            </div>
          </>
        )}

        {employee.tenureLabel && (
          <>
            <Separator />
            <div className="flex items-center gap-3">
              <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
              <div>
                <p className="font-medium">{employee.tenureLabel}</p>
                <p className="text-xs text-muted-foreground">Tempo de casa</p>
              </div>
            </div>
          </>
        )}

        <Separator />
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant={employee.is_active ? "secondary" : "outline"}>
            {employee.is_active ? "Ativo" : "Inativo"}
          </Badge>
          <span className="text-xs text-muted-foreground">
            Cadastrado em {formatDateBR(employee.created_at.slice(0, 10))}
          </span>
        </div>

        {employee.notes && (
          <>
            <Separator />
            <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap">
              {employee.notes}
            </p>
          </>
        )}

        <Separator />
        <Link
          href="/lancamentos?type=expense"
          className="text-xs font-medium text-brand hover:underline underline-offset-4"
        >
          Ver todas as despesas →
        </Link>
      </CardContent>
    </Card>
  )
}
