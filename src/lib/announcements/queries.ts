import "server-only"

import { cache } from "react"
import { createClient } from "@/lib/supabase/server"

export type UserAnnouncement = {
  id: string
  title: string
  body: string
  priority: string
  published_at: string
  read: boolean
}

export const getUserAnnouncements = cache(async (): Promise<{
  items: UserAnnouncement[]
  unreadCount: number
}> => {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { items: [], unreadCount: 0 }

  const { data: tenant } = await supabase
    .from("tenants")
    .select("tier")
    .limit(1)
    .maybeSingle()

  const tier = (tenant?.tier as string) ?? "trial"

  const { data: announcements } = await supabase
    .from("system_announcements")
    .select("id, title, body, priority, audience, published_at, expires_at")
    .lte("published_at", new Date().toISOString())
    .order("published_at", { ascending: false })
    .limit(30)

  const now = new Date()
  const filtered =
    announcements?.filter(
      (a) =>
        (a.audience === "all" || a.audience === tier) &&
        (!a.expires_at || new Date(a.expires_at) > now)
    ) ?? []

  const { data: reads } = await supabase
    .from("announcement_reads")
    .select("announcement_id")
    .eq("user_id", user.id)

  const readSet = new Set(reads?.map((r) => r.announcement_id) ?? [])

  const items: UserAnnouncement[] = filtered.map((a) => ({
    id: a.id,
    title: a.title,
    body: a.body,
    priority: a.priority,
    published_at: a.published_at,
    read: readSet.has(a.id),
  }))

  const unreadCount = items.filter((i) => !i.read).length
  return { items, unreadCount }
})
