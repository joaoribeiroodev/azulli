"use client"

import { useState, useRef, useTransition } from "react"
import { Loader2, Camera, Trash2, User } from "lucide-react"
import { toast } from "sonner"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
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
import { updateAvatarAction } from "@/lib/settings/actions"

type Props = {
  userId: string
  userName: string
  currentAvatarUrl: string | null
}

const MAX_SIZE_BYTES = 2 * 1024 * 1024
const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"]

export function AvatarUpload({
  userId,
  userName,
  currentAvatarUrl,
}: Props) {
  const [avatarUrl, setAvatarUrl] = useState(currentAvatarUrl)
  const [isUploading, setIsUploading] = useState(false)
  const [isRemoving, startRemove] = useTransition()
  const [confirmRemove, setConfirmRemove] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const initials = getInitials(userName)

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
      const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg"
      const path = `${userId}/avatar-${Date.now()}.${ext}`

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, file, {
          upsert: false,
          contentType: file.type,
        })

      if (uploadError) {
        console.error("[avatar] upload failed:", uploadError)
        toast.error("Erro ao enviar a foto. Tente novamente.")
        return
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from("avatars").getPublicUrl(path)

      const result = await updateAvatarAction(publicUrl)
      if (!result.success) {
        toast.error(result.error)
        return
      }

      if (avatarUrl) {
        const oldPath = extractStoragePath(avatarUrl)
        if (oldPath && oldPath !== path) {
          supabase.storage
            .from("avatars")
            .remove([oldPath])
            .then(({ error }) => {
              if (error)
                console.warn("[avatar] cleanup old failed:", error.message)
            })
        }
      }

      setAvatarUrl(publicUrl)
      toast.success("Foto atualizada! 📸")
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  function handleRemove() {
    setConfirmRemove(false)
    startRemove(async () => {
      const supabase = createClient()
      const result = await updateAvatarAction(null)
      if (!result.success) {
        toast.error(result.error)
        return
      }
      if (avatarUrl) {
        const path = extractStoragePath(avatarUrl)
        if (path) {
          await supabase.storage.from("avatars").remove([path])
        }
      }
      setAvatarUrl(null)
      toast.success("Foto removida.")
    })
  }

  const busy = isUploading || isRemoving

  return (
    <div className="flex flex-col sm:flex-row sm:items-start gap-4 sm:gap-6">
      {/* Avatar — centralizado no mobile, à esquerda no desktop */}
      <div className="relative self-center sm:self-auto shrink-0">
        <Avatar className="h-24 w-24 sm:h-20 sm:w-20 border-2 border-border">
          {avatarUrl ? (
            <AvatarImage
              src={avatarUrl}
              alt={userName}
              className="object-cover"
            />
          ) : null}
          <AvatarFallback className="bg-brand-soft text-brand text-2xl sm:text-xl font-semibold">
            {initials || <User className="h-8 w-8" />}
          </AvatarFallback>
        </Avatar>
        {isUploading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full">
            <Loader2 className="h-6 w-6 text-white animate-spin" />
          </div>
        )}
      </div>

      {/* Info + botões */}
      <div className="flex-1 space-y-3 text-center sm:text-left">
        <div>
          <p className="text-sm font-medium">Foto de perfil</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            JPG, PNG ou WEBP até 2MB. Quadrada fica melhor.
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
            <Camera className="h-3.5 w-3.5" />
            {avatarUrl ? "Trocar foto" : "Enviar foto"}
          </Button>

          {avatarUrl && (
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
            <AlertDialogTitle>Remover foto de perfil?</AlertDialogTitle>
            <AlertDialogDescription>
              Sua foto atual será apagada. Você pode enviar outra a qualquer
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

function getInitials(name: string): string {
  if (!name) return ""
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function extractStoragePath(publicUrl: string): string | null {
  const match = publicUrl.match(/\/storage\/v1\/object\/public\/avatars\/(.+)$/)
  return match?.[1] ?? null
}
