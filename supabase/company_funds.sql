-- ERUTY 회사 자금 및 출납 테이블
-- Supabase SQL Editor에서 이 파일 전체를 실행해주세요.
--
-- 주의:
-- 1. 이 파일은 테이블/트리거 생성만 담당합니다.
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

create table if not exists public.company_funds (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  fund_type text not null check (
    fund_type in (
      'operating_account',
      'grant_account',
      'corporate_card_account',
      'reserve_fund',
      'other'
    )
  ),
  current_balance integer not null default 0,
  description text not null default '',
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.fund_transactions (
  id uuid primary key default gen_random_uuid(),
  fund_id uuid not null references public.company_funds(id) on delete restrict,
  transaction_type text not null check (
    transaction_type in ('deposit', 'withdrawal', 'transfer', 'adjustment')
  ),
  amount integer not null,
  title text not null,
  description text not null default '',
  transaction_date date not null,
  related_expense_request_id uuid references public.expense_requests(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_company_funds_status
  on public.company_funds (status);

create index if not exists idx_fund_transactions_fund_id
  on public.fund_transactions (fund_id);

create index if not exists idx_fund_transactions_date
  on public.fund_transactions (transaction_date desc);

create index if not exists idx_fund_transactions_expense_request
  on public.fund_transactions (related_expense_request_id);

drop trigger if exists set_company_funds_updated_at on public.company_funds;

create trigger set_company_funds_updated_at
before update on public.company_funds
for each row
execute function public.set_updated_at();

alter table public.company_funds enable row level security;
alter table public.fund_transactions enable row level security;
