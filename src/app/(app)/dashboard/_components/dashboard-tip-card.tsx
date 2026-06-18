import { Lightbulb } from "lucide-react"

import { Card, CardContent } from "@/components/ui/card"

const TIPS = [
  "Importe seu extrato OFX em Lançamentos → Importar para categorizar com IA.",
  "Use o Simulador «e se?» no painel para testar cenários sem alterar lançamentos.",
  "Cadastre produtos com estoque para vender direto nos lançamentos de receita.",
  "Ative os e-mails de insights e cobrança em Configurações → Notificações.",
  "Pergunte ao Assistente IA: «quanto gastei em marketing este mês?»",
  "Marque despesas recorrentes para ver assinaturas no dashboard.",
  "Defina metas mensais em Metas e Lembretes para não perder o foco.",
]

export function DashboardTipCard() {
  const tip = TIPS[new Date().getDay() % TIPS.length]

  return (
    <Card className="border-brand/20 bg-brand-soft/30">
      <CardContent className="flex items-start gap-3 py-4">
        <div className="h-9 w-9 rounded-full bg-brand-soft flex items-center justify-center shrink-0">
          <Lightbulb className="h-4 w-4 text-brand" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-semibold text-brand-ink">Dica do dia</p>
          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
            {tip}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
