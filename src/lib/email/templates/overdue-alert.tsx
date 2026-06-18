import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components"

import type { OverdueAlertEmailPayload } from "../types"

export function OverdueAlertEmail({
  payload,
}: {
  payload: OverdueAlertEmailPayload
}) {
  const preview = `${payload.items.length} lançamento(s) vencido(s) no Azulli`

  return (
    <Html lang="pt-BR">
      <Head />
      <Preview>{preview}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Lançamentos vencidos</Heading>
          <Text style={text}>Olá, {payload.greetingName}!</Text>
          <Text style={text}>
            Você tem {payload.items.length} lançamento(s) vencido(s) em{" "}
            <strong>{payload.tenantName}</strong> — total{" "}
            <strong>{payload.totalOverdue}</strong>.
          </Text>
          {payload.items.slice(0, 8).map((item) => (
            <Section key={item.id} style={itemBox}>
              <Text style={itemTitle}>{item.description}</Text>
              <Text style={itemMeta}>
                {item.typeLabel} · {item.amount} · venc. {item.dueDateLabel}
              </Text>
            </Section>
          ))}
          <Section style={btnWrap}>
            <Link href={payload.appUrl} style={button}>Ver vencidos</Link>
          </Section>
          <Text style={footer}>
            <Link href={payload.unsubscribeUrl} style={link}>
              Desativar alertas de vencidos
            </Link>
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

const main = { backgroundColor: "#f4f6f8", fontFamily: "sans-serif" }
const container = {
  backgroundColor: "#ffffff",
  margin: "40px auto",
  padding: "32px",
  borderRadius: "12px",
  maxWidth: "520px",
}
const h1 = { color: "#0f2d4a", fontSize: "22px", margin: "0 0 16px" }
const text = { color: "#334155", fontSize: "15px", lineHeight: "1.5", margin: "0 0 12px" }
const itemBox = {
  border: "1px solid #e2e8f0",
  borderRadius: "8px",
  padding: "10px 12px",
  marginBottom: "8px",
}
const itemTitle = { fontSize: "14px", fontWeight: 600, margin: "0 0 4px", color: "#0f172a" }
const itemMeta = { fontSize: "12px", color: "#64748b", margin: 0 }
const btnWrap = { margin: "24px 0" }
const button = {
  backgroundColor: "#2563eb",
  color: "#fff",
  padding: "12px 20px",
  borderRadius: "8px",
  textDecoration: "none",
  fontWeight: 600,
}
const footer = { fontSize: "12px", color: "#64748b", marginTop: "24px" }
const link = { color: "#2563eb" }
