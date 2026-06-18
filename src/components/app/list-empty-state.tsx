import type { LucideIcon } from "lucide-react"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type Action =
  | { label: string; href: string; onClick?: never }
  | { label: string; onClick: () => void; href?: never }

type Props = {
  icon: LucideIcon
  title: string
  description: string
  action?: Action
  secondaryAction?: Action
  className?: string
}

export function ListEmptyState({
  icon: Icon,
  title,
  description,
  action,
  secondaryAction,
  className,
}: Props) {
  return (
    <div
      className={cn(
        "rounded-xl border bg-card py-14 px-6 text-center",
        className
      )}
    >
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-brand-soft mb-4">
        <Icon className="h-6 w-6 text-brand" aria-hidden />
      </div>
      <p className="text-sm font-medium text-foreground">{title}</p>
      <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto leading-relaxed">
        {description}
      </p>
      {(action || secondaryAction) && (
        <div className="flex flex-wrap items-center justify-center gap-2 mt-5">
          {action &&
            (action.href ? (
              <Button asChild size="sm" className="bg-brand hover:bg-brand-hover">
                <Link href={action.href}>{action.label}</Link>
              </Button>
            ) : (
              <Button
                size="sm"
                className="bg-brand hover:bg-brand-hover"
                onClick={action.onClick}
              >
                {action.label}
              </Button>
            ))}
          {secondaryAction &&
            (secondaryAction.href ? (
              <Button asChild variant="outline" size="sm">
                <Link href={secondaryAction.href}>{secondaryAction.label}</Link>
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={secondaryAction.onClick}
              >
                {secondaryAction.label}
              </Button>
            ))}
        </div>
      )}
    </div>
  )
}
