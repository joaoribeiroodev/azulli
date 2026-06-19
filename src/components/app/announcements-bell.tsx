"use client"

import { useCallback, useEffect, useState } from "react"
import { Bell } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { markAnnouncementReadAction } from "@/lib/announcements/actions"
import { cn } from "@/lib/utils"

type AnnouncementItem = {
  id: string
  title: string
  body: string
  priority: string
  published_at: string
  read: boolean
}

export function AnnouncementsBell() {
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<AnnouncementItem[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)

  const fetchAnnouncements = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/announcements")
      if (!res.ok) return
      const data = await res.json()
      setItems(data.items ?? [])
      setUnreadCount(data.unreadCount ?? 0)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAnnouncements()
  }, [fetchAnnouncements])

  useEffect(() => {
    if (open) fetchAnnouncements()
  }, [open, fetchAnnouncements])

  async function handleOpenItem(item: AnnouncementItem) {
    if (!item.read) {
      const result = await markAnnouncementReadAction(item.id)
      if (!result.success) {
        toast.error(result.error)
        return
      }
      setItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, read: true } : i))
      )
      setUnreadCount((c) => Math.max(0, c - 1))
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 relative shrink-0"
          aria-label="Notificações"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span
              className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center px-1"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="px-4 py-3 border-b">
          <p className="font-medium text-sm">Avisos do Azulli</p>
          <p className="text-xs text-muted-foreground">
            Manutenções, novidades e comunicados importantes
          </p>
        </div>
        <div className="max-h-72 overflow-y-auto">
          {loading && items.length === 0 ? (
            <p className="text-sm text-muted-foreground p-4">Carregando…</p>
          ) : items.length === 0 ? (
            <p className="text-sm text-muted-foreground p-4">
              Nenhum aviso no momento.
            </p>
          ) : (
            items.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => handleOpenItem(item)}
                className={cn(
                  "w-full text-left px-4 py-3 border-b last:border-0 hover:bg-muted/50 transition-colors",
                  !item.read && "bg-brand-soft/30"
                )}
              >
                <div className="flex items-start gap-2">
                  {!item.read && (
                    <span className="mt-1.5 h-2 w-2 rounded-full bg-brand shrink-0" />
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{item.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                      {item.body}
                    </p>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
