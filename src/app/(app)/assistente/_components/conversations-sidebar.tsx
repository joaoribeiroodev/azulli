"use client"

import Link from "next/link"
import { useRouter, usePathname } from "next/navigation"
import { useState, useTransition } from "react"
import { Plus, MessageSquare, Trash2 } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { cn } from "@/lib/utils"
import { deleteConversationAction } from "@/lib/assistant/actions"
import type { ConversationRow } from "@/lib/assistant/types"

type Props = {
  conversations: ConversationRow[]
}

export function ConversationsSidebar({ conversations }: Props) {
  const pathname = usePathname()
  const router = useRouter()
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  function handleDelete() {
    if (!confirmDelete) return
    const id = confirmDelete
    setConfirmDelete(null)
    startTransition(async () => {
      const result = await deleteConversationAction(id)
      if (!result.success) {
        toast.error(result.error)
        return
      }
      toast.success("Conversa excluída.")
      if (pathname === `/assistente/${id}`) router.push("/assistente")
      else router.refresh()
    })
  }

  return (
    <div className="h-full flex flex-col">
      <div className="p-3 border-b">
        <Button
          asChild
          className="w-full bg-brand hover:bg-brand-hover gap-2 justify-start"
        >
          <Link href="/assistente">
            <Plus className="h-4 w-4" />
            Nova conversa
          </Link>
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
        {conversations.length === 0 ? (
          <p className="px-3 py-6 text-xs text-muted-foreground text-center">
            Suas conversas aparecem aqui.
          </p>
        ) : (
          conversations.map((c) => {
            const href = `/assistente/${c.id}`
            const active = pathname === href
            return (
              <div
                key={c.id}
                className={cn(
                  "group flex items-center gap-2 rounded-md text-sm transition-colors",
                  active
                    ? "bg-brand-soft text-brand"
                    : "hover:bg-muted text-foreground"
                )}
              >
                <Link
                  href={href}
                  className="flex-1 min-w-0 flex items-center gap-2 px-2.5 py-2"
                >
                  <MessageSquare className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{c.title || "Sem título"}</span>
                </Link>
                <button
                  type="button"
                  aria-label="Excluir conversa"
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    setConfirmDelete(c.id)
                  }}
                  className="opacity-0 group-hover:opacity-100 focus:opacity-100 p-1.5 mr-1 rounded text-muted-foreground hover:text-destructive transition-opacity"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            )
          })
        )}
      </div>

      <AlertDialog
        open={!!confirmDelete}
        onOpenChange={(o) => !o && setConfirmDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir conversa?</AlertDialogTitle>
            <AlertDialogDescription>
              Essa ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
