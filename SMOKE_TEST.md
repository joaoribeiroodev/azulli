# Smoke test manual — Azulli

Checklist rápido antes e depois do deploy. Execute em **sandbox Asaas** até o go-live.

## Pré-requisitos

- `npm run dev` ou ambiente de produção
- Conta de teste (ou nova cadastro)
- `CRON_SECRET` e `RESEND_API_KEY` configurados em prod para crons/e-mails

## 1. Cadastro e onboarding

- [ ] Abrir `/register` — formulário com termos e política
- [ ] Cadastrar com e-mail novo → redireciona ao app
- [ ] Banner “complete sua empresa” aparece se CNPJ/regime vazio
- [ ] Cookie banner aceita/recusa sem erro

## 2. Lançamentos

- [ ] Criar receita e despesa no dashboard (quick actions)
- [ ] Listar em `/lancamentos` — status pendente/pago
- [ ] Marcar um lançamento como pago
- [ ] Dashboard KPIs atualizam

## 3. Billing (sandbox)

- [ ] `/billing` ou Configurações → Faturamento
- [ ] Iniciar assinatura Pro sandbox
- [ ] Webhook Asaas confirma → status `active` na UI
- [ ] Cancelar assinatura → status reflete cancelamento

## 4. LGPD

- [ ] Configurações → Baixar meus dados (JSON)
- [ ] Configurações → Empresa → Exportar para contador (Excel + JSON)
- [ ] Com assinatura ativa: exclusão de conta bloqueada com link a Faturamento
- [ ] `/termos-de-uso` e `/politica-de-privacidade` abrem

## 5. Diferenciais dashboard

- [ ] Banner trial (últimos 3 dias do trial)
- [ ] Card runway (“Aguento X dias”)
- [ ] Insight em linguagem humana (se há dados)
- [ ] Previsão de caixa sem erro Recharts no console
- [ ] Recorrentes com badge “Possível corte” (se aplicável)

## 6. Cliente + WhatsApp

- [ ] Cliente com telefone e receita vencida → botão “Cobrar no WhatsApp”
- [ ] Link abre `wa.me` com mensagem pré-preenchida

## 7. Crons (dev/prod)

```bash
# Dry run (não envia e-mail)
curl -H "Authorization: Bearer $CRON_SECRET" \
  "https://<host>/api/cron/trial-ending?dryRun=1"

curl -H "Authorization: Bearer $CRON_SECRET" \
  "https://<host>/api/cron/overdue-alerts?dryRun=1"
```

- [ ] Resposta JSON `ok: true` sem 401/500

## 8. Landing e share

- [ ] Landing: menu mobile (ícone ☰) navega às seções
- [ ] Scroll suave entre seções
- [ ] OG image: `/opengraph-image` retorna PNG 1200×630

## 9. Rotas críticas (sem 500)

- [ ] `/` `/login` `/dashboard` `/configuracoes` `/assistente`

---

*Última atualização: junho 2026*
