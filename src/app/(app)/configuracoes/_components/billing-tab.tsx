"use client"

import Link from "next/link"
import { useTransition } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import {
  Loader2,
  Sparkles,
  Clock,
  Check,
  ExternalLink,
  AlertCircle,
} from "lucide-react"

import { PLANS, formatPlanPrice } from "@/lib/billing/plans"
import { formatDateBR } from "@/lib/utils/date"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import { updateTenantSettingsAction } from "@/lib/settings/actions"

// Tipo local — não importamos de queries.ts (server-only)
type BillingStateSnapshot = {
  tenant_tier: "trial" | "pro" | "enterprise"
  trial_ends_at: string | null
  subscription_status:
    | "pending"
    | "active"
    | "past_due"
    | "canceled"
    | "trial_expired"
    | null
  plan_id: "pro" | "enterprise" | null
  current_period_end: string | null
  effective_status:
    | "trial_active"
    | "trial_expired"
    | "pending"
    | "active"
    | "past_due"
    | "canceled"
    | "no_subscription"
  trial_days_left: number | null
}

const schema = z.object({
  default_tax_regime: z.enum(["mei", "simples_nacional"]),
  billing_email: z
    .string()
    .trim()
    .toLowerCase()
    .email("E-mail inválido")
    .optional()
    .or(z.literal("")),
})

type FormInput = z.infer<typeof schema>

type Props = {
  billingState: BillingStateSnapshot | null
  settings: {
    default_tax_regime: "mei" | "simples_nacional"
    billing_email: string | null
  }
}

function StatusBadge({ status }: { status: BillingStateSnapshot["effective_status"] | undefined }) {
  const map: Record<string, { label: string; className: string }> = {
    trial_active: { label: "Trial ativo", className: "bg-brand-soft text-brand-ink" },
    trial_expired: { label: "Trial expirado", className: "bg-red-100 text-red-800" },
    pending: { label: "Aguardando pagamento", className: "bg-amber-100 text-amber-800" },
    active: { label: "Ativa", className: "bg-success-soft text-success-ink" },
    past_due: { label: "Pagamento atrasado", className: "bg-amber-100 text-amber-800" },
    canceled: { label: "Cancelada", className: "bg-red-100 text-red-800" },
    no_subscription: { label: "Sem assinatura", className: "bg-muted text-muted-foreground" },
  }
  if (!status) return null
  const s = map[status]
  if (!s) return null
  return (
    <Badge variant="secondary" className={s.className}>
      {s.label}
    </Badge>
  )
}

function ManageBillingButton({ status }: { status: BillingStateSnapshot["effective_status"] | undefined }) {
  const configs: Partial<Record<string, { label: string; className?: string }>> = {
    trial_active: { label: "Ver planos" },
    trial_expired: { label: "Assinar agora" },
    pending: { label: "Ver fatura" },
    active: { label: "Gerenciar" },
    past_due: { label: "Pagar agora", className: "text-destructive border-destructive hover:text-destructive" },
    canceled: { label: "Reativar" },
    no_subscription: { label: "Ver planos" },
  }
  const cfg = status ? (configs[status] ?? { label: "Gerenciar" }) : { label: "Gerenciar" }

  return (
    <Button asChild variant="outline" className={cfg.className}>
      <Link href="/billing" className="gap-2 flex items-center">
        {status === "past_due" ? (
          <AlertCircle className="h-4 w-4" />
        ) : (
          <ExternalLink className="h-4 w-4" />
        )}
        {cfg.label}
      </Link>
    </Button>
  )
}

export function BillingTab({ billingState, settings }: Props) {
  const [isPending, startTransition] = useTransition()

  const form = useForm<FormInput>({
    resolver: zodResolver(schema),
    defaultValues: {
      default_tax_regime: settings.default_tax_regime,
      billing_email: settings.billing_email ?? "",
    },
  })

  function onSubmit(values: FormInput) {
    startTransition(async () => {
      const result = await updateTenantSettingsAction(values)
      if (!result.success) {
        toast.error(result.error)
        return
      }
      toast.success("Faturamento atualizado!")
    })
  }

  const plan =
    billingState?.plan_id ? PLANS[billingState.plan_id] : null

  const trialDaysLeft = billingState?.trial_days_left ?? 0
  const trialEndsAt = billingState?.trial_ends_at

  return (
    <div className="space-y-6">
      {/* Card: Plano / assinatura atual */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Plano atual
            {billingState?.plan_id === "enterprise" && (
              <Sparkles className="h-4 w-4 text-brand" />
            )}
          </CardTitle>
          <CardDescription>
            Status da sua assinatura e opções disponíveis.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="space-y-1.5">
              <p className="text-2xl font-display font-bold text-brand-ink">
                {plan?.name ?? (billingState?.tenant_tier === "trial" ? "Trial" : "—")}
              </p>
              <StatusBadge status={billingState?.effective_status} />
            </div>

            {/* Exibição extra por estado */}
            {billingState?.effective_status === "trial_active" && trialEndsAt && (
              <div className="rounded-lg bg-brand-soft px-4 py-3 text-sm">
                <p className="font-medium text-brand-ink flex items-center gap-1.5">
                  <Clock className="h-4 w-4" />
                  {trialDaysLeft > 0
                    ? `${trialDaysLeft} ${trialDaysLeft === 1 ? "dia restante" : "dias restantes"}`
                    : "Trial expirado"}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Termina em {formatDateBR(trialEndsAt)}
                </p>
              </div>
            )}

            {plan && billingState?.effective_status === "active" && (
              <p className="text-2xl font-display font-bold text-brand-ink">
                {formatPlanPrice(plan.price)}
                <span className="text-sm font-normal text-muted-foreground">/mês</span>
              </p>
            )}
          </div>

          {/* Próxima cobrança / data de acesso */}
          {billingState?.current_period_end &&
            (billingState.effective_status === "active" ||
              billingState.effective_status === "canceled") && (
              <div className="text-sm text-muted-foreground">
                {billingState.effective_status === "active"
                  ? `Próxima cobrança em ${formatDateBR(billingState.current_period_end)}`
                  : `Acesso até ${formatDateBR(billingState.current_period_end)}`}
              </div>
            )}

          {/* Features do plano */}
          {plan && billingState?.effective_status === "active" && (
            <>
              <Separator />
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-y-1.5 gap-x-4">
                {plan.features.map((feature) => (
                  <li
                    key={feature}
                    className="flex items-center gap-2 text-sm text-muted-foreground"
                  >
                    <Check className="h-3.5 w-3.5 shrink-0 text-success" />
                    {feature}
                  </li>
                ))}
              </ul>
            </>
          )}

          <Separator />

          <div className="flex justify-between items-center gap-4 flex-wrap">
            <p className="text-sm text-muted-foreground">
              {billingState?.effective_status === "active"
                ? "Gerencie sua assinatura na página de faturamento."
                : "Veja os planos disponíveis e escolha o melhor pra você."}
            </p>
            <ManageBillingButton status={billingState?.effective_status} />
          </div>
        </CardContent>
      </Card>

      {/* Card: Preferências fiscais */}
      <Card>
        <CardHeader>
          <CardTitle>Preferências fiscais</CardTitle>
          <CardDescription>
            Configure seu regime tributário e onde receber as cobranças.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="default_tax_regime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Regime tributário</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="mei">
                          MEI - Microempreendedor Individual
                        </SelectItem>
                        <SelectItem value="simples_nacional">
                          Simples Nacional
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription className="text-xs">
                      Usado para sugerir categorias e cálculos fiscais nos relatórios.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="billing_email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>E-mail de cobrança</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="financeiro@empresa.com"
                        {...field}
                        value={field.value ?? ""}
                      />
                    </FormControl>
                    <FormDescription className="text-xs">
                      Para onde enviamos boletos e recibos. Deixe vazio para
                      usar seu e-mail principal.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end pt-2">
                <Button
                  type="submit"
                  disabled={isPending}
                  className="bg-brand hover:bg-brand-hover"
                >
                  {isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Salvar
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  )
}
