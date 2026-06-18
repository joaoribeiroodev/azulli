import Link from "next/link"
import { LineChart, Lock, Mail } from "lucide-react"

import { Button } from "@/components/ui/button"

type Props = {
  feature: "forecast" | "assistant" | "emails"
}

const COPY = {
  forecast: {
    title: "Previsão de caixa — plano Empresarial",
    description:
      "Veja quantos dias de caixa você tem, projete o saldo futuro e use o simulador «e se?» para testar cenários.",
    cta: "Ver plano Empresarial",
    href: "/billing?upsell=previsao",
  },
  assistant: {
    title: "Assistente IA — plano Empresarial",
    description:
      "Pergunte em português sobre seu caixa, clientes e despesas — com respostas baseadas nos seus dados.",
    cta: "Liberar assistente",
    href: "/billing?upsell=assistente",
  },
  emails: {
    title: "E-mails automáticos — plano Empresarial",
    description:
      "Insights semanais, lembretes de cobrança e alertas de vencidos enviados direto no seu e-mail.",
    cta: "Ver plano Empresarial",
    href: "/billing?upsell=emails",
  },
}

export function EnterpriseFeatureUpsell({ feature }: Props) {
  const copy = COPY[feature]
  const Icon =
    feature === "forecast"
      ? LineChart
      : feature === "emails"
        ? Mail
        : Lock

  return (
    <div className="rounded-xl border border-brand/25 bg-brand-soft/40 p-4 flex flex-col sm:flex-row sm:items-center gap-4">
      <div className="flex gap-3 min-w-0 flex-1">
        <Icon className="h-5 w-5 text-brand shrink-0 mt-0.5" aria-hidden />
        <div>
          <p className="text-sm font-semibold text-brand-ink">{copy.title}</p>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
            {copy.description}
          </p>
        </div>
      </div>
      <Button variant="outline" size="sm" asChild className="shrink-0 border-brand/40">
        <Link href={copy.href}>{copy.cta}</Link>
      </Button>
    </div>
  )
}
