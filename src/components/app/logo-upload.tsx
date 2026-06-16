"use client"

import { useState, useRef, useTransition } from "react"
import { Loader2, ImagePlus, Trash2, Building2 } from "lucide-react"
import { toast } from "sonner"
import Image from "next/image"

import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { createClient } from "@/lib/supabase/client"
import { updateTenantLogoAction } from "@/lib/settings/actions"

type Props = {
  tenantId: string
  tenantName: string
  currentLogoUrl: string | null
}

const MAX_SIZE_BYTES = 2 * 1024 * 1024
const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"]

export function LogoUpload({ tenantId, tenantName, currentLogoUrl }: Props) {
  const [logoUrl, setLogoUrl] = useState(currentLogoUrl)
  const [isUploading, setIsUploading] = useState(false)
  const [isRemoving, startRemove] = useTransition()
  const [confirmRemove, setConfirmRemove] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    if (!ALLOWED_TYPES.includes(file.type)) {
      toast.error("Formato inválido. Use JPG, PNG ou WEBP.")
      return
    }
    if (file.size > MAX_SIZE_BYTES) {
      toast.error("Arquivo muito grande. Máximo 2MB.")
      return
    }

    setIsUploading(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        toast.error("Sessão expirada. Recarregue a página.")
        return
      }

      const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg"
      // O bucket avatars exige que o 1º segmento seja o auth.uid()
      const path = `${user.id}/company-logo-${tenantId}-${Date.now()}.${ext}`

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: false, contentType: file.type })

      if (uploadError) {
        console.error("[logo] upload failed:", uploadError)
        toast.error("Erro ao enviar o logotipo. Tente novamente.")
        return
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from("avatars").getPublicUrl(path)

      const result = await updateTenantLogoAction(publicUrl)
      if (!result.success) {
        toast.error(result.error)
        return
      }

      if (logoUrl) {
        const oldPath = extractStoragePath(logoUrl)
        if (oldPath && oldPath !== path) {
          supabase.storage
            .from("avatars")
            .remove([oldPath])
            .then(({ error }) => {
              if (error) console.warn("[logo] cleanup old failed:", error.message)
            })
        }
      }

      setLogoUrl(publicUrl)
      toast.success("Logotipo atualizado! 🏢")
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  function handleRemove() {
    setConfirmRemove(false)
    startRemove(async () => {
      const supabase = createClient()
      const result = await updateTenantLogoAction(null)
      if (!result.success) {
        toast.error(result.error)
        return
      }
      if (logoUrl) {
        const path = extractStoragePath(logoUrl)
        if (path) await supabase.storage.from("avatars").remove([path])
      }
      setLogoUrl(null)
      toast.success("Logotipo removido.")
    })
  }

  const busy = isUploading || isRemoving

  return (
    <div className="flex flex-col sm:flex-row sm:items-start gap-4 sm:gap-6">
      {/* Preview do logo */}
      <div className="relative self-center sm:self-auto shrink-0">
        <div className="relative h-20 w-40 rounded-lg border-2 border-border bg-muted/40 flex items-center justify-center overflow-hidden">
          {logoUrl ? (
            <Image
              src={logoUrl}
              alt={`Logo de ${tenantName}`}
              fill
              className="object-contain p-1"
            />
          ) : (
            <Building2 className="h-8 w-8 text-muted-foreground/40" />
          )}
          {isUploading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg">
              <Loader2 className="h-6 w-6 text-white animate-spin" />
            </div>
          )}
        </div>
      </div>

      {/* Info + botões */}
      <div className="flex-1 space-y-3 text-center sm:text-left">
        <div>
          <p className="text-sm font-medium">Logotipo da empresa</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            JPG, PNG ou WEBP até 2MB. Aparece em documentos e comunicações.
          </p>
        </div>

        <div className="flex gap-2 flex-wrap justify-center sm:justify-start">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={busy}
            onClick={() => fileInputRef.current?.click()}
            className="gap-1.5"
          >
            <ImagePlus className="h-3.5 w-3.5" />
            {logoUrl ? "Trocar logo" : "Enviar logo"}
          </Button>

          {logoUrl && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={busy}
              onClick={() => setConfirmRemove(true)}
              className="gap-1.5 text-destructive hover:text-destructive"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Remover
            </Button>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/webp"
          className="hidden"
          onChange={handleFileSelect}
        />
      </div>

      <AlertDialog open={confirmRemove} onOpenChange={setConfirmRemove}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover logotipo?</AlertDialogTitle>
            <AlertDialogDescription>
              O logotipo atual será apagado. Você pode enviar outro a qualquer
              momento.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemove}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function extractStoragePath(publicUrl: string): string | null {
  const match = publicUrl.match(/\/storage\/v1\/object\/public\/avatars\/(.+)$/)
  return match?.[1] ?? null
}
