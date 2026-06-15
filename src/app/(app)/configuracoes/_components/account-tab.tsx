"use client"

import { useTransition } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import { Loader2, Mail } from "lucide-react"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"

import { updateUserProfileAction } from "@/lib/settings/actions"
import { formatWhatsAppBR } from "@/lib/utils/format"
import { AvatarUpload } from "@/components/app/avatar-upload"

const schema = z.object({
  name: z.string().trim().min(2, "Nome muito curto").max(120),
  phone: z.string().trim().max(20).optional().or(z.literal("")),
})

type FormInput = z.infer<typeof schema>

type Props = {
  user: {
    id: string
    email: string
    name: string
    phone: string | null
    avatar_url: string | null
  }
}

export function AccountTab({ user }: Props) {
  const [isPending, startTransition] = useTransition()

  const form = useForm<FormInput>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: user.name ?? "",
      phone: user.phone ? formatWhatsAppBR(user.phone) : "",
    },
  })

  function onSubmit(values: FormInput) {
    startTransition(async () => {
      const result = await updateUserProfileAction(values)
      if (!result.success) return toast.error(result.error)
      toast.success("Perfil atualizado! ✅")
    })
  }

  return (
    <div className="space-y-6">
      {/* Card: Avatar */}
      <Card>
        <CardHeader>
          <CardTitle>Personalização</CardTitle>
          <CardDescription>
            Sua foto aparece no menu lateral e em outras telas do app.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AvatarUpload
            userId={user.id}
            userName={user.name || user.email}
            currentAvatarUrl={user.avatar_url}
          />
        </CardContent>
      </Card>

      {/* Card: Dados pessoais */}
      <Card>
        <CardHeader>
          <CardTitle>Dados pessoais</CardTitle>
          <CardDescription>
            Como você quer ser chamado no Azulli.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome</FormLabel>
                    <FormControl>
                      <Input placeholder="João da Silva" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>WhatsApp</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="(71) 99999-9999"
                        {...field}
                        value={field.value ?? ""}
                      />
                    </FormControl>
                    <FormDescription className="text-xs">
                      Usado para suporte e notificações importantes.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Separator />

              <div className="space-y-1.5">
                <p className="text-sm font-medium">E-mail</p>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Mail className="h-4 w-4" />
                  {user.email}
                </div>
                <p className="text-xs text-muted-foreground">
                  Para alterar seu e-mail, entre em contato com o suporte.
                </p>
              </div>

              <div className="flex justify-end pt-2">
                <Button
                  type="submit"
                  disabled={isPending}
                  className="bg-brand hover:bg-brand-hover"
                >
                  {isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Salvar
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  )
}
