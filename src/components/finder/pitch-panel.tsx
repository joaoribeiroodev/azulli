"use client"

import { useMemo, type ReactNode } from "react"

import { parsePitchStored } from "@/lib/finder/pitch"
import type { PitchCanal, PitchStored } from "@/lib/finder/types"
import { cn } from "@/lib/utils"

function PitchSection({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null
  return (
    <div className="mt-3 first:mt-0">
      <div className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground mb-1">
        {label}
      </div>
      <div className="whitespace-pre-wrap text-sm text-foreground">{value}</div>
    </div>
  )
}

function PitchList({
  label,
  items,
}: {
  label: string
  items?: Array<string | { objecao?: string; resposta?: string }> | null
}) {
  if (!items?.length) return null

  const lis = items
    .map((item, i) => {
      if (typeof item === "string") {
        return <li key={i}>{item}</li>
      }
      if (item?.objecao) {
        return (
          <li key={i}>
            <strong>{item.objecao}</strong>
            <br />
            <span className="text-muted-foreground">{item.resposta || ""}</span>
          </li>
        )
      }
      return null
    })
    .filter(Boolean)

  if (!lis.length) return null

  return (
    <div className="mt-4">
      <div className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground mb-1">
        {label}
      </div>
      <ul className="list-disc pl-4 text-sm space-y-2">{lis}</ul>
    </div>
  )
}

function PitchMessage({ children, compact }: { children: ReactNode; compact?: boolean }) {
  return (
    <div
      className={cn(
        "whitespace-pre-wrap leading-relaxed rounded-xl bg-muted border text-sm text-foreground",
        compact ? "p-3" : "p-4"
      )}
    >
      {children}
    </div>
  )
}

function PitchStructureDetails({
  title,
  open,
  children,
}: {
  title: string
  open?: boolean
  children: ReactNode
}) {
  return (
    <details
      className="mt-4 rounded-xl border bg-card overflow-hidden"
      open={open}
    >
      <summary className="cursor-pointer px-4 py-3 text-sm font-semibold list-none [&::-webkit-details-marker]:hidden">
        {title}
      </summary>
      <div className="px-4 pb-4">{children}</div>
    </details>
  )
}

function renderWhatsAppContent(parsed: PitchStored) {
  const estrutura = parsed.estrutura as Record<string, string | undefined> | undefined

  return (
    <>
      <div className="mb-4 rounded-xl border border-brand/25 bg-brand/5 p-3">
        <div className="text-xs font-bold text-brand mb-1">
          Conformidade Meta / WhatsApp Business
        </div>
        <p className="text-xs text-muted-foreground m-0 leading-relaxed">
          1º contato sem pitch comercial. Envie a proposta completa só após resposta positiva do
          lead.
        </p>
      </div>

      <div>
        <div className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground mb-2">
          1º contato (antes do opt-in)
        </div>
        <PitchMessage>{parsed.mensagem || ""}</PitchMessage>
      </div>

      {parsed.mensagem_pos_optin ? (
        <div className="mt-4">
          <div className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground mb-2">
            Após resposta positiva (opt-in)
          </div>
          <PitchMessage>{parsed.mensagem_pos_optin}</PitchMessage>
        </div>
      ) : null}

      {estrutura ? (
        <PitchStructureDetails title="Estrutura da abordagem" open>
          <PitchSection label="Gancho personalizado" value={estrutura.gancho} />
          <PitchSection
            label="Contexto do contato"
            value={estrutura.contexto || estrutura.dor}
          />
          <PitchSection
            label="Pedido de permissão"
            value={estrutura.permissao || estrutura.beneficio}
          />
          <PitchSection label="Opt-out" value={estrutura.opt_out || estrutura.cta} />
        </PitchStructureDetails>
      ) : null}

      {parsed.personalizacao_usada?.length ? (
        <div className="mt-4">
          <div className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground mb-1">
            Personalização usada (dados captados)
          </div>
          <ul className="list-disc pl-4 text-sm space-y-1">
            {parsed.personalizacao_usada.map((g, i) => (
              <li key={i}>{g}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {parsed.follow_up ? (
        <div className="mt-4">
          <div className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground mb-2">
            Follow-up leve (máx. 1x, sem pitch repetido)
          </div>
          <PitchMessage compact>{parsed.follow_up}</PitchMessage>
        </div>
      ) : null}

      {parsed.conformidade_meta?.observacao ? (
        <div className="mt-4">
          <div className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground mb-1">
            Observação Meta
          </div>
          <div className="text-sm whitespace-pre-wrap">{parsed.conformidade_meta.observacao}</div>
        </div>
      ) : null}

      <PitchList label="Objeções e respostas" items={parsed.objecoes} />
      <PitchList label="Dicas para o vendedor" items={parsed.dicas_vendedor} />
    </>
  )
}

function renderEmailContent(parsed: PitchStored) {
  const estrutura = parsed.estrutura as Record<string, unknown> | undefined

  return (
    <>
      <div>
        <div className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground mb-2">
          Assunto
        </div>
        <PitchMessage compact>{parsed.assunto || "—"}</PitchMessage>
        {parsed.assunto_alternativo ? (
          <div className="text-xs text-muted-foreground mt-1">
            Alternativo: {parsed.assunto_alternativo}
          </div>
        ) : null}
      </div>

      <div className="mt-4">
        <div className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground mb-2">
          E-mail pronto para enviar
        </div>
        <PitchMessage>{parsed.corpo || ""}</PitchMessage>
      </div>

      {estrutura ? (
        <PitchStructureDetails title="Estrutura da mensagem">
          <PitchSection label="Abertura" value={estrutura.abertura as string} />
          <PitchSection label="Contexto" value={estrutura.contexto as string} />
          <PitchSection label="Problema" value={estrutura.problema as string} />
          <PitchSection label="Solução" value={estrutura.solucao as string} />
          <PitchList label="Benefícios" items={estrutura.beneficios as string[]} />
          <PitchSection label="CTA" value={estrutura.cta as string} />
        </PitchStructureDetails>
      ) : null}

      {parsed.personalizacao_usada?.length ? (
        <div className="mt-4">
          <div className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground mb-1">
            Personalização usada
          </div>
          <ul className="list-disc pl-4 text-sm space-y-1">
            {parsed.personalizacao_usada.map((g, i) => (
              <li key={i}>{g}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </>
  )
}

type PitchPanelProps = {
  canal: PitchCanal
  stored: string | null | undefined
}

export function PitchPanel({ canal, stored }: PitchPanelProps) {
  const content = useMemo(() => {
    const parsed = parsePitchStored(stored)
    if (!parsed) {
      return (
        <div className="rounded-xl border border-dashed bg-muted/50 p-4 text-center text-sm text-muted-foreground">
          Ainda não gerado. Clique em &quot;Regerar&quot; para criar materiais personalizados.
        </div>
      )
    }

    if (parsed.legacy) {
      return <PitchMessage>{parsed.mensagem || parsed.corpo || ""}</PitchMessage>
    }

    return canal === "email" ? renderEmailContent(parsed) : renderWhatsAppContent(parsed)
  }, [canal, stored])

  return <div className="text-sm">{content}</div>
}

export function hasPosOptinMessage(stored: string | null | undefined): boolean {
  const parsed = parsePitchStored(stored)
  return Boolean(parsed?.mensagem_pos_optin)
}
