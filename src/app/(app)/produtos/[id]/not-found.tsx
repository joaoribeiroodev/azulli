import Link from "next/link"
import { Package } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function ProductNotFound() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center">
      <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
        <Package className="h-8 w-8 text-muted-foreground" />
      </div>
      <h1 className="text-2xl font-display font-bold text-brand-ink mb-2">
        Produto não encontrado
      </h1>
      <p className="text-sm text-muted-foreground mb-6 max-w-sm">
        Esse produto não existe ou pertence a outra empresa.
      </p>
      <Button asChild className="bg-brand hover:bg-brand-hover">
        <Link href="/produtos">Voltar para produtos</Link>
      </Button>
    </div>
  )
}
