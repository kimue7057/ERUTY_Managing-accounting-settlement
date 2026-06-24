-- ERUTY 프로젝트 예산 관리용 컬럼 및 로그 테이블
-- Supabase SQL Editor에서 이 파일 전체를 실행해주세요.
--
-- 주의:
-- 1. 이 파일은 컬럼/로그 테이블/동기화 trigger 생성만 담당합니다.
-- 2. 운영용 RLS 정책은 supabase/rls.sql 에서 일괄 적용합니다.
-- 3. service_role key는 프론트엔드나 Vercel 환경변수에 넣지 않습니다.

create extension if not exists "pgcrypto";

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

alter table public.projects
  add column if not exists budget_amount numeric not null default 0;

alter table public.projects
  add column if not exists used_amount numeric not null default 0;

alter table public.projects
  add column if not exists remaining_amount numeric not null default 0;

alter table public.projects
  add column if not exists budget_status text not null default 'normal';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'projects_budget_status_check'
  ) then
    alter table public.projects
      add constraint projects_budget_status_check
      check (budget_status in ('normal', 'warning', 'at_risk', 'over'));
  end if;
end
$$;

alter table public.expense_requests
  add column if not exists approved_amount integer;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'expense_requests_approved_amount_check'
  ) then
    alter table public.expense_requests
      add constraint expense_requests_approved_amount_check
      check (approved_amount is null or approved_amount >= 0);
  end if;
end
$$;

update public.expense_requests
set approved_amount = amount
where status = 'approved'
  and approved_amount is null;

create table if not exists public.project_budget_logs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  expense_request_id uuid not null references public.expense_requests(id) on delete cascade,
  amount integer not null default 0 check (amount >= 0),
  log_type text not null check (log_type in ('approval_applied')),
  description text not null default '',
  created_at timestamptz not null default timezone('utc', now()),
  unique (expense_request_id, log_type)
);

create index if not exists idx_project_budget_logs_project_id
  on public.project_budget_logs (project_id);

create index if not exists idx_project_budget_logs_expense_request_id
  on public.project_budget_logs (expense_request_id);

insert into public.project_budget_logs (
  project_id,
  expense_request_id,
  amount,
  log_type,
  description
)
select
  er.project_id,
  er.id,
  greatest(coalesce(er.approved_amount, er.amount, 0), 0),
  'approval_applied',
  'expense_requests 승인 처리에 따른 프로젝트 예산 반영'
from public.expense_requests er
where er.project_id is not null
  and er.status = 'approved'
on conflict (expense_request_id, log_type)
do update
set
  project_id = excluded.project_id,
  amount = excluded.amount,
  description = excluded.description;

with project_budget_totals as (
  select
    p.id,
    coalesce(p.budget_amount, 0) as budget_amount,
    coalesce(
      sum(
        case
          when er.status = 'approved' then coalesce(er.approved_amount, er.amount)
          else 0
        end
      ),
      0
    ) as used_amount
  from public.projects p
  left join public.expense_requests er
    on er.project_id = p.id
  group by p.id, p.budget_amount
)
update public.projects p
set
  used_amount = totals.used_amount,
  remaining_amount = totals.budget_amount - totals.used_amount,
  budget_status = case
    when totals.budget_amount <= 0 then 'normal'
    when totals.used_amount >= totals.budget_amount then 'over'
    when (totals.used_amount / nullif(totals.budget_amount, 0)) * 100 >= 80 then 'at_risk'
    when (totals.used_amount / nullif(totals.budget_amount, 0)) * 100 >= 60 then 'warning'
    else 'normal'
  end
from project_budget_totals totals
where p.id = totals.id;

create or replace function public.sync_project_budget_log(target_request_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  request_row public.expense_requests%rowtype;
  next_amount integer;
begin
  if target_request_id is null then
    return;
  end if;

  select *
  into request_row
  from public.expense_requests
  where id = target_request_id;

  if not found then
    delete from public.project_budget_logs
    where expense_request_id = target_request_id;
    return;
  end if;

  if request_row.project_id is null or request_row.status <> 'approved' then
    delete from public.project_budget_logs
    where expense_request_id = target_request_id;
    return;
  end if;

  next_amount := greatest(coalesce(request_row.approved_amount, request_row.amount, 0), 0);

  insert into public.project_budget_logs (
    project_id,
    expense_request_id,
    amount,
    log_type,
    description
  )
  values (
    request_row.project_id,
    request_row.id,
    next_amount,
    'approval_applied',
    'expense_requests 승인 처리에 따른 프로젝트 예산 반영'
  )
  on conflict (expense_request_id, log_type)
  do update
  set
    project_id = excluded.project_id,
    amount = excluded.amount,
    description = excluded.description;
end;
$$;

create or replace function public.refresh_project_budget_summary(target_project_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  next_budget_amount numeric := 0;
  next_used_amount numeric := 0;
  next_usage_rate numeric := 0;
  next_budget_status text := 'normal';
begin
  if target_project_id is null then
    return;
  end if;

  select coalesce(p.budget_amount, 0)
  into next_budget_amount
  from public.projects p
  where p.id = target_project_id;

  if not found then
    return;
  end if;

  select coalesce(
    sum(
      case
        when er.status = 'approved' then coalesce(er.approved_amount, er.amount)
        else 0
      end
    ),
    0
  )
  into next_used_amount
  from public.expense_requests er
  where er.project_id = target_project_id;

  if next_budget_amount > 0 then
    next_usage_rate := (next_used_amount / next_budget_amount) * 100;
  end if;

  next_budget_status := case
    when next_budget_amount <= 0 then 'normal'
    when next_used_amount >= next_budget_amount then 'over'
    when next_usage_rate >= 80 then 'at_risk'
    when next_usage_rate >= 60 then 'warning'
    else 'normal'
  end;

  update public.projects
  set
    used_amount = next_used_amount,
    remaining_amount = next_budget_amount - next_used_amount,
    budget_status = next_budget_status
  where id = target_project_id;
end;
$$;

create or replace function public.handle_expense_request_project_budget_sync()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    delete from public.project_budget_logs
    where expense_request_id = old.id;

    perform public.refresh_project_budget_summary(old.project_id);
    return old;
  end if;

  perform public.sync_project_budget_log(new.id);

  if tg_op = 'UPDATE' and old.project_id is distinct from new.project_id then
    perform public.refresh_project_budget_summary(old.project_id);
  end if;

  perform public.refresh_project_budget_summary(new.project_id);
  return new;
end;
$$;

drop trigger if exists set_projects_updated_at on public.projects;
drop trigger if exists expense_request_project_budget_sync on public.expense_requests;

create trigger set_projects_updated_at
before update on public.projects
for each row
execute function public.set_updated_at();

create trigger expense_request_project_budget_sync
after insert or update or delete on public.expense_requests
for each row
execute function public.handle_expense_request_project_budget_sync();

alter table public.project_budget_logs enable row level security;
