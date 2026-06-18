-- Fase 10 — dedup do cron de lembretes de cobrança (1x por dia)

alter table public.email_preferences
  add column if not exists collection_reminders_last_sent_at timestamptz;

comment on column public.email_preferences.collection_reminders_last_sent_at is
  'Último envio do cron de lembretes de cobrança — evita duplicar no mesmo dia.';
