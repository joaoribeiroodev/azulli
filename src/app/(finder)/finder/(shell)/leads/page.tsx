import { Suspense } from "react"

import { FinderPage } from "@/components/finder/finder-page"

export default function FinderLeadsPage() {
  return (
    <Suspense fallback={null}>
      <FinderPage route="leads" />
    </Suspense>
  )
}
