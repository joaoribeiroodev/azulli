import Link from "next/link"

import { LegalLayoutShell } from "@/components/legal/legal-layout-shell"
import { LegalProse } from "@/components/legal/legal-prose"
import { LEGAL_PATHS } from "@/lib/legal/paths"

export const metadata = {
  title: "Termos de uso — Azulli",
  description:
    "Termos de uso do Azulli — gestão financeira para MEIs e pequenas empresas.",
}

export default function TermosDeUsoPage() {
  return (
    <LegalLayoutShell>
      <LegalProse>
        <header className="space-y-2 !mt-0">
          <h1>Termos de uso</h1>
          <p className="text-xs text-muted-foreground">
            Última atualização: 17 de junho de 2026
          </p>
        </header>

        <p>
          Estes Termos de Uso (&quot;Termos&quot;) regulam o acesso e a utilização
          da plataforma Azulli (&quot;Azulli&quot;, &quot;nós&quot;), disponível em
          azulli.app.br e subdomínios relacionados. Ao criar uma conta ou usar o
          serviço, você (&quot;Usuário&quot;, &quot;você&quot;) concorda com estes
          Termos e com nossa{" "}
          <Link href={LEGAL_PATHS.privacy}>Política de Privacidade</Link>.
        </p>

        <h2>1. O serviço</h2>
        <p>
          O Azulli é um software de gestão financeira voltado a MEIs e pequenas
          empresas, incluindo lançamentos, importação de extratos, previsão de
          caixa, assistente com IA e funcionalidades complementares. O serviço é
          oferecido em modelo SaaS (software como serviço), com planos gratuitos
          de trial e planos pagos.
        </p>

        <h2>2. Cadastro e conta</h2>
        <ul>
          <li>
            Você deve fornecer informações verdicas e manter seus dados de
            cadastro atualizados.
          </li>
          <li>
            A conta é pessoal e intransferível. Você é responsável por manter a
            confidencialidade da senha e por todas as atividades realizadas na
            conta.
          </li>
          <li>
            O cadastro pode exigir e-mail válido e, opcionalmente, telefone para
            suporte e notificações transacionais.
          </li>
        </ul>

        <h2>3. Trial e planos</h2>
        <p>
          O período de trial gratuito, duração, funcionalidades incluídas e
          preços dos planos são informados no site e na área de assinatura. Após
          o trial, o acesso a funcionalidades premium pode ser limitado até a
          contratação de um plano ativo. Cobranças recorrentes, quando
          aplicáveis, são processadas pelo gateway de pagamento integrado
          (Asaas).
        </p>

        <h2>4. Uso aceitável</h2>
        <p>Você concorda em não:</p>
        <ul>
          <li>
            Utilizar o Azulli para fins ilegais, fraudulentos ou que violem
            direitos de terceiros.
          </li>
          <li>
            Tentar acessar áreas ou dados de outros usuários, contornar
            segurança, realizar engenharia reversa ou sobrecarregar a
            infraestrutura.
          </li>
          <li>
            Inserir malware, spam ou conteúdo que comprometa a estabilidade do
            serviço.
          </li>
        </ul>

        <h2>5. Conteúdo e dados do usuário</h2>
        <p>
          Você mantém a titularidade dos dados financeiros e cadastrais que
          insere na plataforma. Concede ao Azulli licença limitada para
          processar esses dados exclusivamente para prestar o serviço, conforme
          a Política de Privacidade e a LGPD.
        </p>
        <p>
          Você é responsável pela legalidade dos dados inseridos (incluindo
          dados de clientes, fornecedores e funcionários) e por obter
          consentimentos necessários quando aplicável.
        </p>

        <h2>6. Assistente IA</h2>
        <p>
          Respostas do assistente IA são geradas automaticamente e podem conter
          imprecisões. Não constituem assessoria financeira, contábil ou
          jurídica. Sempre valide informações críticas antes de tomar decisões
          de negócio.
        </p>

        <h2>7. Disponibilidade e suporte</h2>
        <p>
          Buscamos alta disponibilidade, mas o serviço pode sofrer
          interrupções por manutenção, atualizações ou fatores fora do nosso
          controle. O suporte é prestado pelos canais indicados no site
          (WhatsApp, e-mail).
        </p>

        <h2>8. Limitação de responsabilidade</h2>
        <p>
          Na extensão permitida pela lei, o Azulli não se responsabiliza por
          perdas indiretas, lucros cessantes ou decisões tomadas com base em
          informações exibidas na plataforma. Nossa responsabilidade total, quando
          aplicável, limita-se ao valor pago pelo Usuário nos últimos 12 meses
          pelo plano contratado.
        </p>

        <h2>9. Cancelamento e exclusão</h2>
        <p>
          Você pode cancelar a assinatura e solicitar exclusão da conta em{" "}
          <strong className="text-foreground">Configurações → Conta</strong>.
          A exclusão remove seus dados pessoais e, quando você é o único
          administrador, os dados da empresa vinculada, conforme descrito na
          Política de Privacidade.
        </p>

        <h2>10. Alterações</h2>
        <p>
          Podemos atualizar estes Termos. Mudanças relevantes serão comunicadas
          por e-mail ou aviso na plataforma. O uso continuado após a vigência
          das alterações constitui aceite.
        </p>

        <h2>11. Legislação aplicável</h2>
        <p>
          Estes Termos são regidos pelas leis da República Federativa do Brasil.
          Fica eleito o foro da comarca de Salvador/BA, salvo disposição legal
          específica em favor do consumidor.
        </p>

        <h2>12. Contato</h2>
        <p>
          Dúvidas sobre estes Termos:{" "}
          <a href="mailto:oi@azulli.app.br">oi@azulli.app.br</a>
        </p>
      </LegalProse>
    </LegalLayoutShell>
  )
}
