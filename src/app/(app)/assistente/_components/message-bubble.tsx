import { Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"
import { ToolIndicator } from "./tool-indicator"
import { MarkdownLite } from "./markdown-lite"

type Props = {
  role: "user" | "assistant"
  content: string
  toolCalls?: { name: string }[] | null
  pending?: boolean
}

export function MessageBubble({ role, content, toolCalls, pending }: Props) {
  if (role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-2xl rounded-tr-sm bg-brand text-primary-foreground px-4 py-2.5 text-sm whitespace-pre-wrap break-words">
          {content}
        </div>
      </div>
    )
  }

  return (
    <div className="flex gap-3 items-start">
      <div className="h-8 w-8 rounded-full bg-brand-soft flex items-center justify-center shrink-0">
        <Sparkles className="h-4 w-4 text-brand" />
      </div>
      <div className="flex-1 min-w-0 space-y-2">
        {toolCalls && toolCalls.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {toolCalls.map((t, i) => (
              <ToolIndicator key={i} name={t.name} done />
            ))}
          </div>
        )}
        <div
          className={cn(
            "text-sm break-words text-foreground leading-relaxed",
            pending && content.length === 0 && "text-muted-foreground italic"
          )}
        >
          {content ? (
            <MarkdownLite text={content} />
          ) : pending ? (
            "Pensando…"
          ) : (
            ""
          )}
        </div>
      </div>
    </div>
  )
}
