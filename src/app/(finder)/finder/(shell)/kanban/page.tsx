import { Suspense } from "react"

import { FinderPage } from "@/components/finder/finder-page"

export default function FinderKanbanPage() {
  return (
    <Suspense fallback={null}>
      <FinderPage route="kanban" />
    </Suspense>
  )
}
