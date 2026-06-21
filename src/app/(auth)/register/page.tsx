import Link from "next/link"
import { headers } from "next/headers"
import { redirect } from "next/navigation"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { isTrialHost } from "@/lib/app/domain-hosts"
import { getLoginUrl } from "@/lib/app/public-urls"
import { createClient } from "@/lib/supabase/server"
import { isOnboardingComplete } from "@/lib/onboarding/queries"
import { RegisterForm } from "./register-form"

export const metadata = {
  title: "Trial grátis 7 dias — Azulli",
  description:
    "Crie sua conta e teste o Azulli por 7 dias, com tudo do plano Empresarial. Sem cartão de crédito.",
}

export default async function RegisterPage() {
  const host = (await headers()).get("host") ?? ""
  const trialHost = isTrialHost(host)

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (user) {
    redirect((await isOnboardingComplete()) ? "/dashboard" : "/onboarding")
  }

  return (
    <Card className="shadow-sm">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-display">
          {trialHost
            ? "Seu trial de 7 dias começa aqui 🚀"
            : "Comece de graça por 7 dias 🚀"}
        </CardTitle>
        <CardDescription>
          {trialHost
            ? "Cadastro em menos de 1 minuto. IA, previsão de caixa e e-mails automáticos liberados no trial."
            : "Sem cartão de crédito. Sem complicação."}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <RegisterForm />

        <p className="text-sm text-center text-muted-foreground">
          Já tem conta?{" "}
          <Link
            href={trialHost ? getLoginUrl() : "/login"}
            className="text-brand hover:text-brand-hover font-medium"
          >
            Entrar
          </Link>
        </p>
      </CardContent>
    </Card>
  )
}