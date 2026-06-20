import { Suspense } from "react"

import { FinderPage } from "@/components/finder/finder-page"

export default function FinderBuscarPage() {
  return (
    <Suspense fallback={null}>
      <FinderPage route="buscar" />
    </Suspense>
  )
}
