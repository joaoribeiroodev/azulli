import { Suspense } from "react"

import { FinderPage } from "@/components/finder/finder-page"

export default function FinderHistoricoPage() {
  return (
    <Suspense fallback={null}>
      <FinderPage route="historico" />
    </Suspense>
  )
}
