import Link from "next/link"
import { MessageCircle } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  getCustomerOverdueCollectionTarget,
  type CustomerDetail,
} from "@/lib/financial/queries"
import { createClient } from "@/lib/supabase/server"
import { buildCollectionWhatsAppUrl } from "@/lib/whatsapp/collection-message"

export async function CustomerCollectionAction({
  customer,
}: {
  customer: CustomerDetail
}) {
  if (!customer.phone || customer.kpis.overdueAmount <= 0) return null

  const target = await getCustomerOverdueCollectionTarget(customer.id)
  if (!target) return null

  const supabase = await createClient()
  const { data: tenant } = await supabase
    .from("tenants")
    .select("name")
    .limit(1)
    .maybeSingle()

  const url = buildCollectionWhatsAppUrl({
    phone: customer.phone,
    customerName: customer.name,
    amount: target.amount,
    dueDate: target.due_date,
    description: target.description,
    companyName: tenant?.name as string | undefined,
  })

  if (!url) return null

  return (
    <Button
      asChild
      size="sm"
      className="gap-2 bg-[#25D366] hover:bg-[#1ebe5d] text-white shrink-0"
    >
      <Link href={url} target="_blank" rel="noopener noreferrer">
        <MessageCircle className="h-4 w-4" aria-hidden />
        Cobrar no WhatsApp
      </Link>
    </Button>
  )
}
