/**
 * Remove .next (cache Turbopack/Next). Use quando dev quebra com
 * MODULE_NOT_FOUND [turbopack]_runtime ou ENOENT em .next/dev.
 *
 * npm run clean
 * npm run dev:clean   → limpa e inicia dev
 */

import { rmSync, existsSync } from "node:fs"
import { resolve, dirname } from "node:path"
import { fileURLToPath } from "node:url"

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const NEXT_DIR = resolve(ROOT, ".next")

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

async function removeNextDir() {
  if (!existsSync(NEXT_DIR)) {
    console.log("○ .next não existe — nada a limpar")
    return
  }

  for (let attempt = 1; attempt <= 5; attempt++) {
    try {
      rmSync(NEXT_DIR, { recursive: true, force: true, maxRetries: 3, retryDelay: 200 })
      console.log("✓ Removido .next")
      return
    } catch (err) {
      if (attempt === 5) throw err
      await sleep(400 * attempt)
    }
  }
}

await removeNextDir()
