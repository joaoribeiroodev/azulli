import { Suspense } from "react"

import { FinderPage } from "@/components/finder/finder-page"

type Props = { params: Promise<{ id: string }> }

export default async function FinderLeadDetailPage({ params }: Props) {
  const { id } = await params
  return (
    <Suspense fallback={null}>
      <FinderPage route="leads" leadId={id} />
    </Suspense>
  )
}
