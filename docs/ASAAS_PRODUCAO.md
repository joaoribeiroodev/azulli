# Tutorial: conta Asaas de produção (Azulli)

Guia para abrir a conta real no Asaas, ativar, integrar com o Azulli em `use.azulli.app.br` e receber assinaturas (Pro R$ 29,99 · Empresarial R$ 47,99).

> Já testou no sandbox? Ver `docs/ASAAS_SANDBOX.md`. Sandbox e produção **não compartilham** login, clientes nem assinaturas.

---

## Antes de começar

| Item | Detalhe |
|------|---------|
| Site | [https://www.asaas.com](https://www.asaas.com) — **não** `sandbox.asaas.com` |
| Conta | Nova cadastro (mesmo e-mail do sandbox é permitido) |
| Telefone | Número brasileiro com SMS (obrigatório na ativação) |
| Empresa | CNPJ (recomendado para SaaS) ou CPF — dados batem com documentos |
| Conta bancária | Para receber e sacar (titular compatível com o cadastro) |
| Documentos | RG/CNH, selfie do titular; contrato social se LTDA |
| Deploy | Webhook de produção exige URL pública — configure após Vercel + DNS |

---

## Passo 1 — Criar a conta

1. Acesse [asaas.com](https://www.asaas.com) → **Criar conta grátis**.
2. Informe o **e-mail** da empresa (ex.: `oi@azulli.app.br`).
3. Defina senha forte: mínimo 8 caracteres, letra + número.
4. Aceite os termos → **Criar conta**.
5. Faça login no painel de **produção**.

Referência oficial: [Como criar minha conta no Asaas?](https://central.ajuda.asaas.com/hc/pt-br/articles/31406336360987-Como-criar-minha-conta-no-Asaas)

---

## Passo 2 — Ativação por SMS

1. Após o login, aparece uma faixa pedindo o telefone (ou vá em **Menu → Minha conta**).
2. Cadastre número **brasileiro** (não aceita número internacional).
3. Clique **Ativar** → receba o código por SMS.
4. Digite o código e confirme.

Referência: [Como fazer a ativação da minha conta?](https://central.ajuda.asaas.com/hc/pt-br/articles/32093677981211-Como-fazer-a-ativa%C3%A7%C3%A3o-da-minha-conta)

---

## Passo 3 — Situação cadastral (dados comerciais)

1. **Menu do usuário → Minha conta → Situação cadastral**.
2. Preencha tudo que o formulário pedir:

### Dados comerciais (exemplos)

| Campo | Sugestão Azulli |
|-------|----------------|
| Tipo | PJ (CNPJ) — ideal para SaaS |
| Razão social / nome | Nome legal da empresa |
| CNPJ | CNPJ da empresa que opera o Azulli |
| Atividade | Software / serviços de tecnologia |
| Site | `https://azulli.app.br` ou `https://use.azulli.app.br` |
| E-mail comercial | E-mail de suporte/cobrança |
| Telefone | Mesmo usado na ativação SMS |

### Dados bancários

- Conta de **mesma titularidade** (ou compatível com o que o Asaas exige para PJ).
- Agência, conta, tipo — conferir duas vezes antes de enviar.

### Documentos

Envie **legíveis, coloridos, sem cortes**, frente e verso quando aplicável:

| Tipo de conta | Documentos típicos |
|---------------|-------------------|
| CPF / MEI | Documento de identidade + selfie do titular |
| LTDA | Contrato social + documento do sócio administrador + selfie |
| Outros PJ | O painel lista o que falta em Situação cadastral |

O onboarding pode incluir **link externo** para selfie/reconhecimento facial — complete no celular se pedido.

### Prazo de análise

- **2 a 7 dias úteis** (Asaas informa no painel e por e-mail).
- Enquanto analisa: em muitos casos você **já pode gerar cobranças e receber**.
- **Saque / movimentação plena do saldo** geralmente só após aprovação final.

---

## Passo 4 — Habilitar formas de pagamento

Quando a conta permitir (ou após aprovação parcial):

1. **Menu → Configurações** ou área de **Cobranças / Formas de pagamento**.
2. Habilite o que o Azulli oferece na página de billing:

| Forma | Uso no Azulli |
|-------|----------------|
| **PIX** | Pagamento instantâneo na assinatura |
| **Boleto** | Vencimento em alguns dias |
| **Cartão de crédito** | Cobrança recorrente na assinatura |

Sem isso, a API pode criar assinatura mas o cliente não consegue pagar.

---

## Passo 5 — Gerar API Key de produção

1. **Menu → Integrações** (ou Minha conta → Integrações).
2. **Gerar nova chave de API**.
3. Copie a chave completa — formato `$aact_prod_...` ou `aact_prod_...`.
4. Guarde em gerenciador de senhas. **Não** commite no Git.

A chave de produção só funciona com:

```text
ASAAS_BASE_URL=https://api.asaas.com/v3
```

Chave sandbox (`aact_hmlg_`) nesta URL → erro **401**.

---

## Passo 6 — Token do webhook

Gere um segredo forte (mesmo valor no Asaas e no Azulli):

```bash
npm run generate:secret
```

PowerShell (alternativa):

```powershell
-join ((1..32) | ForEach-Object { '{0:x2}' -f (Get-Random -Maximum 256) })
```

⚠️ Use `Get-Random` (com hífen), não `GetRandom`.

Anote em lugar seguro — você usará na Vercel e no painel Asaas.

---

## Passo 7 — Deploy Vercel (antes do webhook)

O webhook precisa de URL pública. Ordem recomendada:

1. Deploy do Azulli na Vercel com domínio `use.azulli.app.br`.
2. DNS apontando para Vercel (`CNAME` → `cname.vercel-dns.com`).
3. Variáveis na Vercel (Production):

```env
ASAAS_API_KEY=aact_prod_xxxxxxxx
ASAAS_BASE_URL=https://api.asaas.com/v3
ASAAS_WEBHOOK_TOKEN=<token gerado no passo 6>
SUPABASE_SERVICE_ROLE_KEY=<service role do Supabase>
NEXT_PUBLIC_APP_URL=https://use.azulli.app.br
```

4. Redeploy após salvar as vars.

### Manter sandbox no local

No `.env.local` continue com sandbox para desenvolvimento:

```env
ASAAS_API_KEY=aact_hmlg_...
ASAAS_BASE_URL=https://api-sandbox.asaas.com/v3
```

Produção **só na Vercel** — não precisa trocar o `.env.local` se não quiser testar prod localmente.

---

## Passo 8 — Configurar webhook no Asaas (produção)

1. Painel [asaas.com](https://www.asaas.com) → **Integrações → Webhooks** (ou equivalente).
2. **Adicionar webhook**:

| Campo | Valor |
|--------|--------|
| **URL** | `https://use.azulli.app.br/api/webhooks/asaas` |
| **Token de autenticação** | Igual `ASAAS_WEBHOOK_TOKEN` na Vercel |
| **Método** | POST |

3. Marque os **eventos** que o Azulli processa:

| Evento | Efeito no Azulli |
|--------|------------------|
| `PAYMENT_CONFIRMED` | Ativa plano, atualiza `tier` |
| `PAYMENT_RECEIVED` | Idem (PIX/boleto recebido) |
| `PAYMENT_OVERDUE` | Assinatura `past_due` |
| `PAYMENT_REFUNDED` | Cancela e reverte tier |
| `SUBSCRIPTION_DELETED` | Marca assinatura cancelada |

4. Salve e use **“Testar webhook”** no painel (se disponível) — deve retornar 200 (com token correto).

O endpoint valida o header `asaas-access-token` contra `ASAAS_WEBHOOK_TOKEN`.

---

## Passo 9 — Validar integração

### API (opcional no local com chave prod)

Com chave de produção no `.env.local` temporariamente:

```bash
npm run test:asaas
```

Esperado: `Ambiente: PRODUÇÃO` e `✅ Asaas API OK`.

### Fluxo completo em produção

1. Criar usuário de teste no Azulli (ou usar sua conta).
2. **Configurações → Empresa** — CNPJ/CPF obrigatório (sem isso → erro `cnpj_required`).
3. **Billing** → assinar Pro ou Empresarial.
4. Pagar (PIX real, boleto ou cartão).
5. Webhook dispara → tier muda no dashboard.
6. Conferir no Asaas: cliente + assinatura + pagamento.

---

## Checklist final

| ⬜ | Etapa |
|----|--------|
| ⬜ | Conta criada em asaas.com |
| ⬜ | SMS ativado |
| ⬜ | Situação cadastral enviada (docs + banco) |
| ⬜ | Aprovação cadastral (ou cobrança já liberada) |
| ⬜ | PIX, boleto e cartão habilitados |
| ⬜ | API Key produção gerada |
| ⬜ | `ASAAS_*` na Vercel |
| ⬜ | `use.azulli.app.br` no ar |
| ⬜ | Webhook com URL + token + eventos |
| ⬜ | `SUPABASE_SERVICE_ROLE_KEY` na Vercel |
| ⬜ | Teste de assinatura real OK |

---

## Problemas comuns

| Problema | Causa provável | Solução |
|----------|----------------|---------|
| HTTP 401 na API | Chave sandbox em URL produção (ou vice-versa) | Alinhar `ASAAS_API_KEY` + `ASAAS_BASE_URL` |
| Webhook 401 | Token diferente entre Asaas e Vercel | Mesmo `ASAAS_WEBHOOK_TOKEN` em ambos |
| Plano não muda no app | Webhook não chegou ou falhou | Logs Vercel → função `/api/webhooks/asaas` |
| Erro ao assinar | Sem CNPJ/CPF na empresa | Configurações → Empresa |
| PIX desabilitado | Cadastro incompleto / em análise | Situação cadastral → pendências |
| Saldo não saca | Análise cadastral pendente | Aguardar aprovação (2–7 dias úteis) |

---

## Sandbox vs produção

| | Sandbox | Produção |
|---|---------|----------|
| Cadastro | sandbox.asaas.com | asaas.com |
| API | `https://api-sandbox.asaas.com/v3` | `https://api.asaas.com/v3` |
| Chave | `aact_hmlg_...` | `aact_prod_...` |
| Pagamentos | Fictícios | **Reais** |
| Webhook | ngrok / teste | `https://use.azulli.app.br/api/webhooks/asaas` |
| Uso no Azulli | `.env.local` | Vercel Production |

---

## Links úteis

- [Criar conta Asaas](https://central.ajuda.asaas.com/hc/pt-br/articles/31406336360987-Como-criar-minha-conta-no-Asaas)
- [Ativação SMS](https://central.ajuda.asaas.com/hc/pt-br/articles/32093677981211-Como-fazer-a-ativa%C3%A7%C3%A3o-da-minha-conta)
- [Documentação API — Autenticação](https://docs.asaas.com/docs/authentication-2)
- [Sandbox (testes locais)](./ASAAS_SANDBOX.md)
