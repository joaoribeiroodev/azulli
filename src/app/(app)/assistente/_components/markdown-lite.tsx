import { Fragment } from "react"

/**
 * Renderizador minimalista de Markdown — cobre só o que o assistant produz:
 * - **bold** e *italic*
 * - `code` inline
 * - listas começando com "- " ou "* " ou "1. "
 * - parágrafos separados por linha em branco
 * - quebras de linha simples
 *
 * Sem dependências externas. Suficiente pra respostas curtas e tabuladas.
 */
export function MarkdownLite({ text }: { text: string }) {
  const blocks = parseBlocks(text)
  return (
    <>
      {blocks.map((block, i) => {
        if (block.type === "ul") {
          return (
            <ul key={i} className="list-disc pl-5 space-y-1 my-1">
              {block.items.map((item, j) => (
                <li key={j}>{renderInline(item)}</li>
              ))}
            </ul>
          )
        }
        if (block.type === "ol") {
          return (
            <ol key={i} className="list-decimal pl-5 space-y-1 my-1">
              {block.items.map((item, j) => (
                <li key={j}>{renderInline(item)}</li>
              ))}
            </ol>
          )
        }
        return (
          <p key={i} className={i > 0 ? "mt-2" : undefined}>
            {renderInline(block.text)}
          </p>
        )
      })}
    </>
  )
}

type Block =
  | { type: "p"; text: string }
  | { type: "ul"; items: string[] }
  | { type: "ol"; items: string[] }

function parseBlocks(text: string): Block[] {
  const lines = text.split("\n")
  const blocks: Block[] = []
  let buf: string[] = []
  let listType: "ul" | "ol" | null = null
  let listBuf: string[] = []

  const flushParagraph = () => {
    if (buf.length > 0) {
      blocks.push({ type: "p", text: buf.join("\n") })
      buf = []
    }
  }
  const flushList = () => {
    if (listType && listBuf.length > 0) {
      blocks.push({ type: listType, items: listBuf })
    }
    listType = null
    listBuf = []
  }

  for (const raw of lines) {
    const line = raw.trimEnd()
    const ulMatch = /^\s*[-*]\s+(.*)$/.exec(line)
    const olMatch = /^\s*\d+\.\s+(.*)$/.exec(line)

    if (ulMatch) {
      flushParagraph()
      if (listType !== "ul") flushList()
      listType = "ul"
      listBuf.push(ulMatch[1])
    } else if (olMatch) {
      flushParagraph()
      if (listType !== "ol") flushList()
      listType = "ol"
      listBuf.push(olMatch[1])
    } else if (line.trim() === "") {
      flushParagraph()
      flushList()
    } else {
      flushList()
      buf.push(line)
    }
  }
  flushParagraph()
  flushList()
  return blocks
}

// ---------------------------------------------------------------------------
// Inline: **bold**, *italic*, `code`
// ---------------------------------------------------------------------------

const INLINE_RE = /(\*\*[^*\n]+\*\*|\*[^*\n]+\*|`[^`\n]+`)/g

function renderInline(text: string): React.ReactNode {
  const parts = text.split(INLINE_RE)
  return parts.map((part, i) => {
    if (!part) return null
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={i} className="font-semibold">
          {part.slice(2, -2)}
        </strong>
      )
    }
    if (part.startsWith("*") && part.endsWith("*")) {
      return (
        <em key={i} className="italic">
          {part.slice(1, -1)}
        </em>
      )
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code
          key={i}
          className="rounded bg-muted px-1 py-0.5 text-[0.85em] font-mono"
        >
          {part.slice(1, -1)}
        </code>
      )
    }
    return <Fragment key={i}>{part}</Fragment>
  })
}
