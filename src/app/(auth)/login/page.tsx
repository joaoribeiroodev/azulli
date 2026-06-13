import Link from "next/link"
import { redirect } from "next/navigation"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { createClient } from "@/lib/supabase/server"
import { LoginForm } from "./login-form"

export const metadata = {
  title: "Entrar — Azulli",
}

export default async function LoginPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (user) redirect("/dashboard")

  return (
    <Card className="shadow-sm">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-display">
          Bem-vindo de volta 👋
        </CardTitle>
        <CardDescription>
          Entre para continuar gerindo seu financeiro.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <LoginForm />

        <p className="text-sm text-center text-muted-foreground">
          Ainda não tem conta?{" "}
          <Link
            href="/register"
            className="text-brand hover:text-brand-hover font-medium"
          >
            Começar grátis
          </Link>
        </p>
      </CardContent>
    </Card>
  )
}