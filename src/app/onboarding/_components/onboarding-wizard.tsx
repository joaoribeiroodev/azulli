"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  PartyPopper,
  Sparkles,
  Upload,
  Users,
} from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"

import type { OnboardingBootstrap } from "@/lib/onboarding/queries"
import {
  completeOnboardingAction,
  saveOnboardingCompanyAction,
} from "@/lib/onboarding/actions"

const STEPS = ["Bem-vindo", "Sua empresa", "Pronto!"] as const

const BUSINESS_TYPES = [
  { value: "servicos", label: "Prestação de serviços" },
  { value: "comercio", label: "Comércio / varejo" },
  { value: "alimentacao", label: "Alimentação" },
  { value: "tecnologia", label: "Tecnologia" },
  { value: "industria", label: "Indústria" },
  { value: "outro", label: "Outro" },
] as const

type Props = {
  bootstrap: OnboardingBootstrap
}

export function OnboardingWizard({ bootstrap }: Props) {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [document, setDocument] = useState(bootstrap.document ?? "")
  const [taxRegime, setTaxRegime] = useState(bootstrap.defaultTaxRegime)
  const [businessType, setBusinessType] = useState(
    bootstrap.businessType ?? ""
  )
  const [isPending, startTransition] = useTransition()

  const trialLabel = bootstrap.trialEndsAt
    ? new Date(bootstrap.trialEndsAt).toLocaleDateString("pt-BR")
    : null

  function handleCompanyContinue() {
    startTransition(async () => {
      const result = await saveOnboardingCompanyAction({
        document,
        default_tax_regime: taxRegime,
        business_type: businessType,
      })
      if (!result.success) {
        toast.error(result.error)
        return
      }
      setStep(2)
    })
  }

  function handleComplete() {
    startTransition(async () => {
      const result = await completeOnboardingAction()
      if (!result.success) {
        toast.error(result.error)
        return
      }
      toast.success("Tudo pronto! Bem-vindo ao Azulli 🎉")
      router.push("/dashboard")
      router.refresh()
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-center gap-2">
        {STEPS.map((label, i) => (
          <div key={label} className="flex items-center gap-2">
            <div
              className={cn(
                "h-8 w-8 rounded-full flex items-center justify-center text-xs font-semibold border transition-colors",
                i <= step
                  ? "bg-brand text-primary-foreground border-brand"
                  : "bg-muted text-muted-foreground border-transparent"
              )}
            >
              {i < step ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
            </div>
            {i < STEPS.length - 1 && (
              <div
                className={cn(
                  "h-0.5 w-8 sm:w-12 rounded",
                  i < step ? "bg-brand" : "bg-muted"
                )}
              />
            )}
          </div>
        ))}
      </div>

      {step === 0 && (
        <Card>
          <CardHeader className="text-center pb-2">
            <div className="mx-auto h-14 w-14 rounded-full bg-brand-soft flex items-center justify-center mb-3">
              <PartyPopper className="h-7 w-7 text-brand" />
            </div>
            <CardTitle className="text-2xl font-display">
              Bem-vindo, {bootstrap.tenantName.split(" ")[0]}!
            </CardTitle>
            <CardDescription className="text-sm leading-relaxed">
              Você está no trial gratuito de 7 dias
              {trialLabel ? ` — válido até ${trialLabel}` : ""}. Explore
              lançamentos, importação OFX, previsão de caixa e o assistente IA
              sem compromisso.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="text-sm text-muted-foreground space-y-2">
              <li className="flex gap-2">
                <Sparkles className="h-4 w-4 text-brand shrink-0 mt-0.5" />
                Organize receitas e despesas em minutos
              </li>
              <li className="flex gap-2">
                <Upload className="h-4 w-4 text-brand shrink-0 mt-0.5" />
                Importe extrato bancário (OFX) com categorização por IA
              </li>
              <li className="flex gap-2">
                <Users className="h-4 w-4 text-brand shrink-0 mt-0.5" />
                Cadastre clientes, produtos e equipe quando quiser
              </li>
            </ul>
            <Button
              className="w-full bg-brand hover:bg-brand-hover gap-2"
              onClick={() => setStep(1)}
            >
              Continuar
              <ArrowRight className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      )}

      {step === 1 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-brand" />
              <CardTitle className="text-xl font-display">Sua empresa</CardTitle>
            </div>
            <CardDescription>
              Esses dados ajudam em relatórios e na assinatura. Você pode
              alterar depois em Configurações.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="onboarding-document">CNPJ ou CPF</Label>
              <Input
                id="onboarding-document"
                placeholder="00.000.000/0001-00 ou 000.000.000-00"
                value={document}
                onChange={(e) => setDocument(e.target.value)}
                disabled={isPending}
              />
              <p className="text-xs text-muted-foreground">
                Opcional agora, mas necessário para assinar um plano.
              </p>
            </div>

            <div className="space-y-2">
              <Label>Regime tributário</Label>
              <Select
                value={taxRegime}
                onValueChange={(v) =>
                  setTaxRegime(v as "mei" | "simples_nacional")
                }
                disabled={isPending}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mei">MEI</SelectItem>
                  <SelectItem value="simples_nacional">
                    Simples Nacional
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Tipo de negócio</Label>
              <Select
                value={businessType || undefined}
                onValueChange={setBusinessType}
                disabled={isPending}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione (opcional)" />
                </SelectTrigger>
                <SelectContent>
                  {BUSINESS_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setStep(0)}
                disabled={isPending}
              >
                Voltar
              </Button>
              <Button
                className="flex-1 bg-brand hover:bg-brand-hover gap-2"
                onClick={handleCompanyContinue}
                disabled={isPending}
              >
                {isPending ? "Salvando…" : "Continuar"}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 2 && (
        <Card>
          <CardHeader className="text-center pb-2">
            <div className="mx-auto h-14 w-14 rounded-full bg-success-soft flex items-center justify-center mb-3">
              <CheckCircle2 className="h-7 w-7 text-success-ink" />
            </div>
            <CardTitle className="text-2xl font-display">
              Pronto pra começar!
            </CardTitle>
            <CardDescription>
              Sugestões para o primeiro dia no Azulli:
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link
              href="/lancamentos"
              className="flex items-center gap-3 rounded-lg border p-3 hover:bg-muted/50 transition-colors"
            >
              <span className="text-sm font-medium">Registrar uma receita</span>
              <ArrowRight className="h-4 w-4 ml-auto text-muted-foreground" />
            </Link>
            <Link
              href="/lancamentos/importar"
              className="flex items-center gap-3 rounded-lg border p-3 hover:bg-muted/50 transition-colors"
            >
              <span className="text-sm font-medium">
                Importar extrato OFX
              </span>
              <ArrowRight className="h-4 w-4 ml-auto text-muted-foreground" />
            </Link>
            <Link
              href="/clientes"
              className="flex items-center gap-3 rounded-lg border p-3 hover:bg-muted/50 transition-colors"
            >
              <span className="text-sm font-medium">
                Cadastrar primeiro cliente
              </span>
              <ArrowRight className="h-4 w-4 ml-auto text-muted-foreground" />
            </Link>

            <Button
              className="w-full bg-brand hover:bg-brand-hover mt-4"
              onClick={handleComplete}
              disabled={isPending}
            >
              {isPending ? "Finalizando…" : "Ir pro dashboard"}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
