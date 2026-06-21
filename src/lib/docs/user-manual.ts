/**
 * Conteúdo do manual de uso — fonte única para página web, PDF e assistente IA.
 */

import { SUPPORT_EMAIL } from "@/lib/company/support-contact"

export type ManualSection = {
  id: string
  title: string
  paragraphs?: string[]
  bullets?: string[]
}

export const USER_MANUAL_META = {
  title: "Manual de uso do Azulli",
  subtitle: "Guia completo para organizar finanças do seu negócio",
  version: "1.2",
  updatedAt: "19 de junho de 2026",
  siteUrl: "https://use.azulli.app.br",
  supportEmail: SUPPORT_EMAIL,
}

export const USER_MANUAL_SECTIONS: ManualSection[] = [
  {
    id: "intro",
    title: "Introdução",
    paragraphs: [
      "O Azulli é um sistema de gestão financeira para MEIs e pequenas empresas no Brasil. Você registra receitas e despesas, importa extratos bancários, acompanha o caixa no painel, usa a agenda financeira e pode convidar seu contador.",
      "Datas e horários seguem o fuso de Brasília (America/Sao_Paulo): «hoje», vencimentos, gráficos e e-mails usam o calendário brasileiro.",
      "Este manual descreve todas as áreas do sistema. Para dúvidas rápidas, use também o Assistente IA (plano Empresarial ou trial).",
    ],
  },
  {
    id: "primeiros-passos",
    title: "Primeiros passos",
    bullets: [
      "Cadastro em use.azulli.app.br ou trial.azulli.app.br (trial de 7 dias, sem cartão).",
      "Após o cadastro, complete o onboarding: nome da empresa, segmento e preferências.",
      "O trial inclui degustação das funções Empresarial (IA, previsão de caixa, e-mails automáticos).",
      "Menu lateral: Painel, Lançamentos, Clientes, Fornecedores, Produtos, Funcionários, Metas e lembretes, Agenda, Assistente IA (Empresarial), Contador, Manual e Configurações.",
      "Ícone de sino no topo: notificações de lembretes, metas e avisos do Azulli.",
      "Em Configurações você atualiza perfil, dados da empresa, plano e preferências de e-mail.",
    ],
  },
  {
    id: "lancamentos",
    title: "Lançamentos",
    bullets: [
      "Registre receitas e despesas em Lançamentos ou pelos botões rápidos no Painel.",
      "A data padrão de vencimento é sempre o dia atual no horário de Brasília.",
      "Marque como «Pago» quando o dinheiro entrou ou saiu — isso alimenta gráficos e KPIs.",
      "Filtros: tipo, status, categoria e mês. Para pagos, o mês usa a data do pagamento (convertida para o dia BR); para pendentes, a data de vencimento.",
      "Status «Vencido» é calculado automaticamente quando a data de vencimento passa, no calendário brasileiro.",
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
      "«Cancelar importação» na revisão descarta o extrato sem criar lançamentos e volta para Lançamentos.",
      "«Trocar arquivo» mantém você na tela e permite enviar outro OFX.",
      "Após confirmar, a tela de conclusão mostra quantos lançamentos foram criados como Pagos (data do extrato no fuso BR).",
      "Na conclusão, «Cancelar importação» remove todos os lançamentos daquela importação de uma vez (ação irreversível).",
    ],
  },
  {
    id: "dashboard",
    title: "Painel (Dashboard)",
    bullets: [
      "KPIs do mês: receitas, despesas, lucro, pendências e vencidos.",
      "Gráfico dos últimos 7 dias por data de pagamento (dia civil no Brasil).",
      "Card «Esta semana»: próximos eventos da agenda (7 dias).",
      "Despesas recorrentes detectadas automaticamente (assinaturas e contas fixas).",
      "Despesas por categoria e comparativos do mês.",
      "Previsão de fluxo, runway («dias de caixa») e simulador «e se?»: plano Empresarial ou trial.",
    ],
  },
  {
    id: "agenda",
    title: "Agenda financeira",
    bullets: [
      "Caminho: menu lateral → Agenda (após Metas e lembretes).",
      "Visão mensal unificada: lançamentos pendentes/vencidos, lembretes e prazos de metas.",
      "Legenda de cores: verde (receita a entrar), laranja (despesa programada), vermelho (vencido), azul (lembrete), roxo (prazo de meta).",
      "Filtros: todos, lançamentos, lembretes ou metas. Clique no dia para ver a lista detalhada.",
      "Clique em um lançamento para ver detalhes; lembretes podem ser concluídos na lista do dia.",
      "Botões rápidos: criar lembrete na data selecionada ou ir para Lançamentos.",
      "Navegue entre meses pelas setas ou use «Hoje» para voltar ao mês corrente.",
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
      "Cadastre colaboradores com salário, dia de pagamento (1–31) e data de admissão.",
      "Ao cadastrar com salário e dia definidos, o Azulli cria automaticamente uma despesa pendente («Folha mensal») na próxima data de pagamento.",
      "«Registrar salário» cria despesa manual vinculada ao funcionário (útil para meses extras ou ajustes).",
      "Inativar preserva histórico; excluir remove despesas pendentes vinculadas e mantém salários já pagos.",
      "Plano Pro: até 5 funcionários. Empresarial: ilimitado.",
    ],
  },
  {
    id: "metas",
    title: "Metas e lembretes",
    bullets: [
      "Metas mensais: receita, lucro, quantidade de vendas ou progresso manual.",
      "Barra de progresso calculada automaticamente pelos lançamentos pagos no período.",
      "Lembretes com data de vencimento e prioridade (baixa, média, alta).",
      "Prazos de metas e lembretes urgentes aparecem no sino de notificações e na Agenda.",
      "Arquive metas antigas sem perder o histórico.",
    ],
  },
  {
    id: "notificacoes-app",
    title: "Notificações no app (sino)",
    bullets: [
      "Ícone de sino no menu lateral (desktop) ou barra mobile.",
      "Seção «Metas e lembretes»: itens urgentes — lembretes vencidos ou de hoje; metas com prazo nos próximos 3 dias (máximo 5 alertas para não sobrecarregar).",
      "Seção «Avisos do Azulli»: comunicados de manutenção, novidades e avisos importantes da plataforma.",
      "Link «Ver agenda completa» leva à Agenda financeira.",
      "Concluir um lembrete remove o alerta na próxima atualização.",
    ],
  },
  {
    id: "contador",
    title: "Área do contador",
    bullets: [
      "O dono convida o contador por e-mail em Configurações → Contador.",
      "O contador acessa visão read-only: resumo mensal, lançamentos e exportação.",
      "Filtro de mês usa calendário brasileiro.",
      "Exportação para contador: Excel formatado + JSON em Configurações ou área Contador.",
      "O contador não pode criar ou editar lançamentos.",
    ],
  },
  {
    id: "assistente",
    title: "Assistente IA (Empresarial / trial)",
    bullets: [
      "Pergunte sobre caixa, gastos, clientes, vencidos e previsão de fluxo.",
      "Pergunte também «como usar» qualquer função do Azulli (inclui este manual).",
      "Conversas ficam salvas na barra lateral do Assistente.",
      "Limite diário de mensagens por empresa (proteção de quota).",
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
      "Insights semanais com resumo financeiro (semana fechada no calendário BR).",
      "Régua de cobrança para receitas pendentes vencidas ou a vencer em 3 dias.",
      "Alertas de lançamentos vencidos.",
      "Configure em Configurações → Notificações. Histórico de envios na mesma tela.",
      "O plano Pro não inclui e-mails automáticos.",
    ],
  },
  {
    id: "configuracoes",
    title: "Configurações e LGPD",
    bullets: [
      "Conta: nome, WhatsApp e foto de perfil.",
      "Empresa: razão social, logo e dados de contato.",
      "Equipe: convide membros e contador.",
      "Faturamento: plano atual, upgrade e cancelamento via Asaas.",
      "Exportar meus dados (JSON) e solicitar exclusão de conta conforme LGPD.",
      "Manual de uso online ou PDF em Configurações ou menu Manual.",
      "Termos de uso e política de privacidade nos links do rodapé.",
    ],
  },
  {
    id: "planos",
    title: "Planos e billing",
    bullets: [
      "Trial 7 dias com degustação Empresarial (cadastro em use.azulli.app.br ou trial.azulli.app.br).",
      "Pro: lançamentos, OFX, Excel, contador, dashboard, agenda, estoque, metas e lembretes — limites 500 clientes/fornecedores/produtos e 5 funcionários.",
      "Empresarial: tudo do Pro + Assistente IA + previsão/simulador + e-mails automáticos + limites ilimitados + suporte prioritário.",
      "Pagamento recorrente via Asaas (cartão ou boleto).",
    ],
  },
  {
    id: "fuso-horario",
    title: "Datas e fuso horário (Brasil)",
    bullets: [
      "Todo o Azulli usa America/Sao_Paulo (horário de Brasília) para «hoje», vencimentos, gráficos, agenda, contador e e-mails.",
      "Lançamentos pagos registram o instante exato (UTC no servidor), mas exibição e agrupamento usam o dia no Brasil.",
      "Isso evita que vendas à noite apareçam no dia seguinte ou que vencimentos mudem antes da meia-noite local.",
    ],
  },
  {
    id: "suporte",
    title: "Suporte",
    bullets: [
      `E-mail: ${SUPPORT_EMAIL}`,
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
