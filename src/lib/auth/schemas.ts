import { z } from "zod"

// Regex de WhatsApp BR — aceita (71) 99999-9999, +5571999999999, 71999999999 etc.
// O importante é que após sanitização tenhamos 10 ou 11 dígitos (com DDD).
const sanitizePhone = (value: string): string => value.replace(/\D/g, "")

export const registerSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Nome muito curto")
    .max(80, "Nome muito longo"),

  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("E-mail inválido"),

  password: z
    .string()
    .min(8, "A senha precisa ter pelo menos 8 caracteres")
    .regex(/[A-Z]/, "Inclua ao menos uma letra maiúscula")
    .regex(/[a-z]/, "Inclua ao menos uma letra minúscula")
    .regex(/\d/, "Inclua ao menos um número"),

  phone: z
    .string()
    .trim()
    .transform(sanitizePhone)
    .refine(
      (v) => v.length === 10 || v.length === 11,
      "WhatsApp inválido. Use DDD + número"
    ),
})

export type RegisterInput = z.infer<typeof registerSchema>

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("E-mail inválido"),
  password: z.string().min(1, "Informe sua senha"),
})

export type LoginInput = z.infer<typeof loginSchema>