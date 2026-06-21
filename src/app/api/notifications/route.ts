import { NextResponse } from "next/server"

import { getUserNotifications } from "@/lib/notifications/queries"

export async function GET() {
  const data = await getUserNotifications()
  return NextResponse.json(data)
}
