import "server-only"

import { getFromEmail, getResendClient } from "@/lib/email/client"
import { renderAccountantInviteEmail } from "@/lib/email/render"
import type { AccountantInvitePayload } from "@/lib/email/types"

export async function sendAccountantInviteEmail(
  to: string,
  payload: AccountantInvitePayload
): Promise<{ ok: true } | { ok: false; error: string }> {
  const resend = getResendClient()
  if (!resend) {
    return {
      ok: false,
      error:
        "Serviço de e-mail não configurado (RESEND_API_KEY). Configure para enviar convites personalizados.",
    }
  }

  const { subject, html, text } = await renderAccountantInviteEmail(payload)

  const send = await resend.emails.send({
    from: getFromEmail(),
    to,
    subject,
    html,
    text,
  })

  if (send.error) {
    console.error("[email] accountant invite failed:", send.error)
    return {
      ok: false,
      error: "Não foi possível enviar o e-mail de convite.",
    }
  }

  return { ok: true }
}
