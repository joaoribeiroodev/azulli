"use client"

import { MessageCircle } from "lucide-react"

import { LANDING_LINKS } from "./constants"

export function LandingWhatsAppFloat() {
  return (
    <a
      href={LANDING_LINKS.whatsapp}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-5 right-4 sm:right-5 z-40 flex items-center gap-2 rounded-full bg-[#25D366] text-white pl-4 pr-5 py-3 text-sm font-semibold shadow-lg shadow-[#25D366]/30 hover:bg-[#20bd5a] hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200"
      aria-label="Falar no WhatsApp — mensagem sobre trial grátis"
    >
      <MessageCircle className="h-5 w-5 shrink-0" aria-hidden />
      <span className="hidden sm:inline">Fale conosco</span>
    </a>
  )
}
