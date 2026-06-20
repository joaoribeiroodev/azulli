import { FinderLeadDetailPage } from "@/components/finder/pages/finder-lead-detail-page"

type Props = { params: Promise<{ id: string }> }

export default async function FinderLeadDetailRoute({ params }: Props) {
  const { id } = await params
  return <FinderLeadDetailPage leadId={id} />
}
