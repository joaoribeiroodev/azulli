import "server-only"

import { getUserAnnouncements } from "@/lib/announcements/queries"
import { getAgendaAlerts } from "@/lib/notifications/agenda-alerts"

export async function getUserNotifications() {
  const [announcements, agendaAlerts] = await Promise.all([
    getUserAnnouncements(),
    getAgendaAlerts(),
  ])

  const badgeCount =
    announcements.unreadCount + agendaAlerts.length

  return {
    announcements: announcements.items,
    announcementsUnreadCount: announcements.unreadCount,
    agendaAlerts,
    agendaAlertCount: agendaAlerts.length,
    badgeCount,
  }
}
