/**
 * Testa o cron de insights semanais contra o app local (ou NEXT_PUBLIC_APP_URL).
 *
 * Uso:
 *   npm run test:weekly-insights              → dry run (não envia email)
 *   npm run test:weekly-insights -- --send    → envio real via Resend
 *   npm run test:weekly-insights -- --userId=UUID
 *
 * Requer: npm run dev rodando + CRON_SECRET no .env.local
 */

import { readFileSync, existsSync } from "node:fs"
import { resolve, dirname } from "node:path"
import { fileURLToPath } from "node:url"

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const ENV_LOCAL = resolve(ROOT, ".env.local")

function loadEnvLocal() {
  const candidates = [
    ENV_LOCAL,
    resolve(process.cwd(), ".env.local"),
  ]

  const envPath = candidates.find((p) => existsSync(p))
  if (!envPath) {
    console.warn("⚠  .env.local não encontrado — usando variáveis de ambiente.")
    return
  }

  const content = readFileSync(envPath, "utf8").replace(/^\uFEFF/, "")
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

function parseArgs(argv) {
  let send = false
  let userId = null
  let collection = false

  for (const arg of argv) {
    if (arg === "--send") send = true
    else if (arg === "--collection") collection = true
    else if (arg === "--help" || arg === "-h") return { help: true }
    else if (arg.startsWith("--userId=")) userId = arg.slice("--userId=".length)
    else if (arg.startsWith("--user-id=")) userId = arg.slice("--user-id=".length)
    else if (!arg.startsWith("-")) userId = arg
  }

  return { send, userId, collection, help: false }
}

function printHelp() {
  console.log(`
Teste dos crons de email (Fase 10–11)

Pré-requisitos:
  • npm run dev em execução
  • CRON_SECRET no .env.local
  • Envio real (--send): RESEND_API_KEY + domínio azulli.app.br verificado no Resend
  • Dry run: SUPABASE_SERVICE_ROLE_KEY

Uso — insights semanais:
  npm run test:weekly-insights
  npm run test:weekly-insights -- --send

Uso — lembretes de cobrança:
  npm run test:weekly-insights -- --collection
  npm run test:weekly-insights -- --collection --send

Comum:
  npm run test:weekly-insights -- --userId=<uuid>

Variáveis ( .env.local ):
  NEXT_PUBLIC_APP_URL  → base (padrão http://localhost:3000)
  CRON_SECRET          → obrigatório
`)
}

loadEnvLocal()

const { send, userId, collection, help } = parseArgs(process.argv.slice(2))
if (help) {
  printHelp()
  process.exit(0)
}

const baseUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(
  /\/$/,
  ""
)
const cronSecret = process.env.CRON_SECRET

if (!cronSecret) {
  const envPath = [ENV_LOCAL, resolve(process.cwd(), ".env.local")].find((p) =>
    existsSync(p)
  )
  console.error("✗ CRON_SECRET não definido.")
  if (envPath) {
    const hasLine = readFileSync(envPath, "utf8")
      .split(/\r?\n/)
      .some((line) => line.trim().startsWith("CRON_SECRET="))
    console.error(`  Arquivo: ${envPath}`)
    console.error(
      hasLine
        ? "  Linha CRON_SECRET= encontrada, mas valor vazio ou ilegível."
        : "  Linha CRON_SECRET= não encontrada no arquivo."
    )
  } else {
    console.error("  .env.local não encontrado na raiz do projeto.")
  }
  console.error("  Reinicie npm run dev após alterar .env.local.")
  process.exit(1)
}

const params = new URLSearchParams()
if (!send) params.set("dryRun", "1")
if (userId) params.set("userId", userId)

const cronPath = collection
  ? "/api/cron/collection-reminders"
  : "/api/cron/weekly-insights"
const url = `${baseUrl}${cronPath}?${params.toString()}`

console.log(
  `→ ${send ? "ENVIO REAL" : "DRY RUN"} ${collection ? "[cobrança] " : ""}${url}`
)
if (userId) console.log(`  userId: ${userId}`)
console.log("")

try {
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${cronSecret}` },
    signal: AbortSignal.timeout(120_000),
    redirect: "manual",
  })

  const text = await res.text()
  let body

  if (res.status === 307 || res.status === 308) {
    const location = res.headers.get("location") ?? ""
    console.error(`✗ Redirect ${res.status} → ${location}`)
    if (location.includes("/login")) {
      console.error(
        "  O proxy bloqueou /api/cron (redirecionou ao login sem sessão)."
      )
      console.error("  Confira PUBLIC_API_PREFIXES em src/proxy.ts e reinicie o dev.")
    }
    process.exit(1)
  }

  try {
    body = JSON.parse(text)
  } catch {
    const looksLikeLoginRedirect =
      res.status === 307 ||
      res.status === 308 ||
      text.includes("/login") ||
      text.includes("<!DOCTYPE")
    console.error(`✗ Resposta não-JSON (${res.status})`)
    if (looksLikeLoginRedirect) {
      console.error(
        "  O proxy redirecionou ao /login — /api/cron deve ser público no proxy.ts."
      )
      console.error("  Reinicie npm run dev após atualizar o proxy.")
    } else {
      console.error(text.slice(0, 500))
    }
    process.exit(1)
  }

  if (!res.ok) {
    console.error(`✗ HTTP ${res.status}`)
    if (res.status === 401) {
      console.error(
        "  401 = CRON_SECRET diferente entre .env.local e o header Bearer."
      )
      console.error("  Reinicie npm run dev após alterar .env.local.")
    }
    if (res.status === 503) {
      console.error(
        "  503 = Next não carregou CRON_SECRET (vazio ou dev server antigo)."
      )
    }
    console.error(JSON.stringify(body, null, 2))
    process.exit(1)
  }

  console.log(JSON.stringify(body, null, 2))
  console.log("")

  if (body.details?.length) {
    console.log("Detalhes:")
    for (const d of body.details) {
      const icon =
        d.status === "sent" ? "✓" : d.status === "skipped" ? "○" : "✗"
      const extra = [d.reason, d.subject].filter(Boolean).join(" — ")
      console.log(`  ${icon} ${d.userId} → ${d.status}${extra ? ` (${extra})` : ""}`)
    }
    console.log("")
  }

  const summary = [
    `processados: ${body.processed ?? 0}`,
    `enviados: ${body.sent ?? 0}`,
    `ignorados: ${body.skipped ?? 0}`,
    `falhas: ${body.failed ?? 0}`,
  ].join(" | ")

  if (body.dryRun) {
    console.log(`✓ Dry run OK — ${summary}`)
    console.log("  Preview visual: Configurações → Notificações → Ver exemplo do email")
  } else if (body.failed > 0) {
    console.log(`⚠ Envio com falhas — ${summary}`)
    process.exit(1)
  } else if (body.sent > 0) {
    console.log(`✓ Email(s) enviado(s) — ${summary}`)
    console.log("  Confira inbox, Resend dashboard e Histórico em Configurações.")
  } else {
    console.log(`○ Nada enviado — ${summary}`)
    if (body.message) console.log(`  ${body.message}`)
  }
} catch (err) {
  if (err.name === "TimeoutError") {
    console.error("✗ Timeout — o cron demorou mais de 2 minutos.")
  } else if (err.cause?.code === "ECONNREFUSED") {
    console.error(`✗ Não conectou em ${baseUrl}`)
    console.error("  Rode npm run dev e tente novamente.")
  } else {
    console.error("✗ Erro:", err.message ?? err)
  }
  process.exit(1)
}
