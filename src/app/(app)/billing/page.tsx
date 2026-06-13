export const metadata = { title: "Assinatura — Azulli" }

type Props = {
  searchParams: Promise<{ reason?: string }>
}

const REASONS: Record<string, { title: string; description: string }> = {
  trial_expired: {
    title: "Seu trial chegou ao fim 🎈",
    description:
      "Esperamos que tenha curtido o Azulli! Escolha um plano para continuar.",
  },
  past_due: {
    title: "Tem uma cobrança em aberto",
    description: "Regularize o pagamento para reativar sua conta.",
  },
  canceled: {
    title: "Sua assinatura está cancelada",
    description: "Reative escolhendo um plano para voltar a usar o Azulli.",
  },
}

export default async function BillingPage({ searchParams }: Props) {
  const { reason } = await searchParams
  const info = reason && REASONS[reason] ? REASONS[reason] : {
    title: "Planos do Azulli",
    description: "Escolha o plano que faz sentido pra sua empresa.",
  }

  return (
    <main className="min-h-screen p-8 max-w-3xl mx-auto">
      <h1 className="text-3xl font-display font-bold text-brand-ink mb-2">
        {info.title}
      </h1>
      <p className="text-muted-foreground mb-8">{info.description}</p>

      <div className="rounded-xl border bg-card p-6">
        <p className="text-sm text-muted-foreground">
          🛠️ Página de planos completa será construída na Fase 5 (Asaas).
        </p>
      </div>
    </main>
  )
}