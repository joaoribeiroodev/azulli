"use client"

import { useTransition } from "react"
import { LogOut } from "lucide-react"

import { DropdownMenuItem } from "@/components/ui/dropdown-menu"
import { signOutAction } from "@/lib/auth/actions"

export function LogoutMenuItem() {
  const [pending, startTransition] = useTransition()

  return (
    <DropdownMenuItem
      variant="destructive"
      disabled={pending}
      onSelect={(event) => {
        event.preventDefault()
        startTransition(() => {
          signOutAction()
        })
      }}
    >
      <LogOut className="mr-2 h-4 w-4" />
      {pending ? "Saindo..." : "Sair"}
    </DropdownMenuItem>
  )
}
