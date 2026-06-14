"use client"

import { useState, useTransition } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Loader2, MailCheck } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"

import { requestPasswordResetAction } from "@/lib/auth/actions"

const schema = z.object({
  email: z.string().trim().toLowerCase().email("E-mail inválido"),
})
type FormInput = z.infer<typeof schema>

export function ForgotPasswordForm() {
  const [isPending, startTransition] = useTransition()
  const [submitted, setSubmitted] = useState<string | null>(null)

  const form = useForm<FormInput>({
    resolver: zodResolver(schema),
    defaultValues: { email: "" },
  })

  function onSubmit(values: FormInput) {
    startTransition(async () => {
      await requestPasswordResetAction(values)
      // Por privacidade, mostramos sucesso mesmo se o email não existe.
      setSubmitted(values.email)
    })
  }

  if (submitted) {
    return (
      <div className="rounded-lg border bg-success-soft/30 p-4 text-center space-y-2">
        <div className="mx-auto h-10 w-10 rounded-full bg-success text-white flex items-center justify-center">
          <MailCheck className="h-5 w-5" />
        </div>
        <p className="text-sm font-semibold text-foreground">
          Se este e-mail estiver cadastrado, você receberá um link em instantes
        </p>
        <p className="text-xs text-muted-foreground">
          Confira sua caixa de entrada (e o spam) para{" "}
          <span className="font-medium text-foreground">{submitted}</span>.
        </p>
      </div>
    )
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>E-mail</FormLabel>
              <FormControl>
                <Input
                  type="email"
                  placeholder="voce@empresa.com"
                  autoComplete="email"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button
          type="submit"
          disabled={isPending}
          className="w-full bg-brand hover:bg-brand-hover"
          size="lg"
        >
          {isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Enviando...
            </>
          ) : (
            "Enviar link de recuperação"
          )}
        </Button>
      </form>
    </Form>
  )
}
