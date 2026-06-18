"use client"

import { useState, useTransition } from "react"
import { Loader2, UserPlus, Trash2, Calculator } from "lucide-react"
import { toast } from "sonner"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

import {
  inviteAccountantAction,
  removeAccountantAction,
} from "@/lib/team/actions"
import type { TenantMember } from "@/lib/team/queries"

type Props = {
  members: TenantMember[]
}

export function AccountantTeamCard({ members }: Props) {
  const [email, setEmail] = useState("")
  const [name, setName] = useState("")
  const [isPending, startTransition] = useTransition()

  function handleInvite() {
    startTransition(async () => {
      const result = await inviteAccountantAction({
        email,
        name: name.trim() || undefined,
      })
      if (!result.success) {
        toast.error(result.error)
        return
      }
      toast.success("Convite enviado ou contador adicionado.")
      setEmail("")
      setName("")
    })
  }

  function handleRemove(userId: string) {
    startTransition(async () => {
      const result = await removeAccountantAction(userId)
      if (!result.success) {
        toast.error(result.error)
        return
      }
      toast.success("Acesso de contador removido.")
    })
  }

  return (
    <Card className="border-border/80">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="h-5 w-5 text-brand" aria-hidden />
          Acesso do contador
        </CardTitle>
        <CardDescription>
          Convide seu contador por e-mail. Ele verá a aba Contador com resumo,
          lançamentos e exportações — sem alterar dados.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 space-y-1.5">
            <Label htmlFor="accountant-name">Nome do contador</Label>
            <Input
              id="accountant-name"
              type="text"
              placeholder="Maria Contadora"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isPending}
            />
          </div>
          <div className="flex-1 space-y-1.5">
            <Label htmlFor="accountant-email">E-mail do contador</Label>
            <Input
              id="accountant-email"
              type="email"
              placeholder="contador@empresa.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isPending}
            />
          </div>
          <Button
            type="button"
            className="gap-2 bg-brand hover:bg-brand-hover sm:self-end"
            disabled={isPending || !email.trim()}
            onClick={handleInvite}
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <UserPlus className="h-4 w-4" aria-hidden />
            )}
            Convitar
          </Button>
        </div>

        {members.length > 0 && (
          <ul className="divide-y rounded-lg border">
            {members.map((m) => (
              <li
                key={m.user_id}
                className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm"
              >
                <div className="min-w-0">
                  <p className="font-medium truncate">
                    {m.name ?? m.email ?? "Contador"}
                  </p>
                  {m.email && (
                    <p className="text-xs text-muted-foreground truncate">
                      {m.email}
                    </p>
                  )}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="text-destructive hover:text-destructive shrink-0"
                  disabled={isPending}
                  onClick={() => handleRemove(m.user_id)}
                  aria-label="Remover contador"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
