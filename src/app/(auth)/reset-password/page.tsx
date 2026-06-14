import Link from "next/link"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { createClient } from "@/lib/supabase/server"
import { ResetPasswordForm } from "./reset-password-form"

export const metadata = { title: "Nova senha — Azulli" }

export default async function ResetPasswordPage() {
  // Não verificamos sessão aqui — o link de email já estabelece sessão temporária.
  // A Server Action verifica se há user no momento do submit.
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return (
    <Card className="shadow-sm">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-display">
          Defina sua nova senha 🔒
        </CardTitle>
        <CardDescription>
          {user
            ? "Quase pronto! Crie uma senha forte para sua conta."
            : "Acesso expirado. Solicite um novo link de recuperação."}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {user ? (
          <ResetPasswordForm />
        ) : (
          <Link
            href="/forgot-password"
            className="block text-center text-sm font-medium text-brand hover:text-brand-hover"
          >
            Solicitar novo link →
          </Link>
        )}
      </CardContent>
    </Card>
  )
}
