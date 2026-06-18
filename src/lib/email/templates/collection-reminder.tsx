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
  CollectionReminderItem,
  CollectionReminderPayload,
} from "@/lib/email/types"

const colors = {
  brand: "#2563eb",
  brandInk: "#1e3a8a",
  text: "#0f172a",
  muted: "#64748b",
  border: "#e2e8f0",
  bg: "#f8fafc",
  destructive: "#dc2626",
  destructiveSoft: "#fee2e2",
  warning: "#d97706",
  warningSoft: "#fef3c7",
} as const

export function CollectionReminderEmail({
  payload,
}: {
  payload: CollectionReminderPayload
}) {
  const overdueCount = payload.overdueItems.length
  const upcomingCount = payload.upcomingItems.length
  const preview =
    overdueCount > 0
      ? `${overdueCount} cobrança(s) vencida(s) — ${payload.totalOverdue}`
      : `${upcomingCount} vencimento(s) em 3 dias — ${payload.totalUpcoming}`

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
            Olá, {payload.greetingName}
          </Heading>
          <Text style={paragraphStyle}>
            Hora de cobrar? Aqui está o que precisa da sua atenção hoje.
          </Text>

          {overdueCount > 0 && (
            <Section style={blockStyle}>
              <Text style={blockTitleDestructive}>
                Vencidos — {payload.totalOverdue}
              </Text>
              {payload.overdueItems.map((item) => (
                <ItemRow key={item.id} item={item} variant="overdue" />
              ))}
            </Section>
          )}

          {upcomingCount > 0 && (
            <Section style={blockStyle}>
              <Text style={blockTitleWarning}>
                Vence em 3 dias — {payload.totalUpcoming}
              </Text>
              {payload.upcomingItems.map((item) => (
                <ItemRow key={item.id} item={item} variant="upcoming" />
              ))}
            </Section>
          )}

          <Section style={{ textAlign: "center", marginTop: "24px" }}>
            <Button href={payload.appUrl} style={buttonStyle}>
              Ver lançamentos
            </Button>
          </Section>

          <Hr style={hrStyle} />
          <Text style={footerStyle}>
            <Link href={payload.unsubscribeUrl} style={linkStyle}>
              Parar estes emails
            </Link>
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

function ItemRow({
  item,
  variant,
}: {
  item: CollectionReminderItem
  variant: "overdue" | "upcoming"
}) {
  const bg =
    variant === "overdue" ? colors.destructiveSoft : colors.warningSoft
  const accent = variant === "overdue" ? colors.destructive : colors.warning

  return (
    <Section
      style={{
        backgroundColor: bg,
        borderRadius: "8px",
        padding: "12px 14px",
        marginBottom: "8px",
      }}
    >
      <Text style={{ fontSize: "14px", fontWeight: 600, color: colors.text, margin: "0 0 4px" }}>
        {item.amount} · {item.description}
      </Text>
      <Text style={{ fontSize: "12px", color: colors.muted, margin: 0 }}>
        {item.customerName ? `${item.customerName} · ` : ""}
        {item.dueDateLabel} ·{" "}
        <span style={{ color: accent, fontWeight: 600 }}>{item.statusLabel}</span>
      </Text>
    </Section>
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
  backgroundColor: "#ffffff",
  border: `1px solid ${colors.border}`,
  borderRadius: "12px",
  maxWidth: "520px",
  margin: "0 auto",
  padding: "28px 24px",
}

const headerStyle = { marginBottom: "16px" }
const brandStyle = {
  fontSize: "13px",
  fontWeight: 700,
  color: colors.brand,
  margin: 0,
}
const tenantStyle = { fontSize: "12px", color: colors.muted, margin: "2px 0 0" }
const headingStyle = {
  fontSize: "22px",
  fontWeight: 700,
  color: colors.brandInk,
  margin: "0 0 8px",
}
const paragraphStyle = {
  fontSize: "15px",
  lineHeight: "1.5",
  color: colors.muted,
  margin: "0 0 20px",
}
const blockStyle = { marginBottom: "16px" }
const blockTitleDestructive = {
  fontSize: "13px",
  fontWeight: 700,
  color: colors.destructive,
  margin: "0 0 8px",
}
const blockTitleWarning = {
  fontSize: "13px",
  fontWeight: 700,
  color: colors.warning,
  margin: "0 0 8px",
}
const buttonStyle = {
  backgroundColor: colors.brand,
  color: "#ffffff",
  borderRadius: "8px",
  fontSize: "14px",
  fontWeight: 600,
  padding: "12px 24px",
  textDecoration: "none",
}
const hrStyle = { borderColor: colors.border, margin: "24px 0 16px" }
const footerStyle = { fontSize: "12px", color: colors.muted, textAlign: "center" as const }
const linkStyle = { color: colors.brand, textDecoration: "underline" }
