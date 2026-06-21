import type { ReactNode } from "react"
import Link from "next/link"
import { ArrowRight } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

/** Largura alinhada ao desktop — menos vazio nas laterais */
export function LandingContainer({
  className,
  children,
}: {
  className?: string
  children: ReactNode
}) {
  return (
    <div
      className={cn(
        "mx-auto w-full max-w-[1360px] px-4 sm:px-5 lg:px-6 xl:px-8",
        className
      )}
    >
      {children}
    </div>
  )
}

export function LandingSection({
  id,
  className,
  children,
  muted,
}: {
  id?: string
  className?: string
  children: ReactNode
  muted?: boolean
}) {
  return (
    <section
      id={id}
      className={cn(
        "py-14 sm:py-16 lg:py-24 scroll-mt-[4.25rem] lg:scroll-mt-[4.5rem]",
        muted && "bg-card/40 border-y border-border/50",
        className
      )}
    >
      {children}
    </section>
  )
}

export function SectionHeader({
  title,
  description,
  align = "center",
  className,
}: {
  title: string
  description?: string
  align?: "center" | "left"
  className?: string
}) {
  return (
    <header
      className={cn(
        "max-w-2xl",
        align === "center" && "mx-auto text-center",
        className
      )}
    >
      <h2 className="text-2xl sm:text-3xl lg:text-4xl font-display font-bold text-brand-ink tracking-tight text-balance">
        {title}
      </h2>
      {description && (
        <p className="mt-3 text-base sm:text-lg text-muted-foreground leading-relaxed text-pretty">
          {description}
        </p>
      )}
    </header>
  )
}

const primaryCtaClass =
  "group h-11 sm:h-12 px-6 text-base font-semibold gap-2 bg-brand text-primary-foreground shadow-lg shadow-brand/20 hover:bg-brand-hover hover:shadow-xl hover:shadow-brand/30 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 ease-out"

const secondaryCtaClass =
  "h-11 sm:h-12 px-6 text-base font-medium text-muted-foreground border-border/70 bg-background/60 hover:bg-muted/80 hover:text-foreground hover:border-border transition-all duration-200"

export function LandingPrimaryCta({
  href,
  children,
  className,
  showArrow = true,
  external,
}: {
  href: string
  children: ReactNode
  className?: string
  showArrow?: boolean
  external?: boolean
}) {
  const arrow = showArrow && (
    <ArrowRight
      className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5"
      aria-hidden
    />
  )

  const isExternal = external ?? /^https?:\/\//i.test(href)

  if (isExternal) {
    return (
      <Button asChild size="lg" className={cn(primaryCtaClass, className)}>
        <a href={href} rel="noopener noreferrer">
          {children}
          {arrow}
        </a>
      </Button>
    )
  }

  return (
    <Button asChild size="lg" className={cn(primaryCtaClass, className)}>
      <Link href={href}>
        {children}
        {arrow}
      </Link>
    </Button>
  )
}

export function LandingSecondaryCta({
  href,
  children,
  className,
}: {
  href: string
  children: ReactNode
  className?: string
}) {
  return (
    <Button
      asChild
      variant="outline"
      size="lg"
      className={cn(secondaryCtaClass, className)}
    >
      <Link href={href}>{children}</Link>
    </Button>
  )
}

export function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <rect x="2" y="2" width="20" height="20" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  )
}

export function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      className={cn("h-4 w-4 shrink-0 text-brand", className)}
      aria-hidden
    >
      <path
        d="M3 8.5L6.5 12L13 4"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
