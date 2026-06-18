import { cn } from "@/lib/utils"

export function LegalProse({
  className,
  children,
}: {
  className?: string
  children: React.ReactNode
}) {
  return (
    <article
      className={cn(
        "space-y-6 text-sm sm:text-base text-foreground/90 leading-relaxed",
        "[&_h1]:text-2xl sm:text-3xl [&_h1]:font-display [&_h1]:font-bold [&_h1]:text-brand-ink [&_h1]:tracking-tight",
        "[&_h2]:text-lg sm:text-xl [&_h2]:font-display [&_h2]:font-semibold [&_h2]:text-brand-ink [&_h2]:mt-8 [&_h2]:mb-3",
        "[&_p]:text-muted-foreground",
        "[&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-2 [&_ul]:text-muted-foreground",
        "[&_a]:text-brand [&_a]:underline-offset-4 hover:[&_a]:underline",
        className
      )}
    >
      {children}
    </article>
  )
}
