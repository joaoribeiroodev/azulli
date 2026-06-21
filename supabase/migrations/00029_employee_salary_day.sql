-- ============================================================================
-- AZULLI — Dia de pagamento do salário + vínculo funcionário em lançamentos
-- ============================================================================

alter table public.employees
  add column salary_day smallint
    check (salary_day is null or (salary_day >= 1 and salary_day <= 31));

comment on column public.employees.salary_day is
  'Dia do mês (1–31) para vencimento automático do salário.';

alter table public.transactions
  add column employee_id uuid references public.employees(id) on delete set null;

create index idx_transactions_employee_id
  on public.transactions(tenant_id, employee_id)
  where employee_id is not null;

create index idx_transactions_employee_due_date
  on public.transactions(tenant_id, employee_id, due_date)
  where employee_id is not null;

drop view if exists public.transactions_with_status;

create view public.transactions_with_status
with (security_invoker = true) as
select
  t.id,
  t.tenant_id,
  t.customer_id,
  t.supplier_id,
  t.employee_id,
  t.type,
  t.amount,
  t.category,
  t.due_date,
  t.paid_at,
  t.description,
  t.source,
  t.import_batch_id,
  t.external_ref,
  t.recurring_group,
  t.created_at,
  t.updated_at,
  case
    when t.status = 'paid' then 'paid'::public.transaction_status
    when t.status = 'pending' and t.due_date < public.today_brazil()
      then 'overdue'::public.transaction_status
    else 'pending'::public.transaction_status
  end as status,
  t.status as raw_status
from public.transactions t;

comment on view public.transactions_with_status is
  'Status dinâmico; overdue quando due_date < hoje em America/Sao_Paulo.';
