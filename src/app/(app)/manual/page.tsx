import { BookOpen, Download, ExternalLink } from "lucide-react"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import { BackLink } from "@/components/app/back-link"
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  USER_MANUAL_META,
  USER_MANUAL_SECTIONS,
} from "@/lib/docs/user-manual"

export const metadata = {
  title: "Manual de uso — Azulli",
  description: "Guia completo de como usar o Azulli",
}

export default function ManualPage() {
  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-3xl mx-auto">
      <header className="mb-6 sm:mb-8">
        <BackLink href="/dashboard" className="mb-3">
          Voltar ao painel
        </BackLink>
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-brand-soft p-2.5 shrink-0">
            <BookOpen className="h-6 w-6 text-brand" aria-hidden />
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl lg:text-3xl font-display font-bold text-brand-ink">
              {USER_MANUAL_META.title}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {USER_MANUAL_META.subtitle}
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              Versão {USER_MANUAL_META.version} · Atualizado em{" "}
              {USER_MANUAL_META.updatedAt}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 mt-5">
          <Button asChild className="bg-brand hover:bg-brand-hover">
            <a href="/api/export/manual" download="manual-azulli.pdf">
              <Download className="h-4 w-4 mr-2" aria-hidden />
              Baixar PDF
            </a>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/assistente">
              <ExternalLink className="h-4 w-4 mr-2" aria-hidden />
              Perguntar ao Assistente
            </Link>
          </Button>
        </div>
      </header>

      <Card className="mb-6 border-brand/20 bg-brand-soft/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Como usar este manual</CardTitle>
          <CardDescription>
            Leia online por seção ou baixe o PDF para consultar offline,
            compartilhar com sua equipe ou arquivar.
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="space-y-6">
        {USER_MANUAL_SECTIONS.map((section, index) => (
          <section
            key={section.id}
            id={section.id}
            className="scroll-mt-6"
          >
            <div className="flex items-center gap-2 mb-3">
              <Badge
                variant="secondary"
                className="font-mono text-[10px] shrink-0"
              >
                {String(index + 1).padStart(2, "0")}
              </Badge>
              <h2 className="text-lg font-semibold text-brand-ink">
                {section.title}
              </h2>
            </div>

            {section.paragraphs?.map((p) => (
              <p
                key={p.slice(0, 40)}
                className="text-sm text-muted-foreground leading-relaxed mb-3"
              >
                {p}
              </p>
            ))}

            {section.bullets && (
              <ul className="space-y-2 text-sm text-foreground/90">
                {section.bullets.map((bullet) => (
                  <li key={bullet.slice(0, 48)} className="flex gap-2">
                    <span
                      className="text-brand shrink-0 mt-1.5 h-1.5 w-1.5 rounded-full bg-brand"
                      aria-hidden
                    />
                    <span className="leading-relaxed">{bullet}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </div>

      <footer className="mt-10 pt-6 border-t text-center text-xs text-muted-foreground space-y-1">
        <p>
          Precisa de ajuda?{" "}
          <a
            href={`mailto:${USER_MANUAL_META.supportEmail}`}
            className="text-brand hover:underline"
          >
            {USER_MANUAL_META.supportEmail}
          </a>
        </p>
        <p>
          <Link href="/termos-de-uso" className="hover:underline">
            Termos de uso
          </Link>
          {" · "}
          <Link href="/politica-de-privacidade" className="hover:underline">
            Política de privacidade
          </Link>
        </p>
      </footer>
    </div>
  )
}
