import Link from "next/link"
import { UserX } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function NotFound() {
  return (
    <div className="p-8 max-w-md mx-auto text-center space-y-4">
      <UserX className="h-12 w-12 text-muted-foreground/40 mx-auto" />
      <h1 className="text-2xl font-display font-bold text-brand-ink">
        Funcionário não encontrado
      </h1>
      <p className="text-sm text-muted-foreground">
        Esse funcionário foi excluído ou nunca existiu.
      </p>
      <Button asChild className="bg-brand hover:bg-brand-hover">
        <Link href="/funcionarios">Voltar pra lista</Link>
      </Button>
    </div>
  )
}
