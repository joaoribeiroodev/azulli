import { Button } from "@/components/ui/button"
import Link from "next/link"

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
      <span className="inline-block px-3 py-1 mb-6 rounded-full bg-brand-soft text-brand text-sm font-medium">
        Em construção 🚧
      </span>

      <h1 className="text-5xl md:text-6xl font-display font-bold text-brand-ink mb-4">
        Azulli
      </h1>
      <p className="text-lg text-muted-foreground max-w-xl mb-8">
        Sua empresa no azul, sua mente em paz.
      </p>

      <div className="flex gap-3">
        <Button size="lg" className="bg-brand hover:bg-brand-hover" asChild>
          <Link href="/register">Começar trial grátis</Link>
        </Button>
        <Button size="lg" variant="outline" asChild>
          <Link href="/login">Já tenho conta</Link>
        </Button>
      </div>
    </main>
  )
}