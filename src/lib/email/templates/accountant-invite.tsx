import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components"

import type { AccountantInvitePayload } from "../types"

const colors = {
  brand: "#2563eb",
  brandInk: "#1e3a8a",
  text: "#0f172a",
  muted: "#64748b",
  border: "#e2e8f0",
  bg: "#f8fafc",
  card: "#ffffff",
  soft: "#dbeafe",
} as const

export function AccountantInviteEmail({
  payload,
}: {
  payload: AccountantInvitePayload
}) {
  const preview = payload.isNewUser
    ? `${payload.ownerName} convidou você para acessar ${payload.tenantName} no Azulli`
    : `Você tem acesso de contador em ${payload.tenantName}`

  return (
    <Html lang="pt-BR">
      <Head />
      <Preview>{preview}</Preview>
      <Body style={bodyStyle}>
        <Container style={containerStyle}>
          <Section style={headerStyle}>
            <Text style={brandStyle}>Azulli</Text>
            <Text style={tenantStyle}>{payload.tenantName}</Text>
          </Section>

          <Heading as="h1" style={headingStyle}>
            Olá, {payload.accountantName}
          </Heading>

          {payload.isNewUser ? (
            <>
              <Text style={paragraphStyle}>
                <strong>{payload.ownerName}</strong> convidou você para
                acompanhar o financeiro de{" "}
                <strong>{payload.tenantName}</strong> no Azulli — gestão
                financeira para MEIs e pequenas empresas.
              </Text>
              <Text style={paragraphStyle}>
                Como contador, você terá uma área dedicada com visão{" "}
                <strong>read-only</strong>: resumo do mês, lançamentos e
                exportação em Excel e JSON para fechamento.
              </Text>
              <Section style={listBoxStyle}>
                <Text style={listTitleStyle}>Na área Contador você pode:</Text>
                <Text style={listItemStyle}>
                  • Ver receitas, despesas e saldo do período
                </Text>
                <Text style={listItemStyle}>
                  • Filtrar lançamentos por mês
                </Text>
                <Text style={listItemStyle}>
                  • Exportar pacote formatado para o escritório
                </Text>
                <Text style={listItemStyle}>
                  • Consultar dados sem alterar lançamentos
                </Text>
              </Section>
              <Section style={{ textAlign: "center", padding: "8px 0 4px" }}>
                <Button href={payload.inviteUrl!} style={buttonStyle}>
                  Aceitar convite e criar senha
                </Button>
              </Section>
              <Text style={mutedStyle}>
                O link é pessoal e expira em alguns dias. Se não foi você,
                ignore este e-mail.
              </Text>
            </>
          ) : (
            <>
              <Text style={paragraphStyle}>
                <strong>{payload.ownerName}</strong> adicionou você como
                contador de <strong>{payload.tenantName}</strong> no Azulli.
              </Text>
              <Text style={paragraphStyle}>
                Entre com o e-mail <strong>{payload.accountantEmail}</strong> e
                acesse a aba <strong>Contador</strong> para ver lançamentos,
                resumo mensal e exportações.
              </Text>
              <Section style={{ textAlign: "center", padding: "8px 0 4px" }}>
                <Button href={payload.contadorUrl} style={buttonStyle}>
                  Abrir área do contador
                </Button>
              </Section>
              <Text style={mutedStyle}>
                Se ainda não está logado, use{" "}
                <Link href={payload.loginUrl} style={linkStyle}>
                  entrar na conta
                </Link>{" "}
                com o mesmo e-mail do convite.
              </Text>
            </>
          )}

          <Hr style={hrStyle} />
          <Text style={footerStyle}>
            Azulli · financeiro simples para o seu negócio
            <br />
            <Link href={payload.appUrl} style={linkStyle}>
              {payload.appUrl.replace(/^https?:\/\//, "")}
            </Link>
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

const bodyStyle = {
  backgroundColor: colors.bg,
  fontFamily:
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  margin: 0,
  padding: "24px 12px",
}
const containerStyle = {
  backgroundColor: colors.card,
  borderRadius: "12px",
  border: `1px solid ${colors.border}`,
  maxWidth: "520px",
  margin: "0 auto",
  padding: "32px 28px",
}
const headerStyle = {
  marginBottom: "20px",
}
const brandStyle = {
  color: colors.brand,
  fontSize: "18px",
  fontWeight: 700,
  margin: "0 0 4px",
}
const tenantStyle = {
  color: colors.muted,
  fontSize: "13px",
  margin: 0,
}
const headingStyle = {
  color: colors.brandInk,
  fontSize: "22px",
  fontWeight: 700,
  lineHeight: "1.3",
  margin: "0 0 16px",
}
const paragraphStyle = {
  color: colors.text,
  fontSize: "15px",
  lineHeight: "1.55",
  margin: "0 0 14px",
}
const listBoxStyle = {
  backgroundColor: colors.soft,
  borderRadius: "8px",
  padding: "14px 16px",
  margin: "4px 0 16px",
}
const listTitleStyle = {
  color: colors.brandInk,
  fontSize: "13px",
  fontWeight: 600,
  margin: "0 0 8px",
}
const listItemStyle = {
  color: colors.text,
  fontSize: "14px",
  lineHeight: "1.5",
  margin: "0 0 4px",
}
const buttonStyle = {
  backgroundColor: colors.brand,
  borderRadius: "8px",
  color: "#ffffff",
  fontSize: "15px",
  fontWeight: 600,
  textDecoration: "none",
  padding: "12px 24px",
  display: "inline-block",
}
const mutedStyle = {
  color: colors.muted,
  fontSize: "13px",
  lineHeight: "1.5",
  margin: "16px 0 0",
  textAlign: "center" as const,
}
const hrStyle = { borderColor: colors.border, margin: "24px 0 16px" }
const footerStyle = {
  color: colors.muted,
  fontSize: "12px",
  lineHeight: "1.5",
  margin: 0,
  textAlign: "center" as const,
}
const linkStyle = { color: colors.brand, textDecoration: "underline" }
