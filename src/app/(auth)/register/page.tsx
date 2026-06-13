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
import { RegisterForm } from "./register-form"

export const metadata = {
  title: "Criar conta — Azulli",
}

export default async function RegisterPage() {
  // Se já estiver autenticado, manda pro dashboard
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (user) redirect("/dashboard")

  return (
    <Card className="shadow-sm">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-display">
          Comece de graça por 7 dias 🚀
        </CardTitle>
        <CardDescription>
          Sem cartão de crédito. Sem complicação.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <RegisterForm />

        <p className="text-sm text-center text-muted-foreground">
          Já tem conta?{" "}
          <Link
            href="/login"
            className="text-brand hover:text-brand-hover font-medium"
          >
            Entrar
          </Link>
        </p>
      </CardContent>
    </Card>
  )
}