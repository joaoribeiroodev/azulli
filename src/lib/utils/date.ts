/**
 * Converte ISO date para "dd/MM/yyyy"
 */
export function formatDateBR(value: string | Date): string {
  const d = typeof value === "string" ? new Date(value) : value
  if (Number.isNaN(d.getTime())) return ""
  return d.toLocaleDateString("pt-BR")
}

/**
 * Início e fim do mês corrente em ISO (UTC).
 */
export function getCurrentMonthRange(): { from: string; to: string } {
  const now = new Date()
  const from = new Date(now.getFullYear(), now.getMonth(), 1)
  const to = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)
  return { from: from.toISOString(), to: to.toISOString() }
}

/**
 * Últimos N dias (inclusive hoje) em formato YYYY-MM-DD.
 * Usado pra montar buckets do mini gráfico.
 */
export function getLastNDays(n: number): string[] {
  const days: string[] = []
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    days.push(d.toISOString().slice(0, 10))
  }
  return days
}