/**
 * Valida assets e manifest PWA antes do deploy.
 * Uso: node scripts/validate-pwa.mjs
 */
import { readFile, access } from "node:fs/promises"
import path from "node:path"

const root = path.resolve(import.meta.dirname, "..")

const requiredFiles = [
  "public/sw.js",
  "public/pwa/icon-192.png",
  "public/pwa/icon-512.png",
  "public/pwa/apple-touch-icon.png",
  "public/pwa/icon-maskable-512.png",
  "src/app/icon.png",
  "src/app/apple-icon.png",
  "src/app/manifest.ts",
  "assets/brand/azulli-logo.png",
]

let failed = 0

for (const rel of requiredFiles) {
  try {
    await access(path.join(root, rel))
    console.log(`ok  ${rel}`)
  } catch {
    console.error(`MISS ${rel}`)
    failed++
  }
}

const sw = await readFile(path.join(root, "public/sw.js"), "utf8")
if (!sw.includes("addEventListener")) {
  console.error("MISS sw.js handlers")
  failed++
}

const manifest = await readFile(path.join(root, "src/app/manifest.ts"), "utf8")
const checks = ["display: \"standalone\"", "start_url", "icon-192", "icon-512", "maskable"]
for (const c of checks) {
  if (!manifest.includes(c)) {
    console.error(`MISS manifest field: ${c}`)
    failed++
  }
}

if (failed > 0) {
  console.error(`\nPWA validation failed (${failed} issues)`)
  process.exit(1)
}

console.log("\nPWA validation passed")
