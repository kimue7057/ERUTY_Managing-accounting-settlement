-- ERUTY 자금관리 시스템 RLS 정책
-- Supabase SQL Editor에서 이 파일 전체를 실행하면 됩니다.
--
-- 주의:
-- 1. 아래 정책은 public.profiles.id 값이 auth.users.id 와 동일하다고 가정합니다.
-- 2. schema.sql 의 seed data는 UI 프로토타입용 고정 UUID를 사용하므로,
--    실제 로그인 연동 단계에서는 profiles.id 를 실제 auth 사용자 ID 기준으로 맞춰야 합니다.
-- 3. service_role key 는 RLS 를 우회하므로 프론트엔드 브라우저 코드에서 사용하지 않습니다.

alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.expense_categories enable row level security;
alter table public.expense_requests enable row level security;
alter table public.expense_attachments enable row level security;

create or replace function public.current_profile_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select p.role
  from public.profiles p
  where p.id = auth.uid()
  limit 1
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_profile_role() = 'admin', false)
$$;

create or replace function public.is_manager_or_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_profile_role() in ('manager', 'admin'), false)
$$;

create or replace function public.is_employee()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_profile_role() = 'employee', false)
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

drop policy if exists "profiles_select_own_or_admin" on public.profiles;
drop policy if exists "projects_select_active_or_admin" on public.projects;
drop policy if exists "projects_admin_manage_all" on public.projects;
drop policy if exists "expense_categories_select_active_or_admin" on public.expense_categories;
drop policy if exists "expense_categories_admin_manage_all" on public.expense_categories;
drop policy if exists "expense_requests_select_own_or_manager_admin" on public.expense_requests;
drop policy if exists "expense_requests_insert_own_by_employee" on public.expense_requests;
drop policy if exists "expense_requests_update_own_draft_or_submitted" on public.expense_requests;
drop policy if exists "expense_requests_update_by_manager_admin" on public.expense_requests;
drop policy if exists "expense_attachments_select_own_or_manager_admin" on public.expense_attachments;
drop policy if exists "expense_attachments_insert_own_by_employee" on public.expense_attachments;

create policy "profiles_select_own_or_admin"
on public.profiles
for select
to authenticated
using (
  auth.uid() = id
  or public.is_admin()
);

create policy "projects_select_active_or_admin"
on public.projects
for select
to authenticated
using (
  status = 'active'
  or public.is_admin()
);

create policy "projects_admin_manage_all"
on public.projects
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "expense_categories_select_active_or_admin"
on public.expense_categories
for select
to authenticated
using (
  is_active = true
  or public.is_admin()
);

create policy "expense_categories_admin_manage_all"
on public.expense_categories
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "expense_requests_select_own_or_manager_admin"
on public.expense_requests
for select
to authenticated
using (
  user_id = auth.uid()
  or public.is_manager_or_admin()
);

create policy "expense_requests_insert_own_by_employee"
on public.expense_requests
for insert
to authenticated
with check (
  public.is_employee()
  and user_id = auth.uid()
);

create policy "expense_requests_update_own_draft_or_submitted"
on public.expense_requests
for update
to authenticated
using (
  public.is_employee()
  and user_id = auth.uid()
  and status in ('draft', 'submitted')
)
with check (
  public.is_employee()
  and user_id = auth.uid()
  and status in ('draft', 'submitted')
);

create policy "expense_requests_update_by_manager_admin"
on public.expense_requests
for update
to authenticated
using (public.is_manager_or_admin())
with check (public.is_manager_or_admin());

create policy "expense_attachments_select_own_or_manager_admin"
on public.expense_attachments
for select
to authenticated
using (
  public.owns_expense_request(expense_request_id)
  or public.is_manager_or_admin()
);

create policy "expense_attachments_insert_own_by_employee"
on public.expense_attachments
for insert
to authenticated
with check (
  public.is_employee()
  and public.owns_expense_request(expense_request_id)
);

-- TODO:
-- 다음 단계에서 필요하면 아래 정책도 추가 검토합니다.
-- - profiles update 정책
-- - manager/admin 의 expense_attachments 업로드 정책
-- - expense_requests delete 정책
-- - storage.objects 와 연계된 파일 버킷 정책
