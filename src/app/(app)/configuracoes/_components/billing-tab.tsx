"use client"

import Link from "next/link"
import { useTransition } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import { Loader2, Sparkles, Clock, CheckCircle2 } from "lucide-react"

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
  tenant: {
    tier: "trial" | "pro" | "enterprise"
    subscription_status: "active" | "past_due" | "canceled"
    trial_ends_at: string
  }
  settings: {
    default_tax_regime: "mei" | "simples_nacional"
    billing_email: string | null
  }
}

const TIER_LABELS = {
  trial: "Trial",
  pro: "Pro",
  enterprise: "Empresarial",
} as const

const STATUS_LABELS = {
  active: { label: "Ativa", color: "bg-success-soft text-success-ink" },
  past_due: { label: "Pagamento atrasado", color: "bg-amber-100 text-amber-800" },
  canceled: { label: "Cancelada", color: "bg-red-100 text-red-800" },
} as const

export function BillingTab({ tenant, settings }: Props) {
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
      toast.success("Faturamento atualizado! ✅")
    })
  }

  const isTrial = tenant.tier === "trial"
  const trialDate = new Date(tenant.trial_ends_at)
  const daysLeft = Math.max(
    0,
    Math.ceil((trialDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
  )
  const statusStyle = STATUS_LABELS[tenant.subscription_status]

  return (
    <div className="space-y-6">
      {/* Card: Plano atual */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Plano atual
            {tenant.tier === "enterprise" && (
              <Sparkles className="h-4 w-4 text-brand" />
            )}
          </CardTitle>
          <CardDescription>
            Veja seu status e mudanças disponíveis.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="space-y-1">
              <p className="text-2xl font-display font-bold text-brand-ink">
                {TIER_LABELS[tenant.tier]}
              </p>
              <Badge variant="secondary" className={statusStyle.color}>
                {statusStyle.label}
              </Badge>
            </div>

            {isTrial && (
              <div className="rounded-lg bg-brand-soft px-4 py-3 text-sm">
                <p className="font-medium text-brand-ink flex items-center gap-1.5">
                  <Clock className="h-4 w-4" />
                  {daysLeft > 0
                    ? `${daysLeft} ${daysLeft === 1 ? "dia restante" : "dias restantes"}`
                    : "Trial expirado"}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Termina em {trialDate.toLocaleDateString("pt-BR")}
                </p>
              </div>
            )}
          </div>

          <Separator />

          <div className="flex justify-between items-center gap-4 flex-wrap">
            <p className="text-sm text-muted-foreground">
              {isTrial
                ? "Assine um plano para continuar usando depois do trial."
                : "Quer mudar de plano ou cancelar?"}
            </p>
            <Button asChild variant="outline" className="gap-2">
              <Link href="/billing">
                <CheckCircle2 className="h-4 w-4" />
                {isTrial ? "Ver planos" : "Gerenciar assinatura"}
              </Link>
            </Button>
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
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                    >
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
                      Usado para calcular impostos nas notas fiscais.
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
