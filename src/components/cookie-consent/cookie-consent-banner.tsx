"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"

import { Button } from "@/components/ui/button"
import { LEGAL_PATHS } from "@/lib/legal/paths"

const CONSENT_KEY = "azulli_cookie_consent"
const CONSENT_MAX_AGE_DAYS = 365

function hasConsent(): boolean {
  if (typeof window === "undefined") return true
  try {
    if (localStorage.getItem(CONSENT_KEY) === "accepted") return true
    return document.cookie.includes(`${CONSENT_KEY}=accepted`)
  } catch {
    return false
  }
}

function persistConsent() {
  try {
    localStorage.setItem(CONSENT_KEY, "accepted")
  } catch {
    // localStorage indisponível — cookie apenas
  }
  const maxAge = CONSENT_MAX_AGE_DAYS * 24 * 60 * 60
  document.cookie = `${CONSENT_KEY}=accepted; path=/; max-age=${maxAge}; SameSite=Lax`
}

export function CookieConsentBanner() {
  const pathname = usePathname()
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!hasConsent()) setVisible(true)
  }, [])

  if (pathname.startsWith("/admin") || pathname.startsWith("/finder")) return null

  if (!visible) return null

  return (
    <div
      className="fixed bottom-0 inset-x-0 z-[100] px-4 pt-4 pb-safe sm:px-5 animate-in slide-in-from-bottom-4 duration-300"
      role="dialog"
      aria-label="Consentimento de cookies"
    >
      <div
        className="mx-auto max-w-3xl rounded-xl border border-border bg-card/95 backdrop-blur-md shadow-lg px-4 py-4 sm:px-5 sm:py-5 flex flex-col sm:flex-row sm:items-center gap-4"
      >
        <p className="text-sm text-muted-foreground leading-relaxed flex-1">
          Usamos cookies essenciais para manter sua sessão (incluindo entre
          subdomínios use e trial), preferências (ex.: tema) e, se instalado,
          cache do PWA. Saiba mais na nossa{" "}
          <Link
            href={LEGAL_PATHS.privacy}
            className="text-brand font-medium hover:underline underline-offset-4"
          >
            Política de privacidade
          </Link>
          .
        </p>
        <div className="flex shrink-0 gap-2 sm:flex-col sm:items-stretch">
          <Button
            size="sm"
            className="bg-brand hover:bg-brand-hover"
            onClick={() => {
              persistConsent()
              setVisible(false)
            }}
          >
            Aceitar
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="text-muted-foreground"
            onClick={() => {
              persistConsent()
              setVisible(false)
            }}
          >
            Fechar
          </Button>
        </div>
      </div>
    </div>
  )
}
