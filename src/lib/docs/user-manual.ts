/**
 * Conteúdo do manual de uso — fonte única para página web, PDF e assistente IA.
 */

export type ManualSection = {
  id: string
  title: string
  paragraphs?: string[]
  bullets?: string[]
}

export const USER_MANUAL_META = {
  title: "Manual de uso do Azulli",
  subtitle: "Guia completo para organizar finanças do seu negócio",
  version: "1.0",
  updatedAt: "2026-06",
  siteUrl: "https://use.azulli.app.br",
  supportEmail: "oi@azulli.app.br",
}

export const USER_MANUAL_SECTIONS: ManualSection[] = [
  {
    id: "intro",
    title: "Introdução",
    paragraphs: [
      "O Azulli é um sistema de gestão financeira para MEIs e pequenas empresas. Você registra receitas e despesas, importa extratos bancários, acompanha o caixa no dashboard e pode convidar seu contador.",
      "Este manual descreve todas as áreas do sistema. Para dúvidas rápidas, use também o Assistente IA (plano Empresarial ou trial).",
    ],
  },
  {
    id: "primeiros-passos",
    title: "Primeiros passos",
    bullets: [
      "Após o cadastro, complete o onboarding: nome da empresa, segmento e preferências.",
      "O trial de 7 dias inclui degustação das funções Empresarial (IA, previsão de caixa, e-mails automáticos).",
      "Use o menu lateral para navegar entre Painel, Lançamentos, Clientes e outras áreas.",
      "Em Configurações você atualiza perfil, dados da empresa e plano.",
    ],
  },
  {
    id: "lancamentos",
    title: "Lançamentos",
    bullets: [
      "Registre receitas e despesas em Lançamentos ou pelos botões rápidos no Painel.",
      "Marque como «Pago» quando o dinheiro entrou ou saiu — isso alimenta gráficos e KPIs.",
      "Filtros: tipo, status, categoria e mês. Para pagos, o mês usa a data do pagamento; para pendentes, a data de vencimento.",
      "Vincule cliente, fornecedor, produto e categoria para relatórios mais ricos.",
      "Exportar Excel: botão na página de Lançamentos — planilha formatada com os filtros atuais.",
      "Edite ou exclua lançamentos pela tabela; exclusão é permanente.",
    ],
  },
  {
    id: "ofx",
    title: "Importação OFX (extrato bancário)",
    bullets: [
      "Caminho: Lançamentos → Importar OFX.",
      "Envie arquivo .ofx ou .qfx exportado pelo seu banco.",
      "A IA sugere categorias baseadas no histórico do seu tenant.",
      "Revise cada linha: edite categoria, desmarque duplicatas e use «Ver detalhes» para a descrição completa.",
      "Filtre por mês do extrato antes de confirmar a importação.",
      "Após importar, lançamentos ficam como Pagos na data real do extrato (não no dia da importação).",
    ],
  },
  {
    id: "dashboard",
    title: "Painel (Dashboard)",
    bullets: [
      "KPIs do mês: receitas, despesas, lucro, pendências e vencidos.",
      "Gráfico dos últimos 7 dias por data de pagamento.",
      "Despesas recorrentes detectadas automaticamente (assinaturas e contas fixas).",
      "Insights comparando gastos do mês com o mês anterior.",
      "Previsão de fluxo, runway («dias de caixa») e simulador «e se?»: plano Empresarial ou trial.",
    ],
  },
  {
    id: "clientes-fornecedores",
    title: "Clientes e fornecedores",
    bullets: [
      "Cadastre contatos com nome, e-mail, telefone e observações.",
      "Vincule lançamentos a clientes (receitas) ou fornecedores (despesas).",
      "Na ficha do cliente, use «Cobrar no WhatsApp» para pendências vencidas.",
      "Exporte histórico e totais na página de detalhes de cada cadastro.",
    ],
  },
  {
    id: "produtos",
    title: "Produtos e estoque",
    bullets: [
      "Cadastre produtos e serviços com preço, custo e unidade.",
      "Ative controle de estoque para produtos físicos.",
      "Ajuste stock manualmente ou automaticamente ao vincular vendas em lançamentos.",
      "Alertas de estoque baixo aparecem quando o saldo atinge o limite configurado.",
    ],
  },
  {
    id: "funcionarios",
    title: "Funcionários",
    bullets: [
      "Cadastre colaboradores com salário e data de admissão.",
      "«Registrar salário» cria despesa de folha vinculada ao funcionário.",
      "Plano Pro: até 5 funcionários. Empresarial: ilimitado.",
    ],
  },
  {
    id: "metas",
    title: "Metas e lembretes",
    bullets: [
      "Metas mensais: receita, lucro, quantidade de vendas ou progresso manual.",
      "Barra de progresso calculada automaticamente pelos lançamentos pagos no período.",
      "Lembretes com data de vencimento e notificações na app.",
      "Arquive metas antigas sem perder o histórico.",
    ],
  },
  {
    id: "contador",
    title: "Área do contador",
    bullets: [
      "O dono convida o contador por e-mail em Configurações → Contador.",
      "O contador acessa visão read-only: resumo mensal, lançamentos e exportação.",
      "Exportação para contador: Excel formatado + JSON em Configurações ou área Contador.",
      "O contador não pode criar ou editar lançamentos.",
    ],
  },
  {
    id: "assistente",
    title: "Assistente IA (Empresarial / trial)",
    bullets: [
      "Pergunte sobre caixa, gastos, clientes, vencidos e previsão de fluxo.",
      "Pergunte também «como usar» qualquer função do Azulli.",
      "Conversas ficam salvas na barra lateral do Assistente.",
      "No plano Pro o Assistente não está disponível — faça upgrade para Empresarial.",
    ],
  },
  {
    id: "forecast",
    title: "Previsão e simulador (Empresarial / trial)",
    bullets: [
      "Previsão de fluxo de caixa para 30, 60 ou 90 dias.",
      "Runway: estimativa de quantos dias de caixa você tem com o ritmo atual.",
      "Simulador «e se?»: teste cenários (ex.: +10% receita, cortar uma despesa).",
      "Base: saldo realizado + pendências + despesas recorrentes + tendência de receita.",
    ],
  },
  {
    id: "notificacoes",
    title: "Notificações por e-mail (Empresarial / trial)",
    bullets: [
      "Insights semanais com resumo financeiro.",
      "Régua de cobrança para clientes com pendências.",
      "Alertas de lançamentos vencidos.",
      "Configure em Configurações → Notificações. O plano Pro não inclui e-mails automáticos.",
    ],
  },
  {
    id: "configuracoes",
    title: "Configurações e LGPD",
    bullets: [
      "Conta: nome, WhatsApp e foto de perfil.",
      "Empresa: razão social, logo e dados de contato.",
      "Faturamento: plano atual, upgrade e cancelamento via Asaas.",
      "Exportar meus dados (JSON) e solicitar exclusão de conta conforme LGPD.",
      "Termos de uso e política de privacidade nos links do rodapé.",
    ],
  },
  {
    id: "planos",
    title: "Planos e billing",
    bullets: [
      "Trial 7 dias com degustação Empresarial.",
      "Pro: lançamentos, OFX, Excel, contador, dashboard, estoque, metas — limites 500 clientes/fornecedores/produtos e 5 funcionários.",
      "Empresarial: tudo do Pro + Assistente IA + previsão/simulador + e-mails automáticos + limites ilimitados.",
      "Pagamento recorrente via Asaas (cartão ou boleto).",
    ],
  },
  {
    id: "suporte",
    title: "Suporte",
    bullets: [
      "E-mail: oi@azulli.app.br",
      "Empresarial: suporte prioritário via WhatsApp.",
      "Pro: suporte por e-mail.",
    ],
  },
]

/** Markdown resumido para o assistente IA (mesmo conteúdo, formato compacto). */
export function buildHelpKnowledgeMarkdown(): string {
  const lines = ["## Como usar o Azulli", ""]
  for (const section of USER_MANUAL_SECTIONS) {
    lines.push(`### ${section.title}`)
    if (section.paragraphs) {
      lines.push(...section.paragraphs)
      lines.push("")
    }
    if (section.bullets) {
      for (const b of section.bullets) {
        lines.push(`- ${b}`)
      }
      lines.push("")
    }
  }
  return lines.join("\n").trim()
}
