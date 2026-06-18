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

import type {
  WeeklyInsightAlert,
  WeeklyInsightCard,
  WeeklyInsightPayload,
} from "@/lib/email/types"

// ---------------------------------------------------------------------------
// Cores — hex direto. Email não suporta CSS vars / dark mode confiável.
// ---------------------------------------------------------------------------

const colors = {
  brand: "#2563eb",
  brandSoft: "#dbeafe",
  brandInk: "#1e3a8a",
  text: "#0f172a",
  muted: "#64748b",
  border: "#e2e8f0",
  bg: "#f8fafc",
  card: "#ffffff",
  success: "#16a34a",
  successSoft: "#dcfce7",
  destructive: "#dc2626",
  destructiveSoft: "#fee2e2",
  warning: "#d97706",
  warningSoft: "#fef3c7",
} as const

// ---------------------------------------------------------------------------
// Componente principal
// ---------------------------------------------------------------------------

export function WeeklyInsightsEmail({
  payload,
}: {
  payload: WeeklyInsightPayload
}) {
  const previewText = payload.primaryAlert
    ? `${payload.primaryAlert.title} · ${payload.weekRangeLabel}`
    : `Seu fechamento da semana (${payload.weekRangeLabel})`

  return (
    <Html lang="pt-BR">
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={bodyStyle}>
        <Container style={containerStyle}>
          {/* Header */}
          <Section style={headerStyle}>
            <Text style={brandStyle}>Azulli</Text>
            <Text style={tenantNameStyle}>{payload.tenantName}</Text>
          </Section>

          {/* Greeting */}
          <Section>
            <Heading as="h1" style={headingStyle}>
              Olá, {payload.greetingName} 👋
            </Heading>
            <Text style={paragraphStyle}>
              Aqui vai um resumo rápido da sua semana ({payload.weekRangeLabel}).
            </Text>
          </Section>

          <Hr style={hrStyle} />

          {/* Cards */}
          <Section style={cardsSectionStyle}>
            {payload.cards.map((card, i) => (
              <CardItem key={i} card={card} />
            ))}
          </Section>

          {/* Alert acionável */}
          {payload.primaryAlert && (
            <>
              <Hr style={hrStyle} />
              <AlertBlock alert={payload.primaryAlert} />
            </>
          )}

          {/* CTA */}
          <Hr style={hrStyle} />
          <Section style={{ textAlign: "center", padding: "12px 0" }}>
            <Button href={payload.appUrl} style={buttonStyle}>
              Ver dashboard completo
            </Button>
          </Section>

          {/* Footer */}
          <Hr style={hrStyle} />
          <Section>
            <Text style={footerStyle}>
              Você está recebendo este email porque ativou os insights
              semanais do Azulli. Pra parar de receber,{" "}
              <Link href={payload.unsubscribeUrl} style={linkStyle}>
                clique aqui
              </Link>
              .
            </Text>
            <Text style={footerStyle}>
              <Link href={payload.appUrl} style={linkStyle}>
                Azulli
              </Link>{" "}
              · Assistente financeiro pra MEIs e pequenos empresários.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

// ---------------------------------------------------------------------------
// Card individual
// ---------------------------------------------------------------------------

function CardItem({ card }: { card: WeeklyInsightCard }) {
  const trend = card.trend
  const trendColor =
    trend &&
    (trend.direction === "flat"
      ? colors.muted
      : (trend.direction === "up") === trend.upIsGood
        ? colors.success
        : colors.destructive)

  const arrow =
    trend?.direction === "up"
      ? "▲"
      : trend?.direction === "down"
        ? "▼"
        : "—"

  return (
    <Section style={cardStyle}>
      <Text style={cardLabelStyle}>{card.label}</Text>
      <Text style={cardValueStyle}>{card.value}</Text>

      {trend && (
        <Text style={{ ...cardTrendStyle, color: trendColor }}>
          {arrow} {trend.label}
        </Text>
      )}

      {card.description && (
        <Text style={cardDescriptionStyle}>{card.description}</Text>
      )}
    </Section>
  )
}

// ---------------------------------------------------------------------------
// Bloco de alerta
// ---------------------------------------------------------------------------

function AlertBlock({ alert }: { alert: WeeklyInsightAlert }) {
  const palette =
    alert.severity === "critical"
      ? { bg: colors.destructiveSoft, border: colors.destructive, text: colors.destructive }
      : alert.severity === "warning"
        ? { bg: colors.warningSoft, border: colors.warning, text: colors.warning }
        : { bg: colors.brandSoft, border: colors.brand, text: colors.brandInk }

  return (
    <Section
      style={{
        backgroundColor: palette.bg,
        borderLeft: `4px solid ${palette.border}`,
        borderRadius: "6px",
        padding: "16px 18px",
        margin: "8px 0",
      }}
    >
      <Text style={{ ...alertTitleStyle, color: palette.text }}>
        {alert.title}
      </Text>
      <Text style={alertMessageStyle}>{alert.message}</Text>
      <Link
        href={alert.cta.href}
        style={{
          ...alertLinkStyle,
          color: palette.text,
          borderColor: palette.border,
        }}
      >
        {alert.cta.label} →
      </Link>
    </Section>
  )
}

// ---------------------------------------------------------------------------
// Estilos inline
// ---------------------------------------------------------------------------

const bodyStyle = {
  backgroundColor: colors.bg,
  fontFamily:
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
  margin: 0,
  padding: 0,
} as const

const containerStyle = {
  backgroundColor: colors.card,
  margin: "0 auto",
  padding: "32px 28px",
  maxWidth: "560px",
  border: `1px solid ${colors.border}`,
  borderRadius: "12px",
  marginTop: "24px",
  marginBottom: "24px",
} as const

const headerStyle = {
  borderBottom: `1px solid ${colors.border}`,
  paddingBottom: "16px",
  marginBottom: "16px",
} as const

const brandStyle = {
  fontSize: "20px",
  fontWeight: 800,
  color: colors.brandInk,
  margin: 0,
  lineHeight: "24px",
} as const

const tenantNameStyle = {
  fontSize: "12px",
  color: colors.muted,
  margin: "2px 0 0 0",
} as const

const headingStyle = {
  fontSize: "22px",
  fontWeight: 700,
  color: colors.text,
  margin: "8px 0 6px 0",
  lineHeight: "28px",
} as const

const paragraphStyle = {
  fontSize: "14px",
  color: colors.muted,
  margin: 0,
  lineHeight: "20px",
} as const

const hrStyle = {
  borderColor: colors.border,
  margin: "20px 0",
} as const

const cardsSectionStyle = {
  display: "block",
} as const

const cardStyle = {
  backgroundColor: colors.bg,
  border: `1px solid ${colors.border}`,
  borderRadius: "10px",
  padding: "14px 16px",
  marginBottom: "10px",
} as const

const cardLabelStyle = {
  fontSize: "12px",
  fontWeight: 500,
  color: colors.muted,
  margin: 0,
  textTransform: "uppercase" as const,
  letterSpacing: "0.04em",
} as const

const cardValueStyle = {
  fontSize: "22px",
  fontWeight: 700,
  color: colors.text,
  margin: "4px 0 0 0",
  lineHeight: "26px",
} as const

const cardTrendStyle = {
  fontSize: "13px",
  fontWeight: 600,
  margin: "4px 0 0 0",
} as const

const cardDescriptionStyle = {
  fontSize: "12px",
  color: colors.muted,
  margin: "4px 0 0 0",
  lineHeight: "16px",
} as const

const alertTitleStyle = {
  fontSize: "14px",
  fontWeight: 700,
  margin: "0 0 6px 0",
  lineHeight: "18px",
} as const

const alertMessageStyle = {
  fontSize: "13px",
  color: colors.text,
  margin: "0 0 10px 0",
  lineHeight: "18px",
} as const

const alertLinkStyle = {
  fontSize: "13px",
  fontWeight: 600,
  textDecoration: "none",
  borderBottom: "1px solid",
  paddingBottom: "1px",
} as const

const buttonStyle = {
  backgroundColor: colors.brand,
  color: "#ffffff",
  fontSize: "14px",
  fontWeight: 600,
  padding: "12px 24px",
  borderRadius: "8px",
  textDecoration: "none",
  display: "inline-block",
} as const

const footerStyle = {
  fontSize: "11px",
  color: colors.muted,
  margin: "8px 0",
  lineHeight: "16px",
  textAlign: "center" as const,
} as const

const linkStyle = {
  color: colors.brand,
  textDecoration: "none",
} as const
