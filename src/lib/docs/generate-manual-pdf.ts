import "server-only"

import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib"

import {
  USER_MANUAL_META,
  USER_MANUAL_SECTIONS,
  type ManualSection,
} from "./user-manual"

const PAGE_WIDTH = 595.28
const PAGE_HEIGHT = 841.89
const MARGIN = 50
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2
const LINE_HEIGHT = 14
const BOTTOM = 56

/** WinAnsi (Helvetica) não inclui Unicode fora de Latin-1 / símbolos comuns. */
function sanitizeForPdf(text: string): string {
  let out = text
    .replace(/\u2192/g, "->")
    .replace(/\u2190/g, "<-")
    .replace(/\u2013/g, "-")
    .replace(/\u2014/g, "-")
    .replace(/\u2026/g, "...")
    .replace(/«/g, '"')
    .replace(/»/g, '"')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')

  // Mantém ASCII imprimível + Latin-1 (acentos PT); troca o resto por '?'
  return out.replace(/[^\t\n\r\x20-\x7E\xA0-\xFF]/g, "?")
}

function wrapLines(
  text: string,
  font: PDFFont,
  size: number,
  maxWidth: number
): string[] {
  const words = sanitizeForPdf(text).split(/\s+/)
  const lines: string[] = []
  let current = ""

  for (const word of words) {
    if (!word) continue
    const test = current ? `${current} ${word}` : word
    try {
      if (font.widthOfTextAtSize(test, size) > maxWidth && current) {
        lines.push(current)
        current = word
      } else {
        current = test
      }
    } catch {
      const safeWord = sanitizeForPdf(word)
      const safeTest = current ? `${current} ${safeWord}` : safeWord
      if (font.widthOfTextAtSize(safeTest, size) > maxWidth && current) {
        lines.push(current)
        current = safeWord
      } else {
        current = safeTest
      }
    }
  }
  if (current) lines.push(current)
  return lines.length ? lines : [""]
}

type PdfWriter = {
  page: PDFPage
  y: number
  font: PDFFont
  fontBold: PDFFont
  ensureSpace: (needed: number) => void
  drawWrapped: (
    text: string,
    opts?: { size?: number; bold?: boolean; color?: [number, number, number]; gap?: number }
  ) => void
  drawBullet: (text: string) => void
}

function createWriter(
  pdfDoc: PDFDocument,
  font: PDFFont,
  fontBold: PDFFont
): PdfWriter {
  let page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT])
  let y = PAGE_HEIGHT - MARGIN

  function ensureSpace(needed: number) {
    if (y - needed < BOTTOM) {
      page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT])
      y = PAGE_HEIGHT - MARGIN
    }
  }

  function drawWrapped(
    text: string,
    opts?: { size?: number; bold?: boolean; color?: [number, number, number]; gap?: number }
  ) {
    const size = opts?.size ?? 10
    const f = opts?.bold ? fontBold : font
    const color = opts?.color
      ? rgb(opts.color[0], opts.color[1], opts.color[2])
      : rgb(0.2, 0.25, 0.33)
    const lines = wrapLines(text, f, size, CONTENT_WIDTH)
    for (const line of lines) {
      ensureSpace(LINE_HEIGHT)
      page.drawText(line, { x: MARGIN, y, size, font: f, color })
      y -= LINE_HEIGHT
    }
    y -= opts?.gap ?? 4
  }

  function drawBullet(text: string) {
    const size = 10
    const bullet = "• "
    const bulletWidth = font.widthOfTextAtSize(bullet, size)
    const lines = wrapLines(text, font, size, CONTENT_WIDTH - bulletWidth)
    for (let i = 0; i < lines.length; i++) {
      ensureSpace(LINE_HEIGHT)
      if (i === 0) {
        page.drawText(bullet, {
          x: MARGIN,
          y,
          size,
          font,
          color: rgb(0.06, 0.29, 0.36),
        })
        page.drawText(lines[i], {
          x: MARGIN + bulletWidth,
          y,
          size,
          font,
          color: rgb(0.2, 0.25, 0.33),
        })
      } else {
        page.drawText(lines[i], {
          x: MARGIN + bulletWidth,
          y,
          size,
          font,
          color: rgb(0.2, 0.25, 0.33),
        })
      }
      y -= LINE_HEIGHT
    }
    y -= 2
  }

  return {
    page,
    y,
    font,
    fontBold,
    ensureSpace,
    drawWrapped,
    drawBullet,
  }
}

function writeSection(writer: PdfWriter, section: ManualSection) {
  writer.drawWrapped(section.title, {
    size: 13,
    bold: true,
    color: [0.06, 0.29, 0.36],
    gap: 6,
  })

  if (section.paragraphs) {
    for (const p of section.paragraphs) {
      writer.drawWrapped(p, { gap: 6 })
    }
  }

  if (section.bullets) {
    for (const bullet of section.bullets) {
      writer.drawBullet(bullet)
    }
  }
}

/**
 * Gera o PDF do manual de uso (buffer).
 */
export async function generateUserManualPdf(): Promise<Buffer> {
  const pdfDoc = await PDFDocument.create()
  pdfDoc.setTitle(USER_MANUAL_META.title)
  pdfDoc.setAuthor("Azulli")
  pdfDoc.setSubject("Manual de uso")

  const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
  const writer = createWriter(pdfDoc, font, fontBold)

  writer.drawWrapped(USER_MANUAL_META.title, {
    size: 20,
    bold: true,
    color: [0.06, 0.29, 0.36],
    gap: 8,
  })
  writer.drawWrapped(USER_MANUAL_META.subtitle, {
    size: 11,
    color: [0.39, 0.45, 0.55],
    gap: 4,
  })
  writer.drawWrapped(
    `Versão ${USER_MANUAL_META.version} · Atualizado em ${USER_MANUAL_META.updatedAt} · ${USER_MANUAL_META.siteUrl}`,
    { size: 9, color: [0.58, 0.64, 0.74], gap: 16 }
  )

  for (const section of USER_MANUAL_SECTIONS) {
    writeSection(writer, section)
  }

  writer.ensureSpace(40)
  writer.drawWrapped(
    `Dúvidas? ${USER_MANUAL_META.supportEmail} · Azulli — gestão financeira para pequenas empresas.`,
    { size: 9, color: [0.39, 0.45, 0.55] }
  )

  return Buffer.from(await pdfDoc.save())
}
