import { Loader2 } from "lucide-react"

type LoadingStateProps = {
  label?: string
}

export function LoadingState({ label = "Carregando…" }: LoadingStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
      <Loader2 className="h-9 w-9 animate-spin text-brand" />
      <div className="text-sm">{label}</div>
    </div>
  )
}
