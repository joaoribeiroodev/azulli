-- ============================================================================
-- AZULLI — Sub-fase 5.A: Campos extras do tenant (logo, contato, endereço, fiscal)
-- ============================================================================

alter table public.tenants
  add column if not exists logo_url             text,
  add column if not exists email                text,
  add column if not exists phone                text,
  add column if not exists inscricao_estadual   text,
  add column if not exists inscricao_municipal  text,
  add column if not exists cep                  text,
  add column if not exists logradouro           text,
  add column if not exists numero               text,
  add column if not exists complemento          text,
  add column if not exists bairro               text,
  add column if not exists cidade               text,
  add column if not exists uf                   text;

comment on column public.tenants.logo_url            is 'URL pública do logotipo no bucket avatars (pasta company-logos/).';
comment on column public.tenants.inscricao_estadual  is 'Inscrição Estadual (IE) — usado na emissão de NF-e.';
comment on column public.tenants.inscricao_municipal is 'Inscrição Municipal (IM) — usado na emissão de NFS-e.';
