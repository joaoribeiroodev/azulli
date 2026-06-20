type EmptyStateProps = {
  titulo: string
  descricao: string
  icone?: string
}

export function EmptyState({ titulo, descricao, icone = "🔍" }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center px-4">
      <div className="text-4xl mb-3">{icone}</div>
      <div className="text-base font-semibold text-foreground mb-1">{titulo}</div>
      <div className="text-sm text-muted-foreground max-w-md">{descricao}</div>
    </div>
  )
}
