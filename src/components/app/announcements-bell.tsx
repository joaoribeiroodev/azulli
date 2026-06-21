"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { Bell, Calendar, ChevronRight, Target } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { markAnnouncementReadAction } from "@/lib/announcements/actions"
import type { AgendaAlert } from "@/lib/notifications/agenda-alerts"
import { cn } from "@/lib/utils"

type AnnouncementItem = {
  id: string
  title: string
  body: string
  priority: string
  published_at: string
  read: boolean
}

const URGENCY_STYLES: Record<
  AgendaAlert["urgency"],
  { dot: string; label: string }
> = {
  overdue: {
    dot: "bg-destructive",
    label: "Atrasado",
  },
  today: {
    dot: "bg-amber-500",
    label: "Hoje",
  },
  soon: {
    dot: "bg-brand",
    label: "Em breve",
  },
}

export function AnnouncementsBell() {
  const [open, setOpen] = useState(false)
  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>([])
  const [agendaAlerts, setAgendaAlerts] = useState<AgendaAlert[]>([])
  const [announcementsUnreadCount, setAnnouncementsUnreadCount] = useState(0)
  const [badgeCount, setBadgeCount] = useState(0)
  const [loading, setLoading] = useState(false)

  const fetchNotifications = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/notifications")
      if (!res.ok) return
      const data = await res.json()
      setAnnouncements(data.announcements ?? [])
      setAgendaAlerts(data.agendaAlerts ?? [])
      setAnnouncementsUnreadCount(data.announcementsUnreadCount ?? 0)
      setBadgeCount(data.badgeCount ?? 0)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchNotifications()
  }, [fetchNotifications])

  useEffect(() => {
    if (open) fetchNotifications()
  }, [open, fetchNotifications])

  async function handleOpenAnnouncement(item: AnnouncementItem) {
    if (!item.read) {
      const result = await markAnnouncementReadAction(item.id)
      if (!result.success) {
        toast.error(result.error)
        return
      }
      setAnnouncements((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, read: true } : i))
      )
      setAnnouncementsUnreadCount((c) => Math.max(0, c - 1))
      setBadgeCount((c) => Math.max(0, c - 1))
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
          {badgeCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center px-1">
              {badgeCount > 9 ? "9+" : badgeCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="px-4 py-3 border-b">
          <p className="font-medium text-sm">Notificações</p>
          <p className="text-xs text-muted-foreground">
            Lembretes, metas e avisos do Azulli
          </p>
        </div>

        <div className="max-h-80 overflow-y-auto">
          <section className="border-b">
            <div className="px-4 py-2 flex items-center justify-between gap-2 bg-muted/30">
              <p className="text-xs font-medium text-muted-foreground">
                Metas e lembretes
              </p>
              {agendaAlerts.length > 0 && (
                <span className="text-[10px] font-medium text-muted-foreground">
                  {agendaAlerts.length}
                </span>
              )}
            </div>

            {loading && agendaAlerts.length === 0 ? (
              <p className="text-sm text-muted-foreground px-4 py-3">
                Carregando…
              </p>
            ) : agendaAlerts.length === 0 ? (
              <p className="text-sm text-muted-foreground px-4 py-3">
                Nada urgente por aqui.
              </p>
            ) : (
              <ul>
                {agendaAlerts.map((alert) => (
                  <AgendaAlertItem
                    key={alert.id}
                    alert={alert}
                    onNavigate={() => setOpen(false)}
                  />
                ))}
              </ul>
            )}

            <div className="px-4 py-2 border-t">
              <Button
                asChild
                variant="ghost"
                size="sm"
                className="w-full justify-between h-8 text-xs"
              >
                <Link href="/agenda" onClick={() => setOpen(false)}>
                  Ver agenda completa
                  <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
            </div>
          </section>

          <section>
            <div className="px-4 py-2 flex items-center justify-between gap-2 bg-muted/30">
              <p className="text-xs font-medium text-muted-foreground">
                Avisos do Azulli
              </p>
              {announcementsUnreadCount > 0 && (
                <span className="text-[10px] font-medium text-brand">
                  {announcementsUnreadCount} não lido
                  {announcementsUnreadCount === 1 ? "" : "s"}
                </span>
              )}
            </div>

            {loading && announcements.length === 0 ? (
              <p className="text-sm text-muted-foreground px-4 py-3">
                Carregando…
              </p>
            ) : announcements.length === 0 ? (
              <p className="text-sm text-muted-foreground px-4 py-3">
                Nenhum aviso no momento.
              </p>
            ) : (
              announcements.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleOpenAnnouncement(item)}
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
          </section>
        </div>
      </PopoverContent>
    </Popover>
  )
}

function AgendaAlertItem({
  alert,
  onNavigate,
}: {
  alert: AgendaAlert
  onNavigate: () => void
}) {
  const style = URGENCY_STYLES[alert.urgency]
  const Icon = alert.source === "goal" ? Target : Bell

  return (
    <li>
      <Link
        href={alert.href}
        onClick={onNavigate}
        className="flex items-start gap-2.5 px-4 py-3 border-b last:border-0 hover:bg-muted/50 transition-colors"
      >
        <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted/60">
          <Icon className="h-3.5 w-3.5 text-muted-foreground" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <p className="text-sm font-medium truncate">{alert.title}</p>
            <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
              <span
                className={cn("h-1.5 w-1.5 rounded-full", style.dot)}
                aria-hidden
              />
              {style.label}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
            {alert.subtitle}
          </p>
        </div>
        <Calendar className="h-3.5 w-3.5 shrink-0 text-muted-foreground mt-1" />
      </Link>
    </li>
  )
}
