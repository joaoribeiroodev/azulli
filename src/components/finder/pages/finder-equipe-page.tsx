"use client"

import { useCallback, useEffect, useState } from "react"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"

import { useFinderContext, useFinderPageMeta } from "@/components/finder/finder-context"
import { EmptyState } from "@/components/finder/ui/empty-state"
import { LoadingState } from "@/components/finder/ui/loading-state"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { USER_ROLES } from "@/lib/finder/constants"
import { fmtDate } from "@/lib/finder/format"
import { finderClient } from "@/lib/finder/client"
import type { User } from "@/lib/finder/types"

export function FinderEquipePage() {
  useFinderPageMeta({
    title: "Equipe",
    subtitle: "Usuários internos do time comercial",
  })

  const { user: me } = useFinderContext()
  const isAdmin = me?.role === "admin"

  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [nome, setNome] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [role, setRole] = useState("sdr")

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { users: list } = await finderClient.users.list()
      setUsers(list)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function toggleActive(u: User) {
    try {
      await finderClient.users.update(u.id, { ativo: !u.ativo })
      load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao atualizar")
    }
  }

  async function createUser() {
    setFormError(null)
    setCreating(true)
    try {
      await finderClient.users.create({
        nome: nome.trim(),
        email: email.trim(),
        password,
        role,
      })
      toast.success("Usuário criado.")
      setDialogOpen(false)
      setNome("")
      setEmail("")
      setPassword("")
      setRole("sdr")
      load()
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Erro ao criar usuário")
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Membros do time que têm acesso ao Finder.
        </p>
        {isAdmin ? (
          <Button
            type="button"
            className="bg-brand hover:bg-brand-hover"
            onClick={() => setDialogOpen(true)}
          >
            + Novo usuário
          </Button>
        ) : (
          <span className="text-xs text-muted-foreground">
            Somente admin pode criar usuários.
          </span>
        )}
      </div>

      {loading ? (
        <LoadingState />
      ) : error ? (
        <div className="bg-destructive/10 border border-destructive/30 text-destructive p-4 rounded-lg text-sm">
          {error}
        </div>
      ) : users.length === 0 ? (
        <EmptyState
          titulo="Sem usuários"
          descricao="Use `npm run seed:admin` para criar o primeiro admin."
          icone="👥"
        />
      ) : (
        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Usuário</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Último login</TableHead>
                <TableHead>Criado</TableHead>
                {isAdmin ? <TableHead /> : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.id}>
                  <TableCell>
                    <div className="font-medium">{u.nome || "—"}</div>
                    <div className="text-xs text-muted-foreground">{u.email}</div>
                  </TableCell>
                  <TableCell>
                    <span className="text-xs px-2 py-0.5 rounded-md bg-muted uppercase font-semibold">
                      {u.role}
                    </span>
                  </TableCell>
                  <TableCell>
                    {u.ativo ? (
                      <span className="text-xs text-emerald-700 bg-emerald-50 dark:bg-emerald-500/15 dark:text-emerald-300 px-2 py-0.5 rounded-full">
                        Ativo
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                        Inativo
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {fmtDate(u.ultimo_login)}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {fmtDate(u.created_at)}
                  </TableCell>
                  {isAdmin ? (
                    <TableCell className="text-right">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => toggleActive(u)}
                      >
                        {u.ativo ? "Desativar" : "Ativar"}
                      </Button>
                    </TableCell>
                  ) : null}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo usuário</DialogTitle>
            <DialogDescription>Criar um novo membro do time comercial</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="nu-nome">Nome</Label>
              <Input id="nu-nome" value={nome} onChange={(e) => setNome(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="nu-email">Email</Label>
              <Input
                id="nu-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="nu-senha">Senha (mín. 8)</Label>
              <Input
                id="nu-senha"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="nu-role">Role</Label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger id="nu-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {USER_ROLES.map((r) => (
                    <SelectItem key={r} value={r}>
                      {r.toUpperCase()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {formError ? (
              <p className="text-xs text-destructive bg-destructive/10 border border-destructive/20 px-3 py-2 rounded">
                {formError}
              </p>
            ) : null}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              type="button"
              className="bg-brand hover:bg-brand-hover"
              disabled={creating}
              onClick={createUser}
            >
              {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Criar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
