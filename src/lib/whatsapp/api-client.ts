import "server-only"

type SendTextParams = {
  phone: string
  message: string
}

function getProvider(): "evolution" | "zapi" {
  const p = process.env.WHATSAPP_PROVIDER?.toLowerCase()
  if (p === "zapi" || p === "z-api") return "zapi"
  return "evolution"
}

function normalizeBaseUrl(raw: string): string {
  const trimmed = raw.trim().replace(/\/$/, "")
  if (/^https?:\/\//i.test(trimmed)) return trimmed
  return `https://${trimmed}`
}

/** Envia texto via Evolution API ou Z-API. */
export async function sendWhatsAppText(params: SendTextParams): Promise<void> {
  const provider = getProvider()
  const phone = params.phone.replace(/\D/g, "")

  if (provider === "zapi") {
    const instance = process.env.ZAPI_INSTANCE_ID
    const token = process.env.ZAPI_TOKEN
    const base = normalizeBaseUrl(process.env.ZAPI_BASE_URL ?? "https://api.z-api.io")
    if (!instance || !token) {
      throw new Error("[whatsapp] ZAPI_INSTANCE_ID ou ZAPI_TOKEN não configurados.")
    }
    const url = `${base}/instances/${instance}/token/${token}/send-text`
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, message: params.message }),
    })
    if (!res.ok) {
      const err = await res.text()
      throw new Error(`[whatsapp/zapi] ${res.status} ${err}`)
    }
    return
  }

  const base = normalizeBaseUrl(process.env.EVOLUTION_API_URL ?? "")
  const instance = process.env.EVOLUTION_INSTANCE_NAME
  const apiKey = process.env.EVOLUTION_API_KEY
  if (!base || !instance || !apiKey) {
    throw new Error(
      "[whatsapp] EVOLUTION_API_URL, EVOLUTION_INSTANCE_NAME ou EVOLUTION_API_KEY não configurados."
    )
  }
  const url = `${base}/message/sendText/${instance}`
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: apiKey,
    },
    body: JSON.stringify({
      number: phone,
      text: params.message,
    }),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`[whatsapp/evolution] ${res.status} ${err}`)
  }
}
