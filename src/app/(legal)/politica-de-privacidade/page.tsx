import Link from "next/link"

import { LegalLayoutShell } from "@/components/legal/legal-layout-shell"
import { LegalProse } from "@/components/legal/legal-prose"
import { SUPPORT_EMAIL } from "@/lib/company/support-contact"
import { LEGAL_PATHS } from "@/lib/legal/paths"

export const metadata = {
  title: "Política de privacidade — Azulli",
  description:
    "Como o Azulli coleta, usa e protege seus dados pessoais (LGPD).",
}

export default function PoliticaDePrivacidadePage() {
  return (
    <LegalLayoutShell>
      <LegalProse>
        <header className="space-y-2 !mt-0">
          <h1>Política de privacidade</h1>
          <p className="text-xs text-muted-foreground">
            Última atualização: 19 de junho de 2026
          </p>
        </header>

        <p>
          Esta Política de Privacidade descreve como o Azulli (&quot;nós&quot;)
          trata dados pessoais de usuários e visitantes do site, em conformidade
          com a Lei Geral de Proteção de Dados (LGPD — Lei nº 13.709/2018). Ao
          usar o Azulli, você concorda com as práticas descritas aqui e nos{" "}
          <Link href={LEGAL_PATHS.terms}>Termos de uso</Link>.
        </p>

        <h2>1. Quem somos</h2>
        <p>
          Controlador: Azulli — gestão financeira para pequenas empresas.
          Contato do encarregado / canal LGPD:{" "}
          <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
        </p>

        <h2>2. Dados que coletamos</h2>
        <ul>
          <li>
            <strong className="text-foreground">Cadastro:</strong> nome, e-mail,
            telefone (WhatsApp), senha (armazenada com hash pelo provedor de
            autenticação).
          </li>
          <li>
            <strong className="text-foreground">Empresa:</strong> razão social ou
            nome, CNPJ/CPF, endereço, regime tributário, logotipo e dados de
            faturamento.
          </li>
          <li>
            <strong className="text-foreground">Operação:</strong> lançamentos
            financeiros, clientes, fornecedores, produtos, funcionários, metas,
            lembretes, eventos exibidos na agenda financeira, conversas com o
            assistente IA e arquivos importados (ex.: OFX).
          </li>
          <li>
            <strong className="text-foreground">Notificações:</strong> preferências
            de e-mail, histórico de envios, leitura de avisos globais da
            plataforma e dados necessários para alertas in-app (lembretes e
            prazos de metas).
          </li>
          <li>
            <strong className="text-foreground">Pagamentos:</strong> status de
            assinatura e identificadores no gateway (Asaas). Não armazenamos
            número completo de cartão.
          </li>
          <li>
            <strong className="text-foreground">Técnicos:</strong> cookies
            essenciais de sessão, preferência de tema, logs de acesso e
            metadados de e-mails transacionais.
          </li>
        </ul>

        <h2>3. Como usamos os dados</h2>
        <ul>
          <li>Prestar e melhorar o serviço contratado.</li>
          <li>Autenticar usuários e garantir segurança da conta.</li>
          <li>
            Enviar comunicações transacionais e, quando ativadas, e-mails de
            insights, cobrança e alertas de vencidos conforme suas preferências.
          </li>
          <li>
            Exibir notificações in-app (sino) sobre lembretes, metas e avisos
            operacionais do Azulli.
          </li>
          <li>
            Calcular datas, vencimentos, gráficos e agenda no fuso horário de
            Brasília (America/Sao_Paulo).
          </li>
          <li>Processar pagamentos e cumprir obrigações legais.</li>
          <li>
            Processar consultas ao assistente IA com provedores de IA (Google
            Gemini), apenas com o conteúdo necessário para a resposta.
          </li>
        </ul>

        <h2>4. Bases legais (LGPD)</h2>
        <p>
          Execução de contrato, legítimo interesse (segurança, melhoria do
          produto), consentimento (quando aplicável a comunicações opcionais) e
          cumprimento de obrigação legal.
        </p>

        <h2>5. Compartilhamento</h2>
        <p>Podemos compartilhar dados com:</p>
        <ul>
          <li>
            <strong className="text-foreground">Supabase</strong> — hospedagem de
            banco de dados e autenticação.
          </li>
          <li>
            <strong className="text-foreground">Vercel</strong> — hospedagem da
            aplicação.
          </li>
          <li>
            <strong className="text-foreground">Asaas</strong> — cobrança e
            assinaturas.
          </li>
          <li>
            <strong className="text-foreground">Resend</strong> — envio de
            e-mails transacionais.
          </li>
          <li>
            <strong className="text-foreground">Google (Gemini)</strong> —
            processamento de linguagem natural no assistente e categorização.
          </li>
        </ul>
        <p>
          Não vendemos dados pessoais. Suboperadores são escolhidos com critérios
          de segurança e contratos adequados.
        </p>

        <h2>6. Cookies e armazenamento local</h2>
        <p>
          Utilizamos cookies essenciais para manter sua sessão autenticada
          (incluindo domínio compartilhado entre subdomínios use e trial),
          cookies de preferência (ex.: tema claro/escuro) e, quando instalado,
          cache do PWA. Não utilizamos cookies de publicidade comportamental.
          Você pode gerenciar cookies no navegador; desabilitar cookies
          essenciais pode impedir o login.
        </p>

        <h2>7. Retenção</h2>
        <p>
          Mantemos dados enquanto a conta estiver ativa ou conforme necessário
          para cumprir obrigações legais (ex.: registros financeiros). Após
          exclusão da conta, removemos ou anonimizamos dados pessoais, exceto
          quando a retenção seja exigida por lei.
        </p>

        <h2>8. Seus direitos (LGPD)</h2>
        <p>Você pode, mediante solicitação:</p>
        <ul>
          <li>Confirmar a existência de tratamento e acessar seus dados.</li>
          <li>Corrigir dados incompletos ou desatualizados.</li>
          <li>
            Solicitar exportação — em{" "}
            <strong className="text-foreground">
              Configurações → Conta → Baixar meus dados
            </strong>
            .
          </li>
          <li>
            Solicitar exclusão — em{" "}
            <strong className="text-foreground">
              Configurações → Conta → Excluir minha conta
            </strong>
            .
          </li>
          <li>Revogar consentimentos e opor-se a tratamentos, quando cabível.</li>
        </ul>
        <p>
          Para outras solicitações, envie e-mail a{" "}
          <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
        </p>

        <h2>9. Exclusão de conta</h2>
        <p>
          Ao excluir sua conta, removemos seu usuário de autenticação. Se você é
          o único administrador da empresa, todos os dados da empresa (lançamentos,
          clientes, etc.) são removidos em cascata. Se há outros membros na
          empresa, apenas seu vínculo é removido.
        </p>

        <h2>10. Segurança</h2>
        <p>
          Adotamos medidas técnicas e organizacionais como criptografia em
          trânsito (HTTPS), isolamento multi-tenant (RLS), autenticação segura e
          controle de acesso. Nenhum sistema é 100% seguro; notifique-nos em caso
          de incidente suspeito.
        </p>

        <h2>11. Menores</h2>
        <p>
          O Azulli não é destinado a menores de 18 anos. Não coletamos
          intencionalmente dados de menores.
        </p>

        <h2>12. Alterações</h2>
        <p>
          Esta política pode ser atualizada. A data no topo indica a versão
          vigente. Alterações relevantes serão comunicadas por e-mail ou aviso
          na plataforma.
        </p>
      </LegalProse>
    </LegalLayoutShell>
  )
}
