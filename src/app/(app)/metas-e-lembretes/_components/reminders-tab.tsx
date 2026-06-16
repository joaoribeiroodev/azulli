"use client"

import { useState } from "react"
import { Plus, Bell } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import type { ReminderRow as ReminderRowData } from "@/lib/reminders/queries"

import { ReminderRow } from "./reminder-row"
import { ReminderDialog } from "./reminder-dialog"

type Props = {
  reminders: ReminderRowData[]
  remindersWithDone: ReminderRowData[]
}

export function RemindersTab({ reminders, remindersWithDone }: Props) {
  const [createOpen, setCreateOpen] = useState(false)
  const [showDone, setShowDone] = useState(false)

  const visible = showDone ? remindersWithDone : reminders

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <label
            htmlFor="show-done-switch"
            className="text-xs text-muted-foreground cursor-pointer"
          >
            Mostrar concluídos
          </label>
          <Switch
            id="show-done-switch"
            checked={showDone}
            onCheckedChange={setShowDone}
          />
        </div>

        <Button
          onClick={() => setCreateOpen(true)}
          size="sm"
          className="bg-brand hover:bg-brand-hover gap-2"
        >
          <Plus className="h-4 w-4" />
          Novo lembrete
        </Button>
      </div>

      {visible.length === 0 ? (
        <div className="rounded-xl border bg-card py-16 text-center">
          <Bell className="h-10 w-10 text-muted-foreground/40 mx-auto mb-2" />
          <p className="text-sm font-medium">
            {showDone ? "Nenhum lembrete concluído" : "Tudo em dia! 🎉"}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {showDone
              ? "Conclua alguns lembretes pra vê-los aqui."
              : "Nenhum lembrete pendente. Bom trabalho!"}
          </p>
          {!showDone && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCreateOpen(true)}
              className="mt-4 gap-2"
            >
              <Plus className="h-3.5 w-3.5" />
              Adicionar lembrete
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {visible.map((reminder) => (
            <ReminderRow key={reminder.id} reminder={reminder} />
          ))}
        </div>
      )}

      <ReminderDialog
        mode="create"
        open={createOpen}
        onOpenChange={setCreateOpen}
      />
    </section>
  )
}
