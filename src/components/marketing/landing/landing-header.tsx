"use client"

import Link from "next/link"

import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/theme-toggle"

import { LANDING_LINKS } from "./constants"
import { LandingContainer } from "./primitives"
import { LandingNavLinks } from "./landing-nav-links"
import { LandingMobileMenu } from "./landing-mobile-menu"

export function LandingHeader() {
  return (
    <header className="sticky top-0 z-50 bg-card border-b border-border">
      <LandingContainer>
        <nav
          className="flex h-16 lg:h-[4.25rem] items-center justify-between gap-4"
          aria-label="Principal"
        >
          <div className="flex items-center gap-2 lg:gap-6 min-w-0">
            <LandingMobileMenu />
            <Link
              href="/"
              className="text-xl font-display font-bold text-brand-ink tracking-tight shrink-0 hover:opacity-90 transition-opacity"
            >
              Azulli
            </Link>
            <LandingNavLinks />
          </div>

          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            <ThemeToggle />
            <Button
              variant="ghost"
              size="sm"
              asChild
              className="h-9 text-sm font-medium text-muted-foreground hover:text-brand-ink"
            >
              <Link href={LANDING_LINKS.login}>Entrar</Link>
            </Button>
            <Button
              size="sm"
              asChild
              className="h-9 px-4 text-sm font-medium bg-brand hover:bg-brand-hover text-primary-foreground shadow-none"
            >
              <Link href={LANDING_LINKS.register}>Trial grátis</Link>
            </Button>
          </div>
        </nav>
      </LandingContainer>
    </header>
  )
}
