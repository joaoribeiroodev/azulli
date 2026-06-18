# Asaas Sandbox — testes locais

Use o sandbox **antes** de criar conta de produção. Quando for deploy, troca só as vars na Vercel e mantém sandbox no `.env.local`.

---

## 1. Criar conta sandbox

1. Acesse [https://sandbox.asaas.com](https://sandbox.asaas.com) (cadastro **separado** da produção — pode usar o mesmo e-mail).
2. Complete o cadastro (aprovação automática no sandbox).
3. Menu do usuário → **Integrações** → **Gerar API Key**.
4. Copie a chave (formato `aact_hmlg_...` ou `$aact_hmlg_...`).

---

## 2. `.env.local` (dev)

```env
ASAAS_API_KEY=aact_hmlg_xxxxxxxxxxxxxxxx
ASAAS_BASE_URL=https://api-sandbox.asaas.com/v3
ASAAS_WEBHOOK_TOKEN=qualquer_string_longa_32_chars_min
```

- Chave **sem** `$` no início (o código adiciona).
- URL oficial do sandbox: `https://api-sandbox.asaas.com/v3` ([docs Asaas](https://docs.asaas.com/docs/authentication-2)).
- Reinicie `npm run dev` após editar o `.env`.

Validar:

```bash
npm run test:asaas
```

Esperado: `Ambiente: sandbox` e `✅ Asaas API OK`.

---

## 3. Testar assinatura no app

1. Login no Azulli local.
2. **Configurações → Empresa** — preencha **CNPJ ou CPF** (obrigatório para o Asaas).
3. Vá em **Billing / Planos** e assine Pro ou Empresarial (PIX, boleto ou cartão).
4. No painel [sandbox.asaas.com](https://sandbox.asaas.com) você verá o cliente e a assinatura criados.

### Pagamento no sandbox

- **Cartão:** qualquer cartão fictício — o sandbox aprova.
- **PIX / boleto:** não há dinheiro real; no painel Asaas, **confirme o pagamento manualmente** na cobrança para simular recebimento.

---

## 4. Webhook local (tier muda no Azulli)

O plano só atualiza no Supabase quando o webhook `POST /api/webhooks/asaas` é chamado.

### Opção A — ngrok (recomendado)

```bash
ngrok http 3000
```

No Asaas sandbox → **Integrações → Webhooks**:

| Campo | Valor |
|--------|--------|
| URL | `https://xxxx.ngrok-free.app/api/webhooks/asaas` |
| Token | mesmo `ASAAS_WEBHOOK_TOKEN` do `.env.local` |
| Eventos | `PAYMENT_CONFIRMED`, `PAYMENT_RECEIVED`, `PAYMENT_OVERDUE`, `PAYMENT_REFUNDED`, `SUBSCRIPTION_DELETED` |

Confirme o pagamento no sandbox → o webhook dispara → tier atualiza no dashboard.

Requer `SUPABASE_SERVICE_ROLE_KEY` no `.env.local` (o webhook usa service role).

### Opção B — sem webhook

Você ainda pode testar **criação** de cliente/assinatura e links de pagamento. O tier no Azulli **não** muda até o webhook funcionar.

---

## 5. Voltar ao dev depois de testar produção

Se no futuro você colocar chave de **produção** no `.env.local` só para testar:

```env
ASAAS_API_KEY=aact_hmlg_...        # chave sandbox
ASAAS_BASE_URL=https://api-sandbox.asaas.com/v3
ASAAS_WEBHOOK_TOKEN=...
```

Reinicie o dev server e rode `npm run test:asaas` para confirmar sandbox.

**Produção fica só na Vercel** quando `use.azulli.app.br` estiver no ar — ver `docs/ASAAS_PRODUCAO.md`.

---

## Sandbox vs produção

| | Sandbox | Produção |
|---|---------|----------|
| Cadastro | sandbox.asaas.com | asaas.com |
| API | api-sandbox.asaas.com/v3 | api.asaas.com/v3 |
| Chave | `aact_hmlg_...` | `aact_prod_...` |
| Dinheiro | Fictício | Real |

Nunca misture chave sandbox com URL de produção (ou vice-versa) — erro 401.
