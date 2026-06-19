import { NextResponse } from "next/server"
import { getUserAnnouncements } from "@/lib/announcements/queries"

export async function GET() {
  const { items, unreadCount } = await getUserAnnouncements()
  return NextResponse.json({ items, unreadCount })
}
