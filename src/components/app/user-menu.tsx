"use client"

import { useTransition } from "react"
import { LogOut, User as UserIcon } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { signOutAction } from "@/lib/auth/actions"

type Props = {
  name: string
  email: string
}

export function UserMenu({ name, email }: Props) {
  const [isPending, startTransition] = useTransition()
  const initials = name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-3 w-full px-3 py-2 rounded-lg hover:bg-muted transition-colors">
        <Avatar className="h-9 w-9">
          <AvatarFallback className="bg-brand text-primary-foreground text-xs font-semibold">
            {initials || <UserIcon className="h-4 w-4" />}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 text-left overflow-hidden">
          <p className="text-sm font-medium truncate">{name}</p>
          <p className="text-xs text-muted-foreground truncate">{email}</p>
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Minha conta</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          disabled={isPending}
          onClick={() => startTransition(() => signOutAction())}
          className="text-destructive focus:text-destructive"
        >
          <LogOut className="mr-2 h-4 w-4" />
          Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}