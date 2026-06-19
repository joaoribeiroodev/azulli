# Painel Admin + Avisos globais

Configuração do subdomínio `admin.azulli.app.br`, variáveis e primeiro acesso.

## DNS

| Tipo | Nome | Valor |
|------|------|-------|
| CNAME | `admin` | `cname.vercel-dns.com` |

Vercel → mesmo projeto → Domains → `admin.azulli.app.br`

## Variáveis (Vercel)

```
NEXT_PUBLIC_ADMIN_URL=https://admin.azulli.app.br
PLATFORM_ADMIN_EMAILS=seu@email.com
SUPABASE_SERVICE_ROLE_KEY=...   # métricas admin
```

## Supabase Auth

Redirect URLs: `https://admin.azulli.app.br/auth/callback`

## Primeiro admin

Via `PLATFORM_ADMIN_EMAILS` ou SQL:

```sql
insert into public.platform_admins (user_id)
select id from auth.users where email = 'seu@email.com';
```

## Migration

Aplicar migrations até `00026_leads.sql` (inclui `leads` para captura n8n).

## Funcionalidades

- **Painel** (`/admin`): empresas, usuários, MAU/DAU, assinaturas, MRR, receita, cadastros recentes
- **Trials expirando**: lista com botões WhatsApp e e-mail (próximos 3 dias)
- **Export Excel**: `/api/admin/tenants/export` ou botão no painel (`.xlsx` formatado)
- **Oportunidades** (`/admin/leads`): leads de campanhas (Kanban + tabela, UTMs, status)
- **Avisos** (`/admin/announcements`): publicar avisos → sininho no app

## Webhook de leads (n8n)

Variável na Vercel (e `.env.local`):

```
LEADS_WEBHOOK_API_KEY=<gere com npm run generate:secret>
```

| Campo | Valor |
|-------|-------|
| URL | `https://use.azulli.app.br/api/webhooks/leads` |
| Método | `POST` |
| Header | `x-api-key: <LEADS_WEBHOOK_API_KEY>` |
| Body (JSON) | ver exemplo abaixo |

```json
{
  "nome": "Maria Silva",
  "email": "maria@empresa.com",
  "cnpj": "12.345.678/0001-90",
  "utm_source": "instagram",
  "utm_campaign": "trial-marco"
}
```

Resposta sucesso: `200` + `{ "ok": true, "id": "uuid" }`.
