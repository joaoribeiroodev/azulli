"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"

import { cn } from "@/lib/utils"

import { LANDING_NAV } from "./constants"

const HEADER_OFFSET = 72

export function LandingNavLinks() {
  const [activeHref, setActiveHref] = useState<string>("")

  const scrollToSection = useCallback((href: string) => {
    const id = href.replace("#", "")
    const el = document.getElementById(id)
    if (!el) return

    const top =
      el.getBoundingClientRect().top + window.scrollY - HEADER_OFFSET + 4

    window.scrollTo({ top, behavior: "smooth" })
    window.history.pushState(null, "", href)
    setActiveHref(href)
  }, [])

  useEffect(() => {
    const hash = window.location.hash
    if (hash && LANDING_NAV.some((item) => item.href === hash)) {
      requestAnimationFrame(() => scrollToSection(hash))
    }
  }, [scrollToSection])

  useEffect(() => {
    const sectionIds = LANDING_NAV.map((item) => item.href.replace("#", ""))
    const elements = sectionIds
      .map((id) => document.getElementById(id))
      .filter(Boolean) as HTMLElement[]

    if (elements.length === 0) return

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)

        if (visible.length > 0) {
          setActiveHref(`#${visible[0].target.id}`)
        }
      },
      {
        rootMargin: `-${HEADER_OFFSET}px 0px -55% 0px`,
        threshold: [0.1, 0.35, 0.6],
      }
    )

    for (const el of elements) observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <ul
      className="hidden md:flex items-center gap-0.5 min-w-0"
      aria-label="Seções"
    >
      {LANDING_NAV.map((item) => {
        const isActive = activeHref === item.href
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              onClick={(e) => {
                e.preventDefault()
                scrollToSection(item.href)
              }}
              className={cn(
                "rounded-lg px-2.5 py-2 text-sm font-medium transition-all duration-200",
                isActive
                  ? "text-brand-ink bg-brand-soft/80"
                  : "text-muted-foreground hover:text-brand-ink hover:bg-brand-soft/50"
              )}
              aria-current={isActive ? "true" : undefined}
            >
              {item.label}
            </Link>
          </li>
        )
      })}
    </ul>
  )
}
