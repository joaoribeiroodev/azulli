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
import { ForgotPasswordForm } from "./forgot-password-form"

export const metadata = { title: "Recuperar senha — Azulli" }

export default async function ForgotPasswordPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (user) redirect("/dashboard")

  return (
    <Card className="shadow-sm">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-display">
          Esqueceu a senha? 🔑
        </CardTitle>
        <CardDescription>
          Sem stress. Informe seu e-mail e enviaremos um link pra você criar
          uma nova.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <ForgotPasswordForm />

        <p className="text-sm text-center text-muted-foreground">
          Lembrou da senha?{" "}
          <Link
            href="/login"
            className="text-brand hover:text-brand-hover font-medium"
          >
            Voltar para o login
          </Link>
        </p>
      </CardContent>
    </Card>
  )
}
