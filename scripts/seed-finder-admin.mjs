/**
 * Bootstrap do primeiro admin do Finder (schema finder.users no Supabase).
 * Uso: npm run finder:seed
 */
import pg from "pg"
import bcrypt from "bcryptjs"
import { config } from "dotenv"

config({ path: ".env.local" })
config({ path: ".env" })

const { Pool } = pg

const email = (
  process.env.FINDER_ADMIN_EMAIL ||
  process.env.ADMIN_EMAIL ||
  "admin@azulli.local"
).toLowerCase()

const password =
  process.env.FINDER_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD

const nome =
  process.env.FINDER_ADMIN_NOME ||
  process.env.ADMIN_NOME ||
  "Admin Azulli"

const databaseUrl =
  process.env.DATABASE_URL || process.env.SUPABASE_DB_URL

if (!databaseUrl) {
  console.error("[finder:seed] Defina DATABASE_URL (connection string do Supabase).")
  process.exit(1)
}

if (!password) {
  console.warn("[finder:seed] FINDER_ADMIN_PASSWORD vazia — pulando.")
  process.exit(0)
}

const pool = new Pool({
  connectionString: databaseUrl,
  options: "-c search_path=finder,public",
})

async function upsertAdmin(targetEmail, hash, displayName) {
  const { rows } = await pool.query(
    "SELECT id FROM users WHERE email = $1",
    [targetEmail]
  )

  if (rows.length > 0) {
    await pool.query(
      `UPDATE users SET password_hash = $1, nome = $2, role = 'admin', ativo = true WHERE id = $3`,
      [hash, displayName, rows[0].id]
    )
    console.log(`[finder:seed] Admin atualizado: ${targetEmail}`)
  } else {
    await pool.query(
      `INSERT INTO users (email, password_hash, nome, role) VALUES ($1, $2, $3, 'admin')`,
      [targetEmail, hash, displayName]
    )
    console.log(`[finder:seed] Admin criado: ${targetEmail}`)
  }
}

try {
  const hash = await bcrypt.hash(password, 10)
  await upsertAdmin(email, hash, nome)

  const platformEmails = (process.env.PLATFORM_ADMIN_EMAILS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)

  for (const pe of platformEmails) {
    if (pe === email) continue
    await upsertAdmin(pe, hash, pe.split("@")[0])
  }
} catch (err) {
  console.error("[finder:seed] ERRO:", err instanceof Error ? err.message : err)
  process.exitCode = 1
} finally {
  await pool.end()
}
