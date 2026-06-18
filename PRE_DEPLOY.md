# Plano pré-deploy Azulli — checklist (custo R$ 0)

> **Critério “0 custo”:** sem novas assinaturas ou APIs pagas. Só código no stack atual (Next.js, Supabase, Gemini free tier, Resend free tier, Asaas já configurado) e infra nos **free tiers** (Vercel + Supabase).

---

## Legenda

| Símbolo | Meaning |
|---------|---------|
| ⬜ | Pendente |
| ✅ | Feito |
| 🔧 | Código (dev) |
| 🌐 | Operacional (config, sem ferramenta nova) |

---

## Parte 1 — O que falta (checklist)

### 1.1 Bloqueia confiança no produto 🔧

| Status | Item | Esforço | Notas |
|--------|------|---------|-------|
| ✅ | Enforcement limites do plano Pro | M | `plan-limits.ts` em customers, suppliers, products, employees |
| ✅ | Banner “trial acabando” no dashboard | S | `TrialEndingBanner` |
| ✅ | Cron `trial_ending` (e-mail) | S | `/api/cron/trial-ending` + `vercel.json` |
| ✅ | Cron `overdue_alert` (e-mail) | M | `/api/cron/overdue-alerts` + preferência ativa na UI |
| ✅ | `opengraph-image` (share WhatsApp/Instagram) | S | `src/app/opengraph-image.tsx` |
| ✅ | Aviso + fluxo cancelar assinatura antes de excluir conta | S | `privacy-data-card.tsx` bloqueia delete se assinatura ativa |

### 1.2 Polish rápido (qualidade percebida) 🔧

| Status | Item | Esforço |
|--------|------|---------|
| ✅ | Menu mobile na landing (nav de seções) | S | `LandingMobileMenu` + Sheet |
| ✅ | Fix Recharts `width(-1)` no dashboard | S | `ChartPanel` em weekly + forecast |
| ✅ | `data-scroll-behavior="smooth"` no `<html>` | XS | `layout.tsx` |
| ✅ | Smoke manual documentado (signup → lançamento → billing sandbox) | S | `SMOKE_TEST.md` |

### 1.3 Deploy operacional 🌐 (sem ferramenta nova)

| Status | Item |
|--------|------|
| ⬜ | Vercel: repo + env vars de produção |
| ⬜ | Domínios `useazulli.app.br` (app) + `azulli.app.br` (marketing) → CNAME Vercel |
| ⬜ | Supabase: Site URL + Redirect URLs de auth |
| ✅ | Migrations `00021` + `00022` aplicadas em prod |
| ⬜ | Asaas: webhook produção + token |
| ⬜ | Resend: SPF/DKIM no domínio (só DNS) |
| ⬜ | `CRON_SECRET` na Vercel (crons já em `vercel.json`) |
| ⬜ | Teste: cadastro → onboarding → lançamento → assinar sandbox → webhook |

### 1.4 Opcional (free tier, não obrigatório)

| Status | Item | Custo |
|--------|------|-------|
| ⬜ | Sentry free tier | R$ 0 até limite |
| ⬜ | Vercel Analytics | Incluído no plano |

### 1.5 Fora deste plano (custo ou escopo)

- Notas fiscais (removidas do MVP)
- OAuth Google (código $0, mas esforço M e não bloqueia deploy)
- Multi-usuário / convites (esforço L)
- Sentry / analytics pagos, Open Banking, WhatsApp Business API

---

## Parte 2 — Diferenciais úteis (só R$ 0)

Prioridade = impacto para MEI/pequena empresa **sem API nova**.

### Tier A — Implementar antes do deploy (alto impacto, esforço baixo)

| # | Feature | Por que destaca | Esforço | Status |
|---|---------|-----------------|---------|--------|
| A1 | **Runway em dias** | Linguagem de dono | S | ✅ `RunwayCard` |
| A2 | **Alerta in-app de caixa negativo** (forecast) | Engine existente | S | ✅ `ForecastAlerts` + runway |
| A3 | **Banner trial + CTA na dashboard** | Conversão | S | ✅ `TrialEndingBanner` |
| A4 | **WhatsApp cobrança com mensagem pronta** | `wa.me` por cliente | S | ✅ `CustomerCollectionAction` |
| A5 | **Pacote “exportar para contador”** | Excel + JSON | M | ✅ `/api/export/accountant` |
| A6 | **Limites de plano enforced** | Pro sério | M | ✅ `plan-limits.ts` |

### Tier B — Logo após deploy (diferencial forte, só código)

| # | Feature | Status |
|---|---------|--------|
| B1 | Recorrentes + “possível corte” (>90 dias) | ✅ |
| B2 | Assistente com ações | ⬜ |
| B3 | Relatório mensal 1 página | ⬜ |
| B4 | Conciliação OFX visual | ⬜ |
| B5 | Simulador com cenário salvo | ⬜ |
| B6 | Checklist fiscal MEI | ⬜ |
| B7 | Metas com barra + microcelebração | ✅ (barra + badge “Atingida!”) |

### Tier C — Diferencial IA (Gemini free tier)

| # | Feature | Status |
|---|---------|--------|
| C1 | “Aprenda minha categoria” | ⬜ |
| C2 | Insight em linguagem humana | ✅ `HumanInsightCard` |
| C3 | Perguntas sugeridas no assistente | ✅ mais sugestões em `chat-shell` |
| C4 | Alerta de anomalia | ⬜ |

---

## Parte 3 — Ordem de execução sugerida

### Sprint “go-live” (1 semana)

1. 🌐 Deploy + migrations + DNS Resend + webhook Asaas  
2. ✅ Limites de plano (A6)  
3. ✅ Runway (A1) + alerta caixa in-app (A2)  
4. ✅ Banner trial (A3) + OG image  
5. ✅ Cron `trial_ending` (Resend free)  
6. 🌐 Smoke test manual (`SMOKE_TEST.md`)  

### Sprint “diferencial” (semana 2)

7. ✅ A4 WhatsApp cobrança por cliente  
8. ✅ A5 Export contador  
9. ✅ B1 Recorrentes / corte de custo  
10. ✅ C2 Insights em linguagem humana  
11. ✅ B7 Metas com progresso visual  

---

## Parte 4 — Definição de pronto para deploy

- [ ] Fluxo crítico testado em produção (sandbox Asaas)
- [x] Migrations 00021 + 00022 em prod
- [x] Limites Pro funcionando
- [x] Trial visível no app (banner ou e-mail)
- [x] Landing + LGPD + cookie banner OK
- [x] OG image para compartilhar
- [x] Crons autenticados com `CRON_SECRET` (código pronto; falta env em prod)
- [ ] Sem 500 nas rotas principais (`/`, `/login`, `/dashboard`, `/configuracoes`)

---

## Referência rápida — stack 0 custo já em uso

| Serviço | Uso | Tier free |
|---------|-----|-----------|
| Vercel | Hosting + crons | Hobby |
| Supabase | DB + Auth + RLS | Free |
| Google Gemini | OFX + assistente | Free tier diário |
| Resend | E-mails transacionais | ~3k/mês |
| Asaas | Cobrança | Taxa por transação (sem mensalidade extra) |

*Última atualização: junho 2026*
