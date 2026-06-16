"use client"

import { useState, useTransition } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import { Loader2, Search } from "lucide-react"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"

import { updateTenantAction } from "@/lib/settings/actions"
import { LogoUpload } from "@/components/app/logo-upload"

const schema = z.object({
  name: z.string().trim().min(2, "Nome muito curto").max(160),
  document: z.string().trim().max(20).optional().or(z.literal("")),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email({ message: "E-mail inválido" })
    .optional()
    .or(z.literal("")),
  phone: z.string().trim().max(20).optional().or(z.literal("")),
  inscricao_estadual: z.string().trim().max(30).optional().or(z.literal("")),
  inscricao_municipal: z.string().trim().max(30).optional().or(z.literal("")),
  cep: z.string().trim().max(9).optional().or(z.literal("")),
  logradouro: z.string().trim().max(160).optional().or(z.literal("")),
  numero: z.string().trim().max(20).optional().or(z.literal("")),
  complemento: z.string().trim().max(80).optional().or(z.literal("")),
  bairro: z.string().trim().max(80).optional().or(z.literal("")),
  cidade: z.string().trim().max(80).optional().or(z.literal("")),
  uf: z.string().trim().max(2).optional().or(z.literal("")),
})

type FormInput = z.infer<typeof schema>

type Props = {
  tenant: {
    id: string
    name: string
    document: string | null
    logo_url: string | null
    email: string | null
    phone: string | null
    inscricao_estadual: string | null
    inscricao_municipal: string | null
    cep: string | null
    logradouro: string | null
    numero: string | null
    complemento: string | null
    bairro: string | null
    cidade: string | null
    uf: string | null
  }
}

export function CompanyTab({ tenant }: Props) {
  const [isPending, startTransition] = useTransition()
  const [isFetchingCep, setIsFetchingCep] = useState(false)

  const form = useForm<FormInput>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: tenant.name,
      document: tenant.document ?? "",
      email: tenant.email ?? "",
      phone: tenant.phone ?? "",
      inscricao_estadual: tenant.inscricao_estadual ?? "",
      inscricao_municipal: tenant.inscricao_municipal ?? "",
      cep: tenant.cep ?? "",
      logradouro: tenant.logradouro ?? "",
      numero: tenant.numero ?? "",
      complemento: tenant.complemento ?? "",
      bairro: tenant.bairro ?? "",
      cidade: tenant.cidade ?? "",
      uf: tenant.uf ?? "",
    },
  })

  async function fetchCep() {
    const rawCep = form.getValues("cep") ?? ""
    const cep = rawCep.replace(/\D/g, "")
    if (cep.length !== 8) {
      toast.error("Digite um CEP válido com 8 dígitos.")
      return
    }

    setIsFetchingCep(true)
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`)
      if (!res.ok) throw new Error("Falha na requisição")
      const data = await res.json()
      if (data.erro) {
        toast.error("CEP não encontrado.")
        return
      }
      form.setValue("logradouro", data.logradouro ?? "", { shouldValidate: true })
      form.setValue("bairro", data.bairro ?? "", { shouldValidate: true })
      form.setValue("cidade", data.localidade ?? "", { shouldValidate: true })
      form.setValue("uf", data.uf ?? "", { shouldValidate: true })
      toast.success("Endereço preenchido!")
    } catch {
      toast.error("Não foi possível consultar o CEP. Verifique sua conexão.")
    } finally {
      setIsFetchingCep(false)
    }
  }

  function onSubmit(values: FormInput) {
    startTransition(async () => {
      const result = await updateTenantAction(values)
      if (!result.success) {
        toast.error(result.error)
        return
      }
      toast.success("Empresa atualizada! 🏢")
    })
  }

  return (
    <div className="space-y-4">
      {/* Logotipo */}
      <Card>
        <CardHeader>
          <CardTitle>Logotipo</CardTitle>
          <CardDescription>
            Aparece nas notas fiscais e documentos gerados.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <LogoUpload
            tenantId={tenant.id}
            tenantName={tenant.name}
            currentLogoUrl={tenant.logo_url}
          />
        </CardContent>
      </Card>

      {/* Dados da empresa */}
      <Card>
        <CardHeader>
          <CardTitle>Dados da empresa</CardTitle>
          <CardDescription>
            Identificação, contato, fiscal e endereço usados nas notas fiscais.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              {/* Identificação */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem className="sm:col-span-2">
                      <FormLabel>Razão social / Nome fantasia</FormLabel>
                      <FormControl>
                        <Input placeholder="Minha Empresa LTDA" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="document"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>CNPJ / CPF</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="00.000.000/0000-00"
                          {...field}
                          value={field.value ?? ""}
                        />
                      </FormControl>
                      <FormDescription className="text-xs">
                        Necessário para emitir notas fiscais.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <Separator />

              {/* Contato */}
              <div>
                <p className="text-sm font-medium mb-3">Contato</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>E-mail da empresa</FormLabel>
                        <FormControl>
                          <Input
                            type="email"
                            placeholder="contato@empresa.com.br"
                            {...field}
                            value={field.value ?? ""}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>WhatsApp / Telefone</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="(71) 99999-9999"
                            {...field}
                            value={field.value ?? ""}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <Separator />

              {/* Fiscal */}
              <div>
                <p className="text-sm font-medium mb-3">Identificação fiscal</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="inscricao_estadual"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Inscrição Estadual (IE)</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="000.000.000.000"
                            {...field}
                            value={field.value ?? ""}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="inscricao_municipal"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Inscrição Municipal (IM)</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="0000000"
                            {...field}
                            value={field.value ?? ""}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <Separator />

              {/* Endereço */}
              <div>
                <p className="text-sm font-medium mb-3">Endereço</p>
                <div className="space-y-3">
                  {/* CEP com busca */}
                  <div className="flex gap-2 items-end">
                    <FormField
                      control={form.control}
                      name="cep"
                      render={({ field }) => (
                        <FormItem className="flex-1">
                          <FormLabel>CEP</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="00000-000"
                              maxLength={9}
                              {...field}
                              value={field.value ?? ""}
                              onChange={(e) => {
                                // Máscara CEP: 00000-000
                                const digits = e.target.value.replace(/\D/g, "").slice(0, 8)
                                const masked =
                                  digits.length > 5
                                    ? `${digits.slice(0, 5)}-${digits.slice(5)}`
                                    : digits
                                field.onChange(masked)
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={isFetchingCep}
                      onClick={fetchCep}
                      className="gap-1.5 h-10 shrink-0"
                    >
                      {isFetchingCep ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Search className="h-3.5 w-3.5" />
                      )}
                      Buscar CEP
                    </Button>
                  </div>

                  {/* Logradouro + Número */}
                  <div className="grid grid-cols-3 gap-3">
                    <FormField
                      control={form.control}
                      name="logradouro"
                      render={({ field }) => (
                        <FormItem className="col-span-2">
                          <FormLabel>Logradouro</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Rua das Flores"
                              {...field}
                              value={field.value ?? ""}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="numero"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Número</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="123"
                              {...field}
                              value={field.value ?? ""}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Complemento + Bairro */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <FormField
                      control={form.control}
                      name="complemento"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Complemento (opcional)</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Sala 201, Bloco B..."
                              {...field}
                              value={field.value ?? ""}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="bairro"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Bairro</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Centro"
                              {...field}
                              value={field.value ?? ""}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Cidade + UF */}
                  <div className="grid grid-cols-3 gap-3">
                    <FormField
                      control={form.control}
                      name="cidade"
                      render={({ field }) => (
                        <FormItem className="col-span-2">
                          <FormLabel>Cidade</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Salvador"
                              {...field}
                              value={field.value ?? ""}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="uf"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>UF</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="BA"
                              maxLength={2}
                              {...field}
                              value={field.value ?? ""}
                              onChange={(e) =>
                                field.onChange(e.target.value.toUpperCase())
                              }
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <Button
                  type="submit"
                  disabled={isPending}
                  className="bg-brand hover:bg-brand-hover"
                >
                  {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Salvar
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  )
}
