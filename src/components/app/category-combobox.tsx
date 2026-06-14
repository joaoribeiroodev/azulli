"use client"

import { useState, useMemo, useRef, useEffect } from "react"
import { Check, ChevronsUpDown, Plus, X } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

import { CATEGORY_SUGGESTIONS } from "@/lib/financial/schemas"

type Props = {
  value: string | null
  onChange: (value: string | null) => void
  type: "income" | "expense"
  /** Categorias já usadas pelo tenant (vindas do servidor) */
  recentCategories?: string[]
  placeholder?: string
}

/**
 * Combobox de categoria — permite escolher uma sugestão, uma já usada antes
 * pelo tenant, ou digitar uma nova categoria. Vazio = "Sem categoria".
 */
export function CategoryCombobox({
  value,
  onChange,
  type,
  recentCategories = [],
  placeholder = "Selecionar ou digitar categoria...",
}: Props) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)

  const suggestions = useMemo(() => {
    const base = [...CATEGORY_SUGGESTIONS[type]]
    const used = recentCategories.filter((c) => !base.includes(c as never))
    return { base, used }
  }, [type, recentCategories])

  // Mostra opção de "criar" quando o usuário digitou algo que não casa com nenhuma sugestão
  const showCreateOption = useMemo(() => {
    const q = search.trim()
    if (!q) return false
    const all = [...suggestions.base, ...suggestions.used]
    return !all.some((c) => c.toLowerCase() === q.toLowerCase())
  }, [search, suggestions])

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50)
  }, [open])

  function select(category: string | null) {
    onChange(category)
    setOpen(false)
    setSearch("")
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal"
        >
          <span className={cn(!value && "text-muted-foreground")}>
            {value || placeholder}
          </span>
          <div className="flex items-center gap-1">
            {value && (
              <span
                role="button"
                tabIndex={0}
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  select(null)
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault()
                    e.stopPropagation()
                    select(null)
                  }
                }}
                className="rounded-sm hover:bg-muted p-0.5 cursor-pointer"
                aria-label="Limpar categoria"
              >
                <X className="h-3.5 w-3.5 text-muted-foreground" />
              </span>
            )}
            <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
          </div>
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
        <Command shouldFilter={true}>
          <CommandInput
            ref={inputRef}
            placeholder="Buscar ou criar..."
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            <CommandEmpty>
              {showCreateOption ? null : (
                <span className="text-sm text-muted-foreground">
                  Nenhuma categoria.
                </span>
              )}
            </CommandEmpty>

            {showCreateOption && (
              <CommandGroup>
                <CommandItem
                  value={`__create__${search}`}
                  onSelect={() => select(search.trim())}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  <span>
                    Criar &quot;<strong>{search.trim()}</strong>&quot;
                  </span>
                </CommandItem>
              </CommandGroup>
            )}

            {suggestions.used.length > 0 && (
              <>
                {showCreateOption && <CommandSeparator />}
                <CommandGroup heading="Já usadas por você">
                  {suggestions.used.map((c) => (
                    <CommandItem
                      key={c}
                      value={c}
                      onSelect={() => select(c)}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          value === c ? "opacity-100" : "opacity-0"
                        )}
                      />
                      {c}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </>
            )}

            {suggestions.base.length > 0 && (
              <>
                {(showCreateOption || suggestions.used.length > 0) && (
                  <CommandSeparator />
                )}
                <CommandGroup heading="Sugestões">
                  {suggestions.base.map((c) => (
                    <CommandItem
                      key={c}
                      value={c}
                      onSelect={() => select(c)}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          value === c ? "opacity-100" : "opacity-0"
                        )}
                      />
                      {c}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
