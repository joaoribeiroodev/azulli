import type { LucideIcon } from "lucide-react"
import {
  BarChart3,
  Bot,
  Calculator,
  LineChart,
  Mail,
  Upload,
  Wallet,
} from "lucide-react"
import { getLoginUrl, getRegisterUrl } from "@/lib/app/public-urls"

const WHATSAPP_NUMBER = "5571991624162"

const WHATSAPP_DEFAULT_MESSAGE =
  "Olá! Vim pelo site do Azulli (azulli.app.br) e gostaria de saber mais sobre o trial grátis de 7 dias. Podemos conversar?"

export function buildWhatsAppUrl(message = WHATSAPP_DEFAULT_MESSAGE): string {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`
}

export const LANDING_LINKS = {
  register: getRegisterUrl(),
  login: getLoginUrl(),
  whatsapp: buildWhatsAppUrl(),
  instagram:
    "https://www.instagram.com/useazulli?igsh=eXVpYmxhOWx5YzJn&utm_source=qr",
  phoneDisplay: "(71) 99162-4162",
  anchors: {
    about: "#sobre",
    contact: "#contato",
    features: "#funcionalidades",
    pricing: "#planos",
  },
} as const

export const LANDING_NAV = [
  { label: "Sobre", href: LANDING_LINKS.anchors.about },
  { label: "Funcionalidades", href: LANDING_LINKS.anchors.features },
  { label: "Planos", href: LANDING_LINKS.anchors.pricing },
  { label: "Contato", href: LANDING_LINKS.anchors.contact },
] as const

/** Links do footer — mesma ordem do header + acesso */
export const LANDING_FOOTER_LINKS = [
  ...LANDING_NAV,
  { label: "Trial grátis", href: LANDING_LINKS.register },
  { label: "Entrar", href: LANDING_LINKS.login },
] as const

export type LandingFeatureTier = "pro" | "enterprise"

export type LandingFeature = {
  icon: LucideIcon
  title: string
  description: string
  /** `pro` = incluído no Pro; `enterprise` = Empresarial (e degustação no trial). */
  tier: LandingFeatureTier
}

export const LANDING_FEATURES: LandingFeature[] = [
  {
    icon: Wallet,
    tier: "pro",
    title: "Lançamentos e fluxo de caixa",
    description:
      "Receitas, despesas, clientes, fornecedores, produtos e funcionários em um painel claro — sem planilha.",
  },
  {
    icon: Upload,
    tier: "pro",
    title: "Importação OFX com IA",
    description:
      "Suba o extrato do banco; a IA sugere categorias baseadas no histórico da sua empresa.",
  },
  {
    icon: Calculator,
    tier: "pro",
    title: "Área do contador e Excel",
    description:
      "Convide o contador com acesso read-only, exportação Excel formatada e pacote mensal para fechamento.",
  },
  {
    icon: BarChart3,
    tier: "pro",
    title: "Recorrentes, metas e estoque",
    description:
      "Detecta assinaturas, metas mensais, lembretes na app e controle de estoque de produtos.",
  },
  {
    icon: LineChart,
    tier: "enterprise",
    title: "Previsão e simulador",
    description:
      "Veja quantos dias de caixa você tem, projete o saldo e teste cenários «e se?» sem alterar dados reais.",
  },
  {
    icon: Bot,
    tier: "enterprise",
    title: "Assistente IA",
    description:
      "Pergunte em português: «quanto gastei em marketing?» — resposta com os números da sua empresa.",
  },
  {
    icon: Mail,
    tier: "enterprise",
    title: "E-mails automáticos",
    description:
      "Insights semanais, lembretes de cobrança e alertas de vencidos enviados no seu e-mail.",
  },
]

/** Diferenciais únicos — sem repetir o badge do hero */
export const LANDING_TRUST_SIGNALS = [
  {
    title: "Trial completo",
    description:
      "7 dias com tudo do Empresarial: lançamentos, OFX, previsão, assistente IA e e-mails automáticos.",
  },  {
    title: "Sem cartão no cadastro",
    description:
      "Comece agora sem cartão de crédito. Você decide se continua depois do trial.",
  },
  {
    title: "Feito para o Brasil",
    description:
      "Interface em português, foco em MEI e Simples Nacional — sem termos em inglês.",
  },
] as const
