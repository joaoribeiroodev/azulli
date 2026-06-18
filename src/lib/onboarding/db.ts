/** Detecta erro PostgREST/Supabase quando coluna ainda não foi migrada */
export function isMissingDbColumn(
  message: string | undefined,
  column: string
): boolean {
  if (!message) return false
  const m = message.toLowerCase()
  const col = column.toLowerCase()
  return (
    m.includes(col) ||
    m.includes("could not find") ||
    (m.includes("column") && m.includes("does not exist"))
  )
}
