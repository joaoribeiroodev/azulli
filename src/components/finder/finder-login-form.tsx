"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Loader2, Search } from "lucide-react"
import { toast } from "sonner"

import { ThemeToggle } from "@/components/theme-toggle"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { finderClient } from "@/lib/finder/client"

export function FinderLoginForm() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    startTransition(async () => {
      try {
        const { token, user } = await finderClient.auth.login(email.trim(), password)
        finderClient.token.set(token)
        finderClient.user.set(user)
        toast.success(`Bem-vindo, ${user.nome || user.email}!`)
        router.push("/finder/dashboard")
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : "Falha no login")
      }
    })
  }

  return (
    <div className="min-h-dvh flex items-center justify-center p-4 sm:p-6 bg-surface">
      <div className="w-full max-w-md space-y-6">
        <div className="flex justify-end">
          <ThemeToggle />
        </div>

        <Card className="shadow-lg border-border/80 overflow-hidden">
          <div className="bg-gradient-to-br from-brand-ink to-brand px-6 py-8 text-primary-foreground">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-white/15 flex items-center justify-center">
                <Search className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-xl font-display text-white border-0 p-0">
                  Azulli Finder
                </CardTitle>
                <CardDescription className="text-blue-100 text-xs mt-0.5">
                  Prospecção de assinantes
                </CardDescription>
              </div>
            </div>
            <p className="text-sm text-blue-50 leading-relaxed">
              Ferramenta interna do time comercial. Encontre MEIs e pequenas empresas com fit de
              ICP.
            </p>
          </div>

          <CardHeader className="sr-only">
            <CardTitle>Entrar no Finder</CardTitle>
          </CardHeader>

          <CardContent className="pt-6">
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="finder-email">Email</Label>
                <Input
                  id="finder-email"
                  type="email"
                  autoComplete="email"
                  placeholder="sdr@azulli.com.br"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="finder-password">Senha</Label>
                <Input
                  id="finder-password"
                  type="password"
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              {error ? (
                <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
                  {error}
                </p>
              ) : null}

              <Button
                type="submit"
                className="w-full bg-brand hover:bg-brand-hover"
                disabled={isPending}
              >
                {isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Entrando…
                  </>
                ) : (
                  "Entrar"
                )}
              </Button>

              <p className="text-xs text-muted-foreground text-center pt-1">
                Sem acesso? Solicite ao admin para criar seu usuário interno.
              </p>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground">
          © Azulli · Sua empresa no azul · uso interno
        </p>
      </div>
    </div>
  )
}
