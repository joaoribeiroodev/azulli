"use client"

import Link from "next/link"
import { useState, useTransition, type ReactNode } from "react"
import {
  ExternalLink,
  Loader2,
  Mail,
  CheckCircle2,
  XCircle,
  SkipForward,
  Clock,
  Sparkles,
  Send,
  AlertTriangle,
  Check,
  MailX,
  type LucideIcon,
} from "lucide-react"
import { toast } from "sonner"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { formatDateBR } from "@/lib/utils/date"
import { updateEmailPreferencesAction } from "@/lib/email/actions"
import { EnterpriseFeatureUpsell } from "@/components/app/enterprise-feature-upsell"
import type { EmailPreferences } from "@/lib/email/types"
import type { EmailLogRow } from "@/lib/email/queries"

type Props = {
  preferences: EmailPreferences
  logs: EmailLogRow[]
  userEmail: string
  automatedEmailsAllowed: boolean
}
type PrefKey =
  | "weekly_insights_enabled"
  | "collection_reminders_enabled"
  | "overdue_alerts_enabled"

type LocalPrefs = Record<PrefKey, boolean>

type NotificationOption = {
  key: PrefKey
  title: string
  description: string
  schedule?: string
  comingSoon?: boolean
  enterpriseOnly?: boolean
  icon: LucideIcon
  extra?: ReactNode
}
const NOTIFICATION_OPTIONS: NotificationOption[] = [
  {
    key: "weekly_insights_enabled",
    title: "Insights semanais",
    description:
      "Resumo da semana com receitas, gastos e o alerta mais importante para agir.",
    schedule: "Toda segunda-feira, por volta das 8h",
    enterpriseOnly: true,
    icon: Sparkles,
  },
  {
    key: "collection_reminders_enabled",
    title: "Lembretes de cobrança",
    description:
      "Avisa sobre recebimentos vencidos e o que vence em 3 dias — para você cobrar clientes.",
    schedule: "Todos os dias, por volta das 9h",
    enterpriseOnly: true,
    icon: Send,
  },
  {
    key: "overdue_alerts_enabled",
    title: "Alertas de vencidos",
    description:
      "Email quando um lançamento passa do prazo sem ser pago ou recebido.",
    schedule: "Todos os dias, por volta das 10h",
    enterpriseOnly: true,
    icon: AlertTriangle,
  },
]
export function NotificationsTab({
  preferences,
  logs,
  userEmail,
  automatedEmailsAllowed,
}: Props) {  const [prefs, setPrefs] = useState<LocalPrefs>({
    weekly_insights_enabled: preferences.weekly_insights_enabled,
    collection_reminders_enabled: preferences.collection_reminders_enabled,
    overdue_alerts_enabled: preferences.overdue_alerts_enabled,
  })
  const [savingKey, setSavingKey] = useState<PrefKey | null>(null)
  const [, startTransition] = useTransition()

  const availableOptions = NOTIFICATION_OPTIONS.filter((o) => !o.comingSoon)
  const activeAvailableCount = availableOptions.filter((o) => prefs[o.key]).length
  const activeOptions = NOTIFICATION_OPTIONS.filter(
    (o) => prefs[o.key] && !o.comingSoon
  )

  function persist(key: PrefKey, next: LocalPrefs, rollback: LocalPrefs) {
    const option = NOTIFICATION_OPTIONS.find((o) => o.key === key)
    setSavingKey(key)
    startTransition(async () => {
      const result = await updateEmailPreferencesAction(next)
      setSavingKey(null)
      if (!result.success) {
        toast.error(result.error)
        setPrefs(rollback)
        return
      }
      if (next[key]) {
        toast.success(`${option?.title} ativado`, {
          description: `Você receberá em ${userEmail}.`,
        })
      } else {
        toast.success(`${option?.title} desativado`, {
          description: "Não enviaremos mais esse tipo de email.",
        })
      }
    })
  }

  function toggle(key: PrefKey, value: boolean) {
    const option = NOTIFICATION_OPTIONS.find((o) => o.key === key)
    if (option?.comingSoon || savingKey) return
    if (option?.enterpriseOnly && !automatedEmailsAllowed) return
    const rollback = prefs
    const next = { ...prefs, [key]: value }
    setPrefs(next)
    persist(key, next, rollback)
  }

  function openPreview() {
    window.open("/api/email/preview/weekly-insights", "_blank")
  }

  return (
    <div className="space-y-4" id="weekly-insights">
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Mail className="h-4 w-4 text-brand" />
            Notificações por email
          </CardTitle>
          <CardDescription>
            Escolha o que quer receber. Cada alteração é salva automaticamente.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!automatedEmailsAllowed && (
            <EnterpriseFeatureUpsell feature="emails" />
          )}

          <EmailSummary            userEmail={userEmail}
            activeCount={activeAvailableCount}
            totalAvailable={availableOptions.length}
            activeOptions={activeOptions}
            lastWeeklySentAt={preferences.weekly_insights_last_sent_at}
            weeklyEnabled={prefs.weekly_insights_enabled}
          />

          <div className="space-y-3">
            {NOTIFICATION_OPTIONS.map((option) => (
              <NotificationOptionCard
                key={option.key}
                option={{
                  ...option,
                  extra:
                    option.key === "weekly_insights_enabled"
                      ? (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              openPreview()
                            }}
                            disabled={!automatedEmailsAllowed}
                            className="gap-1.5 mt-2.5"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                            Ver exemplo do email
                          </Button>
                        )
                      : undefined,
                }}
                checked={prefs[option.key]}
                saving={savingKey === option.key}
                disabled={savingKey !== null && savingKey !== option.key}
                enterpriseLocked={
                  option.enterpriseOnly && !automatedEmailsAllowed
                }
                onToggle={(value) => toggle(option.key, value)}
              />
            ))}          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Histórico de envios</CardTitle>
          <CardDescription>
            Últimos {logs.length || "0"}{" "}
            {logs.length === 1 ? "email" : "emails"} disparados pra você.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              Nenhum envio registrado ainda.
            </p>
          ) : (
            <ul className="divide-y">
              {logs.map((log) => (
                <LogItem key={log.id} log={log} />
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------

function EmailSummary({
  userEmail,
  activeCount,
  totalAvailable,
  activeOptions,
  lastWeeklySentAt,
  weeklyEnabled,
}: {
  userEmail: string
  activeCount: number
  totalAvailable: number
  activeOptions: NotificationOption[]
  lastWeeklySentAt: string | null
  weeklyEnabled: boolean
}) {
  const noneActive = activeCount === 0

  return (
    <div
      className={cn(
        "rounded-xl border-2 p-4 transition-colors",
        noneActive
          ? "border-border bg-muted/30"
          : "border-brand/30 bg-brand-soft/20"
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
            noneActive
              ? "bg-muted text-muted-foreground"
              : "bg-brand text-white"
          )}
        >
          {noneActive ? (
            <MailX className="h-5 w-5" />
          ) : (
            <Mail className="h-5 w-5" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground">
            {noneActive
              ? "Você não recebe emails do Azulli"
              : `${activeCount} de ${totalAvailable} notificações ativas`}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5 truncate">
            Destino: <span className="font-medium">{userEmail}</span>
          </p>

          {activeOptions.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2.5">
              {activeOptions.map((opt) => (
                <Badge
                  key={opt.key}
                  variant="secondary"
                  className="bg-success-soft text-success-ink border-0 gap-1"
                >
                  <Check className="h-3 w-3" />
                  {opt.title}
                </Badge>
              ))}
            </div>
          )}

          {weeklyEnabled && lastWeeklySentAt && (
            <p className="text-[11px] text-muted-foreground mt-2 flex items-center gap-1">
              <Clock className="h-3 w-3 shrink-0" />
              Último insight semanal:{" "}
              {formatDateBR(lastWeeklySentAt.split("T")[0])}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Option card
// ---------------------------------------------------------------------------

function NotificationOptionCard({
  option,
  checked,
  saving,
  disabled,
  enterpriseLocked,
  onToggle,
}: {
  option: NotificationOption
  checked: boolean
  saving: boolean
  disabled?: boolean
  enterpriseLocked?: boolean
  onToggle: (value: boolean) => void
}) {
  const { title, description, schedule, comingSoon, icon: Icon, extra } = option
  const locked = comingSoon || enterpriseLocked
  const isActive = checked && !locked
  function handleCardActivate() {
    if (locked || saving || disabled) return
    onToggle(!checked)
  }

  return (
    <div
      role={locked ? undefined : "button"}
      tabIndex={locked ? undefined : 0}
      aria-pressed={locked ? undefined : isActive}
      aria-disabled={locked || disabled}
      onClick={handleCardActivate}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          handleCardActivate()
        }
      }}
      className={cn(
        "rounded-xl border-2 p-4 transition-all outline-none",
        comingSoon && "border-dashed border-border bg-muted/20 cursor-default",
        enterpriseLocked &&
          !comingSoon &&
          "border-dashed border-border/80 bg-muted/15 cursor-default",
        !locked && "cursor-pointer focus-visible:ring-2 focus-visible:ring-brand/40",
        !locked &&
          isActive &&
          "border-brand bg-brand-soft/25 shadow-sm",
        !locked &&
          !isActive &&
          "border-border bg-card hover:border-brand/30",
        (saving || disabled) && !locked && "pointer-events-none opacity-80"
      )}
    >      <div className="flex items-start gap-3">
        <div
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-colors",
            locked && "bg-muted text-muted-foreground",
            !locked &&
              isActive &&
              "bg-brand text-white",
            !locked &&
              !isActive &&
              "bg-muted text-muted-foreground"
          )}
        >
          <Icon className="h-5 w-5" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center flex-wrap gap-x-2 gap-y-1">
            <h3 className="text-sm font-semibold leading-tight">{title}</h3>
            <StatusBadge
              comingSoon={comingSoon}
              enterpriseLocked={enterpriseLocked}
              isActive={isActive}
              saving={saving}
            />          </div>

          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
            {description}
          </p>

          {schedule && !comingSoon && isActive && (
            <p
              className="text-xs text-brand font-medium mt-2 flex items-center gap-1.5"
            >
              <Clock className="h-3.5 w-3.5 shrink-0" />
              {schedule}
            </p>
          )}

          {enterpriseLocked && !comingSoon && (
            <p className="text-[11px] text-muted-foreground mt-2">
              Disponível no plano Empresarial —{" "}
              <Link
                href="/billing?upsell=emails"
                className="font-medium text-brand hover:underline underline-offset-4"
              >
                ver planos
              </Link>
              .
            </p>
          )}

          {comingSoon && (            <p className="text-[11px] text-muted-foreground mt-2">
              Disponível em uma atualização futura — o toggle está desativado
              por enquanto.
            </p>
          )}

          {extra}
        </div>

        <div
          className="shrink-0 pt-0.5"
          onClick={(e) => e.stopPropagation()}
        >
          <Switch
            checked={checked}
            onCheckedChange={onToggle}
            disabled={locked || saving || disabled}
            aria-label={`${isActive ? "Desativar" : "Ativar"} ${title}`}
          />        </div>
      </div>
    </div>
  )
}

function StatusBadge({
  comingSoon,
  enterpriseLocked,
  isActive,
  saving,
}: {
  comingSoon?: boolean
  enterpriseLocked?: boolean
  isActive: boolean
  saving: boolean
}) {  if (saving) {
    return (
      <Badge variant="outline" className="gap-1 text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin" />
        Salvando
      </Badge>
    )
  }

  if (comingSoon) {
    return (
      <Badge variant="secondary" className="bg-muted text-muted-foreground">
        Em breve
      </Badge>
    )
  }

  if (enterpriseLocked) {
    return (
      <Badge variant="secondary" className="bg-muted text-muted-foreground">
        Empresarial
      </Badge>
    )
  }
  if (isActive) {
    return (
      <Badge
        variant="secondary"
        className="bg-success-soft text-success-ink border-0 gap-1"
      >
        <Check className="h-3 w-3" />
        Ativo
      </Badge>
    )
  }

  return (
    <Badge variant="outline" className="text-muted-foreground gap-1">
      <MailX className="h-3 w-3" />
      Desativado
    </Badge>
  )
}

// ---------------------------------------------------------------------------
// Log item
// ---------------------------------------------------------------------------

const STATUS_META: Record<
  EmailLogRow["status"],
  { icon: typeof CheckCircle2; label: string; className: string }
> = {
  sent: {
    icon: CheckCircle2,
    label: "Enviado",
    className: "text-success-ink",
  },
  failed: {
    icon: XCircle,
    label: "Falhou",
    className: "text-destructive",
  },
  skipped: {
    icon: SkipForward,
    label: "Ignorado",
    className: "text-muted-foreground",
  },
  queued: {
    icon: Clock,
    label: "Na fila",
    className: "text-amber-600 dark:text-amber-400",
  },
}

const KIND_LABELS: Record<EmailLogRow["kind"], string> = {
  weekly_insights: "Insights semanais",
  collection_reminder: "Lembrete de cobrança",
  overdue_alert: "Alerta de vencido",
  trial_ending: "Fim do trial",
  transactional: "Transacional",
}

function LogItem({ log }: { log: EmailLogRow }) {
  const meta = STATUS_META[log.status]
  const Icon = meta.icon
  const when = log.sent_at ?? log.created_at

  return (
    <li className="py-3 flex items-start justify-between gap-3">
      <div className="flex items-start gap-2.5 flex-1 min-w-0">
        <Icon className={cn("h-4 w-4 shrink-0 mt-0.5", meta.className)} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{log.subject}</p>
          <div className="flex items-center gap-2 mt-0.5 text-[11px] text-muted-foreground">
            <span>{KIND_LABELS[log.kind]}</span>
            <span>·</span>
            <span className={meta.className}>{meta.label}</span>
            {log.error_message && (
              <>
                <span>·</span>
                <span
                  className="truncate max-w-[200px]"
                  title={log.error_message}
                >
                  {log.error_message}
                </span>
              </>
            )}
          </div>
        </div>
      </div>
      <time
        className="text-[11px] text-muted-foreground tabular-nums shrink-0"
        dateTime={when}
      >
        {formatRelative(when)}
      </time>
    </li>
  )
}

function formatRelative(iso: string): string {
  const ts = new Date(iso).getTime()
  const diffMs = Date.now() - ts
  const minutes = Math.floor(diffMs / (1000 * 60))
  if (minutes < 1) return "agora"
  if (minutes < 60) return `${minutes}min`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d`
  const date = new Date(iso)
  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
  })
}
