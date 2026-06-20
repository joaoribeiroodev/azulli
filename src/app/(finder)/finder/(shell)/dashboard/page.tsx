import { Suspense } from "react"

import { FinderPage } from "@/components/finder/finder-page"

export default function FinderDashboardPage() {
  return (
    <Suspense fallback={null}>
      <FinderPage route="dashboard" />
    </Suspense>
  )
}
