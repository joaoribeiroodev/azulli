/**
 * Gera string aleatória para ASAAS_WEBHOOK_TOKEN, CRON_SECRET, etc.
 * Uso: npm run generate:secret
 */

import { randomBytes } from "node:crypto"

const token = randomBytes(32).toString("hex")
console.log("\n🔐 Segredo (64 chars hex — copie e guarde):\n")
console.log(token)
console.log("\nUse o mesmo valor em ASAAS_WEBHOOK_TOKEN (Vercel + painel Asaas).\n")
