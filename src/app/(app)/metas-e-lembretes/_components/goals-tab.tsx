"use client"

import { useState } from "react"
import { Plus, Target } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import type { GoalRow } from "@/lib/goals/queries"

import { GoalCard } from "./goal-card"
import { GoalDialog } from "./goal-dialog"

type Props = {
  goals: GoalRow[]
  goalsWithArchived: GoalRow[]
}

export function GoalsTab({ goals, goalsWithArchived }: Props) {
  const [createOpen, setCreateOpen] = useState(false)
  const [showArchived, setShowArchived] = useState(false)

  const visible = showArchived ? goalsWithArchived : goals

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <label
            htmlFor="show-archived-switch"
            className="text-xs text-muted-foreground cursor-pointer"
          >
            Mostrar arquivadas
          </label>
          <Switch
            id="show-archived-switch"
            checked={showArchived}
            onCheckedChange={setShowArchived}
          />
        </div>

        <Button
          onClick={() => setCreateOpen(true)}
          size="sm"
          className="bg-brand hover:bg-brand-hover gap-2"
        >
          <Plus className="h-4 w-4" />
          Nova meta
        </Button>
      </div>

      {visible.length === 0 ? (
        <div className="rounded-xl border bg-card py-16 text-center">
          <Target className="h-10 w-10 text-muted-foreground/40 mx-auto mb-2" />
          <p className="text-sm font-medium">
            {showArchived ? "Nenhuma meta arquivada" : "Nenhuma meta ativa"}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {showArchived
              ? "Suas metas arquivadas aparecerão aqui."
              : "Que tal definir um objetivo pra este mês? 🎯"}
          </p>
          {!showArchived && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCreateOpen(true)}
              className="mt-4 gap-2"
            >
              <Plus className="h-3.5 w-3.5" />
              Criar minha primeira meta
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {visible.map((goal) => (
            <GoalCard key={goal.id} goal={goal} />
          ))}
        </div>
      )}

      <GoalDialog
        mode="create"
        open={createOpen}
        onOpenChange={setCreateOpen}
      />
    </section>
  )
}
