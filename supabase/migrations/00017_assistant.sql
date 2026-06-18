-- ============================================================================
-- AZULLI — Sub-fase 8A: Assistente IA Conversacional
-- ----------------------------------------------------------------------------
-- Persiste conversas e mensagens do assistente IA. Multi-tenant via RLS.
-- Mensagens têm `tool_calls` em jsonb pra registrar function calling do
-- Gemini (debug, audit, replay).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1) Enum de role da mensagem
-- ----------------------------------------------------------------------------
create type public.message_role as enum (
  'user',       -- usuário
  'assistant',  -- resposta da IA (texto final pro usuário)
  'tool'        -- output de uma função executada localmente
);

-- ----------------------------------------------------------------------------
-- 2) Tabela conversations — uma sessão de chat
-- ----------------------------------------------------------------------------
create table public.conversations (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references public.tenants(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  title       text,                                    -- gerado a partir da 1ª pergunta
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger trg_conversations_updated_at
  before update on public.conversations
  for each row execute function public.set_updated_at();

create index idx_conversations_tenant_user_updated
  on public.conversations(tenant_id, user_id, updated_at desc);

-- ----------------------------------------------------------------------------
-- 3) Tabela messages — turn por turn da conversa
-- ----------------------------------------------------------------------------
create table public.messages (
  id               uuid primary key default gen_random_uuid(),
  conversation_id  uuid not null references public.conversations(id) on delete cascade,
  tenant_id        uuid not null references public.tenants(id) on delete cascade,
  role             public.message_role not null,
  /**
   * content: texto da mensagem.
   *  - role='user'      → o que o usuário digitou
   *  - role='assistant' → o que a IA respondeu (após eventuais tool_calls)
   *  - role='tool'      → resultado JSON de UMA execução de função
   */
  content          text not null,
  /**
   * tool_calls: estrutura adicional pra mensagens de assistant que
   * dispararam function calling do Gemini. Formato:
   *   [{ name: "get_financial_summary", args: {...}, result: {...} }, ...]
   * Útil pra debug e pra reidratar contexto na próxima request.
   */
  tool_calls       jsonb,
  created_at       timestamptz not null default now()
);

create index idx_messages_conversation_created
  on public.messages(conversation_id, created_at);

create index idx_messages_tenant_created
  on public.messages(tenant_id, created_at desc);

-- ----------------------------------------------------------------------------
-- 4) RLS — conversations
-- ----------------------------------------------------------------------------
alter table public.conversations enable row level security;
alter table public.conversations force row level security;

-- Usuário só vê conversas do próprio user_id (não compartilha entre membros
-- do mesmo tenant — assistente é pessoal).
create policy "conversations_select_own_user"
  on public.conversations
  for select
  to authenticated
  using (
    user_id = auth.uid()
    and tenant_id in (select public.current_user_tenant_ids())
  );

create policy "conversations_insert_own_user"
  on public.conversations
  for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and public.user_belongs_to_tenant(tenant_id)
  );

create policy "conversations_update_own_user"
  on public.conversations
  for update
  to authenticated
  using ( user_id = auth.uid() )
  with check ( user_id = auth.uid() );

create policy "conversations_delete_own_user"
  on public.conversations
  for delete
  to authenticated
  using ( user_id = auth.uid() );

-- ----------------------------------------------------------------------------
-- 5) RLS — messages
-- ----------------------------------------------------------------------------
alter table public.messages enable row level security;
alter table public.messages force row level security;

-- SELECT/INSERT/DELETE só nas mensagens das próprias conversas do usuário.
-- (UPDATE não permitido — mensagens são imutáveis.)
create policy "messages_select_own_conversations"
  on public.messages
  for select
  to authenticated
  using (
    conversation_id in (
      select id from public.conversations
      where user_id = auth.uid()
    )
  );

create policy "messages_insert_own_conversations"
  on public.messages
  for insert
  to authenticated
  with check (
    conversation_id in (
      select id from public.conversations
      where user_id = auth.uid()
    )
    and public.user_belongs_to_tenant(tenant_id)
  );

create policy "messages_delete_own_conversations"
  on public.messages
  for delete
  to authenticated
  using (
    conversation_id in (
      select id from public.conversations
      where user_id = auth.uid()
    )
  );
