-- ERUTY 자금관리 시스템 운영용 RLS 정책
-- Supabase SQL Editor에서 이 파일 전체를 실행하면 됩니다.
--
-- 실행 순서:
-- 1. supabase/schema.sql
-- 2. supabase/monthly_settlements.sql
-- 3. supabase/company_funds.sql
-- 4. supabase/project_budgets.sql
-- 5. supabase/auth_profiles.sql
-- 6. supabase/rls.sql
--
-- 주의:
-- 1. public.profiles.id 값은 auth.users.id 와 동일해야 합니다.
-- 2. 아래 정책은 anon 이 아닌 authenticated 사용자 기준으로 동작합니다.
-- 3. service_role key 는 브라우저/Vercel 환경변수에서 사용하지 않습니다.
-- 4. Storage bucket(storage.objects) 정책은 별도로 구성해야 합니다.

alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.expense_categories enable row level security;
alter table public.expense_requests enable row level security;
alter table public.expense_attachments enable row level security;
alter table public.monthly_settlements enable row level security;
alter table public.settlement_items enable row level security;
alter table public.company_funds enable row level security;
alter table public.fund_transactions enable row level security;
alter table public.project_budget_logs enable row level security;

create or replace function public.current_profile_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select p.role
      from public.profiles p
      where p.id = auth.uid()
      limit 1
    ),
    ''
  )
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_profile_role() = 'admin'
$$;

create or replace function public.is_manager_or_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_profile_role() in ('manager', 'admin')
$$;

create or replace function public.can_submit_own_expense()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_profile_role() in ('employee', 'admin')
$$;

create or replace function public.owns_expense_request(target_request_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.expense_requests er
    where er.id = target_request_id
      and er.user_id = auth.uid()
  )
$$;

create or replace function public.owns_project_via_expense_request(target_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.expense_requests er
    where er.project_id = target_project_id
      and er.user_id = auth.uid()
  )
$$;

create or replace function public.owns_category_via_expense_request(target_category_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.expense_requests er
    where er.category_id = target_category_id
      and er.user_id = auth.uid()
  )
$$;

create or replace function public.owns_monthly_settlement(target_settlement_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.monthly_settlements ms
    where ms.id = target_settlement_id
      and ms.employee_id = auth.uid()
  )
$$;

drop policy if exists "profiles_select_own_or_admin" on public.profiles;
drop policy if exists "profiles_select_own_or_manager_admin" on public.profiles;
drop policy if exists "profiles_admin_insert" on public.profiles;
drop policy if exists "profiles_admin_update" on public.profiles;

drop policy if exists "projects_select_active_or_admin" on public.projects;
drop policy if exists "projects_select_accessible" on public.projects;
drop policy if exists "projects_admin_manage_all" on public.projects;
drop policy if exists "projects_admin_insert" on public.projects;
drop policy if exists "projects_admin_update" on public.projects;

drop policy if exists "expense_categories_select_active_or_admin" on public.expense_categories;
drop policy if exists "expense_categories_select_accessible" on public.expense_categories;
drop policy if exists "expense_categories_admin_manage_all" on public.expense_categories;
drop policy if exists "expense_categories_admin_insert" on public.expense_categories;
drop policy if exists "expense_categories_admin_update" on public.expense_categories;

drop policy if exists "expense_requests_select_own_or_manager_admin" on public.expense_requests;
drop policy if exists "expense_requests_select_visible" on public.expense_requests;
drop policy if exists "expense_requests_insert_own_by_employee" on public.expense_requests;
drop policy if exists "expense_requests_insert_own_by_requester" on public.expense_requests;
drop policy if exists "expense_requests_update_own_draft_or_submitted" on public.expense_requests;
drop policy if exists "expense_requests_update_own_submitted" on public.expense_requests;
drop policy if exists "expense_requests_update_by_manager_admin" on public.expense_requests;
drop policy if exists "expense_requests_update_by_manager_or_admin" on public.expense_requests;

drop policy if exists "expense_attachments_select_own_or_manager_admin" on public.expense_attachments;
drop policy if exists "expense_attachments_select_visible" on public.expense_attachments;
drop policy if exists "expense_attachments_insert_own_by_employee" on public.expense_attachments;
drop policy if exists "expense_attachments_insert_by_request_owner" on public.expense_attachments;

drop policy if exists "monthly_settlements_dev_all" on public.monthly_settlements;
drop policy if exists "monthly_settlements_select_visible" on public.monthly_settlements;
drop policy if exists "monthly_settlements_admin_insert" on public.monthly_settlements;
drop policy if exists "monthly_settlements_admin_update" on public.monthly_settlements;
drop policy if exists "monthly_settlements_admin_delete" on public.monthly_settlements;

drop policy if exists "settlement_items_dev_all" on public.settlement_items;
drop policy if exists "settlement_items_select_visible" on public.settlement_items;
drop policy if exists "settlement_items_admin_insert" on public.settlement_items;
drop policy if exists "settlement_items_admin_update" on public.settlement_items;
drop policy if exists "settlement_items_admin_delete" on public.settlement_items;

drop policy if exists "company_funds_dev_all" on public.company_funds;
drop policy if exists "company_funds_select_admin" on public.company_funds;
drop policy if exists "company_funds_admin_insert" on public.company_funds;
drop policy if exists "company_funds_admin_update" on public.company_funds;

drop policy if exists "fund_transactions_dev_all" on public.fund_transactions;
drop policy if exists "fund_transactions_select_admin" on public.fund_transactions;
drop policy if exists "fund_transactions_admin_insert" on public.fund_transactions;
drop policy if exists "fund_transactions_admin_update" on public.fund_transactions;

drop policy if exists "project_budget_logs_dev_all" on public.project_budget_logs;
drop policy if exists "project_budget_logs_select_manager_admin" on public.project_budget_logs;
drop policy if exists "project_budget_logs_insert_manager_admin" on public.project_budget_logs;

create policy "profiles_select_own_or_manager_admin"
on public.profiles
for select
to authenticated
using (
  auth.uid() = id
  or public.is_manager_or_admin()
);

create policy "profiles_admin_insert"
on public.profiles
for insert
to authenticated
with check (public.is_admin());

create policy "profiles_admin_update"
on public.profiles
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "projects_select_accessible"
on public.projects
for select
to authenticated
using (
  status = 'active'
  or public.is_manager_or_admin()
  or public.owns_project_via_expense_request(id)
);

create policy "projects_admin_insert"
on public.projects
for insert
to authenticated
with check (public.is_admin());

create policy "projects_admin_update"
on public.projects
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "expense_categories_select_accessible"
on public.expense_categories
for select
to authenticated
using (
  is_active = true
  or public.is_manager_or_admin()
  or public.owns_category_via_expense_request(id)
);

create policy "expense_categories_admin_insert"
on public.expense_categories
for insert
to authenticated
with check (public.is_admin());

create policy "expense_categories_admin_update"
on public.expense_categories
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "expense_requests_select_visible"
on public.expense_requests
for select
to authenticated
using (
  user_id = auth.uid()
  or public.is_manager_or_admin()
);

create policy "expense_requests_insert_own_by_requester"
on public.expense_requests
for insert
to authenticated
with check (
  public.can_submit_own_expense()
  and user_id = auth.uid()
  and status in ('draft', 'submitted')
);

create policy "expense_requests_update_own_submitted"
on public.expense_requests
for update
to authenticated
using (
  public.can_submit_own_expense()
  and user_id = auth.uid()
  and status = 'submitted'
)
with check (
  public.can_submit_own_expense()
  and user_id = auth.uid()
  and status = 'submitted'
);

create policy "expense_requests_update_by_manager_or_admin"
on public.expense_requests
for update
to authenticated
using (public.is_manager_or_admin())
with check (public.is_manager_or_admin());

create policy "expense_attachments_select_visible"
on public.expense_attachments
for select
to authenticated
using (
  public.owns_expense_request(expense_request_id)
  or public.is_manager_or_admin()
);

create policy "expense_attachments_insert_by_request_owner"
on public.expense_attachments
for insert
to authenticated
with check (
  public.can_submit_own_expense()
  and uploaded_by = auth.uid()
  and public.owns_expense_request(expense_request_id)
);

create policy "monthly_settlements_select_visible"
on public.monthly_settlements
for select
to authenticated
using (
  employee_id = auth.uid()
  or public.is_admin()
);

create policy "monthly_settlements_admin_insert"
on public.monthly_settlements
for insert
to authenticated
with check (public.is_admin());

create policy "monthly_settlements_admin_update"
on public.monthly_settlements
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "monthly_settlements_admin_delete"
on public.monthly_settlements
for delete
to authenticated
using (public.is_admin());

create policy "settlement_items_select_visible"
on public.settlement_items
for select
to authenticated
using (
  public.owns_monthly_settlement(settlement_id)
  or public.is_admin()
);

create policy "settlement_items_admin_insert"
on public.settlement_items
for insert
to authenticated
with check (public.is_admin());

create policy "settlement_items_admin_update"
on public.settlement_items
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "settlement_items_admin_delete"
on public.settlement_items
for delete
to authenticated
using (public.is_admin());

create policy "company_funds_select_admin"
on public.company_funds
for select
to authenticated
using (public.is_admin());

create policy "company_funds_admin_insert"
on public.company_funds
for insert
to authenticated
with check (public.is_admin());

create policy "company_funds_admin_update"
on public.company_funds
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "fund_transactions_select_admin"
on public.fund_transactions
for select
to authenticated
using (public.is_admin());

create policy "fund_transactions_admin_insert"
on public.fund_transactions
for insert
to authenticated
with check (public.is_admin());

create policy "fund_transactions_admin_update"
on public.fund_transactions
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "project_budget_logs_select_manager_admin"
on public.project_budget_logs
for select
to authenticated
using (public.is_manager_or_admin());

create policy "project_budget_logs_insert_manager_admin"
on public.project_budget_logs
for insert
to authenticated
with check (public.is_manager_or_admin());

-- 참고:
-- 1. expense-evidence bucket 을 사용 중이라면 storage.objects 정책도 별도로 구성해야 합니다.
-- 2. manager/admin 승인 시 projects.used_amount, remaining_amount, budget_status 갱신은
--    supabase/project_budgets.sql 의 trigger 함수가 담당합니다.
