import Link from "next/link"
import { Settings, User } from "lucide-react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

import { LogoutMenuItem } from "@/components/app/logout-menu-item"

type Props = {
  name: string
  email: string
  avatarUrl?: string | null
}

/**
 * Menu de usuário pra sidebar. Recebe os dados como props (vindos do layout,
 * que já faz a query do user). Sync, sem await — apenas renderiza.
 */
export function UserMenu({ name, email, avatarUrl }: Props) {
  const displayName = name || email.split("@")[0] || "Você"
  const initials = getInitials(displayName)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="h-auto w-full justify-start gap-3 px-3 py-2 hover:bg-muted"
        >
          <Avatar className="h-9 w-9 border border-border shrink-0">
            {avatarUrl ? (
              <AvatarImage
                src={avatarUrl}
                alt={displayName}
                className="object-cover"
              />
            ) : null}
            <AvatarFallback className="bg-brand-soft text-brand text-sm font-semibold">
              {initials || <User className="h-4 w-4" />}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0 text-left">
            <p className="text-sm font-medium truncate">{displayName}</p>
            <p className="text-[11px] text-muted-foreground truncate">
              {email}
            </p>
          </div>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        side="top"
        className="w-56"
        sideOffset={8}
      >
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col">
            <span className="text-sm font-medium truncate">{displayName}</span>
            <span className="text-xs text-muted-foreground truncate">
              {email}
            </span>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/configuracoes" className="cursor-pointer">
            <Settings className="mr-2 h-4 w-4" />
            Configurações
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <LogoutMenuItem />
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function getInitials(name: string): string {
  if (!name) return ""
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}
