import { FileText, Sparkles } from "lucide-react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export const metadata = { title: "Notas Fiscais — Azulli" }

export default function NotasPage() {
  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <header>
        <h1 className="text-2xl lg:text-3xl font-display font-bold text-brand-ink">
          Notas Fiscais
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Emita NF-e e NFS-e direto dos seus lançamentos.
        </p>
      </header>

      <Card>
        <CardHeader>
          <div className="h-12 w-12 rounded-full bg-brand-soft flex items-center justify-center mb-2">
            <FileText className="h-6 w-6 text-brand" />
          </div>
          <CardTitle className="font-display flex items-center gap-2">
            Em breve <Sparkles className="h-4 w-4 text-brand" />
          </CardTitle>
          <CardDescription>
            Estamos finalizando a integração com o provedor de notas fiscais.
            Você poderá emitir direto da tela de Lançamentos, com 1 clique.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>✓ NFS-e para serviços (MEI e Simples Nacional)</li>
            <li>✓ NF-e para produtos (Plano Empresarial)</li>
            <li>✓ XML e PDF prontos pro contador</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}