import Link from "next/link"
import { ChevronLeft } from "lucide-react"

import { cn } from "@/lib/utils"

type Props = {
  href: string
  children: React.ReactNode
  className?: string
}

export function BackLink({ href, children, className }: Props) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors min-h-9 -ml-1 px-1",
        className
      )}
    >
      <ChevronLeft className="h-4 w-4 shrink-0" />
      {children}
    </Link>
  )
}
