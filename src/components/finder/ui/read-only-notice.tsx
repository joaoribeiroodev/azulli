import { cn } from "@/lib/utils"

type Props = {
  className?: string
}

export function FinderReadOnlyNotice({ className }: Props) {
  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground",
        className
      )}
    >
      Seu perfil é <strong className="text-foreground">somente leitura</strong>. Você
      pode consultar leads e relatórios, mas não alterar dados nem buscar novos
      leads.
    </div>
  )
}
