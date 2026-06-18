/**
 * Smoke test de produção (rotas públicas).
 * Uso: npm run test:production
 * Opcional: CRON_SECRET no env para testar cron dryRun
 */
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://use.azulli.app.br"
const MARKETING_URL = "https://azulli.app.br"

const publicChecks = [
  { url: `${APP_URL}/login`, label: "app login" },
  { url: `${APP_URL}/register`, label: "app register" },
  { url: `${APP_URL}/termos-de-uso`, label: "termos" },
  { url: `${APP_URL}/manifest.webmanifest`, label: "manifest PWA" },
  { url: `${APP_URL}/sw.js`, label: "service worker" },
  { url: `${APP_URL}/pwa/icon-512.png`, label: "PWA icon" },
  { url: `${MARKETING_URL}/`, label: "marketing landing" },
]

let failed = 0

for (const { url, label } of publicChecks) {
  try {
    const res = await fetch(url, { redirect: "follow" })
    if (res.ok) {
      console.log(`ok  ${label} (${res.status})`)
    } else {
      console.error(`FAIL ${label} HTTP ${res.status} ${url}`)
      failed++
    }
  } catch (err) {
    console.error(`FAIL ${label} ${url}`, err.message)
    failed++
  }
}

const cronSecret = process.env.CRON_SECRET
if (cronSecret) {
  const cronUrl = `${APP_URL}/api/cron/trial-ending?dryRun=1`
  try {
    const res = await fetch(cronUrl, {
      headers: { Authorization: `Bearer ${cronSecret}` },
    })
    if (res.ok) {
      console.log(`ok  cron trial-ending dryRun (${res.status})`)
    } else {
      console.error(`FAIL cron HTTP ${res.status}`)
      failed++
    }
  } catch (err) {
    console.error("FAIL cron", err.message)
    failed++
  }
} else {
  console.log("skip cron (defina CRON_SECRET no env para testar)")
}

if (failed > 0) {
  console.error(`\nProduction smoke test failed (${failed} issues)`)
  process.exit(1)
}

console.log("\nProduction smoke test passed")
