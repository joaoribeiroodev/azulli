/**
 * Testa conexão com a API Asaas (sandbox ou produção).
 *
 * Uso: npm run test:asaas
 * Requer: ASAAS_API_KEY e ASAAS_BASE_URL no .env.local
 */

import { readFileSync, existsSync } from "node:fs"
import { resolve, dirname } from "node:path"
import { fileURLToPath } from "node:url"

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const ENV_LOCAL = resolve(ROOT, ".env.local")

function loadEnvLocal() {
  if (!existsSync(ENV_LOCAL)) {
    console.warn("⚠  .env.local não encontrado")
    return
  }
  const content = readFileSync(ENV_LOCAL, "utf8").replace(/^\uFEFF/, "")
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith("#")) continue
    const eq = trimmed.indexOf("=")
    if (eq === -1) continue
    const key = trimmed.slice(0, eq).trim()
    let value = trimmed.slice(eq + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    process.env[key] = value
  }
}

loadEnvLocal()

const baseUrl = process.env.ASAAS_BASE_URL
const rawKey = process.env.ASAAS_API_KEY

if (!baseUrl || !rawKey) {
  console.error("❌ Defina ASAAS_BASE_URL e ASAAS_API_KEY no .env.local")
  process.exit(1)
}

const apiKey = rawKey.startsWith("$") ? rawKey : `$${rawKey}`
const isProd =
  baseUrl.includes("api.asaas.com") && !baseUrl.includes("sandbox")

console.log("\n🔌 Teste Asaas API\n")
console.log(`   Base URL: ${baseUrl}`)
console.log(`   Ambiente: ${isProd ? "PRODUÇÃO ⚠️" : "sandbox"}`)
console.log(`   Key: ${apiKey.slice(0, 12)}...`)

try {
  const res = await fetch(`${baseUrl}/customers?limit=1`, {
    headers: {
      access_token: apiKey,
      "User-Agent": "Azulli/1.0",
      "Content-Type": "application/json",
    },
  })

  const text = await res.text()
  if (!res.ok) {
    console.error(`\n❌ HTTP ${res.status}`)
    console.error(text.slice(0, 400))
    process.exit(1)
  }

  const data = JSON.parse(text)
  console.log(`\n✅ Asaas API OK`)
  console.log(`   Clientes (total): ${data.totalCount ?? "?"}`)
  if (process.env.ASAAS_WEBHOOK_TOKEN) {
    console.log(`   ASAAS_WEBHOOK_TOKEN: definido (${process.env.ASAAS_WEBHOOK_TOKEN.length} chars)`)
  } else {
    console.log("   ⚠  ASAAS_WEBHOOK_TOKEN não definido")
  }
  console.log("")
} catch (err) {
  console.error("\n❌", err.message ?? err)
  process.exit(1)
}
