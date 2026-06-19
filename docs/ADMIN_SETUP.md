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

Aplicar `supabase/migrations/00025_growth_platform.sql` (tabelas `platform_admins`, `system_announcements`, `announcement_reads`).

## Funcionalidades

- **Painel** (`/admin`): empresas, usuários, MAU/DAU, assinaturas, MRR, receita, cadastros recentes
- **Trials expirando**: lista com botões WhatsApp e e-mail (próximos 3 dias)
- **Export CSV**: `/api/admin/tenants/export` ou botão no painel
- **Avisos** (`/admin/announcements`): publicar avisos → sininho no app
