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

import type { TrialEndingPayload } from "../types"

export function TrialEndingEmail({ payload }: { payload: TrialEndingPayload }) {
  const preview =
    payload.daysLeft <= 1
      ? "Seu trial do Azulli acaba hoje"
      : `Faltam ${payload.daysLeft} dias do trial`

  return (
    <Html lang="pt-BR">
      <Head />
      <Preview>{preview}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Trial quase no fim</Heading>
          <Text style={text}>Olá, {payload.greetingName}!</Text>
          <Text style={text}>
            O trial gratuito de <strong>{payload.tenantName}</strong>{" "}
            {payload.daysLeft === 0
              ? "termina hoje"
              : payload.daysLeft === 1
                ? "termina amanhã"
                : `termina em ${payload.daysLeft} dias`}{" "}
            ({payload.trialEndsLabel}).
          </Text>
          <Text style={text}>
            Assine um plano para continuar com lançamentos, importação OFX,
            previsão de caixa e assistente IA sem interrupção.
          </Text>
          <Section style={btnWrap}>
            <Link href={payload.billingUrl} style={button}>
              Ver planos e assinar
            </Link>
          </Section>
          <Text style={footer}>
            <Link href={payload.unsubscribeUrl} style={link}>
              Desativar avisos de trial
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
