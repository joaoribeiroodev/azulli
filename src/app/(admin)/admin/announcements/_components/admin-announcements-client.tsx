"use client"

import { useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export function AdminAnnouncementsClient() {
  const [title, setTitle] = useState("")
  const [body, setBody] = useState("")
  const [priority, setPriority] = useState("normal")
  const [audience, setAudience] = useState("all")
  const [pending, setPending] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setPending(true)
    try {
      const res = await fetch("/api/admin/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, body, priority, audience }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error ?? "Falha ao publicar aviso.")
        return
      }
      toast.success("Aviso publicado para os usuários.")
      setTitle("")
      setBody("")
    } finally {
      setPending(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Novo aviso global</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4 max-w-lg">
          <Input
            placeholder="Título (ex: Manutenção programada)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
          <Textarea
            placeholder="Mensagem para todos os usuários…"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={4}
            required
          />
          <div className="flex flex-wrap gap-3">
            <Select value={priority} onValueChange={setPriority}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="Prioridade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Baixa</SelectItem>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="high">Alta</SelectItem>
              </SelectContent>
            </Select>
            <Select value={audience} onValueChange={setAudience}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Audiência" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="trial">Trial</SelectItem>
                <SelectItem value="pro">Pro</SelectItem>
                <SelectItem value="enterprise">Empresarial</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button type="submit" disabled={pending} className="bg-brand hover:bg-brand-hover">
            Publicar aviso
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
