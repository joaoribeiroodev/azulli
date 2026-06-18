import Link from "next/link"
import { BookOpen, Download } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export function ManualHelpCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <BookOpen className="h-4 w-4 text-brand" aria-hidden />
          Manual de uso
        </CardTitle>
        <CardDescription>
          Guia completo do Azulli — online ou em PDF para consultar offline.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-3">
        <Button variant="outline" asChild>
          <Link href="/manual">Abrir manual</Link>
        </Button>
        <Button asChild className="bg-brand hover:bg-brand-hover">
          <a href="/api/export/manual" download="manual-azulli.pdf">
            <Download className="h-4 w-4 mr-2" aria-hidden />
            Baixar PDF
          </a>
        </Button>
      </CardContent>
    </Card>
  )
}
