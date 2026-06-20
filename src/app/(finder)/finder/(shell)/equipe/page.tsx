import { Suspense } from "react"

import { FinderPage } from "@/components/finder/finder-page"

export default function FinderEquipePage() {
  return (
    <Suspense fallback={null}>
      <FinderPage route="equipe" />
    </Suspense>
  )
}
