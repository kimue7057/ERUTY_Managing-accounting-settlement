-- ERUTY 월말 정산 확정용 테이블
-- Supabase SQL Editor에서 이 파일 전체를 실행해주세요.
--
-- 주의:
-- 1. 이 파일은 테이블/인덱스 생성만 담당합니다.
-- 2. 운영용 RLS 정책은 supabase/rls.sql 에서 일괄 적용합니다.
-- 3. service_role key는 프론트엔드나 Vercel 환경변수에 넣지 않습니다.

create extension if not exists pgcrypto;

create table if not exists public.monthly_settlements (
  id uuid primary key default gen_random_uuid(),
  settlement_month text not null check (settlement_month ~ '^\d{4}-\d{2}$'),
  employee_id uuid not null references public.profiles(id) on delete restrict,
  total_requested_amount integer not null default 0 check (total_requested_amount >= 0),
  approved_amount integer not null default 0 check (approved_amount >= 0),
  rejected_amount integer not null default 0 check (rejected_amount >= 0),
  pending_evidence_amount integer not null default 0 check (pending_evidence_amount >= 0),
  final_payment_amount integer not null default 0 check (final_payment_amount >= 0),
  status text not null default 'confirmed' check (status in ('confirmed', 'paid', 'on_hold')),
  confirmed_at timestamptz,
  paid_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  unique (settlement_month, employee_id)
);

create index if not exists idx_monthly_settlements_month
  on public.monthly_settlements (settlement_month);

create index if not exists idx_monthly_settlements_employee
  on public.monthly_settlements (employee_id);

create table if not exists public.settlement_items (
  id uuid primary key default gen_random_uuid(),
  settlement_id uuid not null references public.monthly_settlements(id) on delete cascade,
  expense_request_id uuid not null references public.expense_requests(id) on delete restrict,
  amount integer not null default 0 check (amount >= 0),
  status text not null check (status in ('confirmed', 'pending_evidence', 'rejected')),
  created_at timestamptz not null default timezone('utc', now()),
  unique (settlement_id, expense_request_id)
);

create index if not exists idx_settlement_items_settlement_id
  on public.settlement_items (settlement_id);

create index if not exists idx_settlement_items_expense_request_id
  on public.settlement_items (expense_request_id);

alter table public.monthly_settlements enable row level security;
alter table public.settlement_items enable row level security;
