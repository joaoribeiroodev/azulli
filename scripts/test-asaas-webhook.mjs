/**
 * Testa conectividade do webhook Asaas em produção (ou URL customizada).
 *
 * Uso:
 *   ASAAS_WEBHOOK_TOKEN=xxx npm run test:asaas-webhook
 *   ASAAS_WEBHOOK_URL=https://use.azulli.app.br/api/webhooks/asaas npm run test:asaas-webhook
 *
 * Códigos esperados:
 *   401 — token diferente entre Asaas e Vercel (ou header errado)
 *   400 — token OK, mas JSON sem id/event (ex.: Body "{}")
 *   200 — endpoint + token OK (evento de teste ignorado pelo handler)
 */
const token = process.env.ASAAS_WEBHOOK_TOKEN?.trim()
const url =
  process.env.ASAAS_WEBHOOK_URL?.trim() ??
  "https://use.azulli.app.br/api/webhooks/asaas"

if (!token) {
  console.error("Defina ASAAS_WEBHOOK_TOKEN (mesmo valor na Vercel e no Asaas).")
  process.exit(1)
}

const eventId = `test_connectivity_${Date.now()}`

const payload = {
  id: eventId,
  event: "WEBHOOK_TEST",
  dateCreated: new Date().toISOString(),
}

console.log(`POST ${url}`)
console.log(`event id: ${eventId}`)

const res = await fetch(url, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "asaas-access-token": token,
  },
  body: JSON.stringify(payload),
})

const text = await res.text()

if (res.status === 401) {
  console.error("FAIL 401 Unauthorized — token Asaas ≠ ASAAS_WEBHOOK_TOKEN na Vercel")
  console.error("Header esperado: asaas-access-token")
  process.exit(1)
}

if (res.status === 400) {
  console.error("FAIL 400 Bad Request — token provavelmente OK; corpo JSON inválido")
  console.error("Resposta:", text)
  process.exit(1)
}

if (!res.ok) {
  console.error(`FAIL HTTP ${res.status}`)
  console.error("Resposta:", text)
  process.exit(1)
}

console.log(`ok  HTTP ${res.status}`)
console.log("Resposta:", text)
console.log("\nWebhook Asaas: token e endpoint OK.")
