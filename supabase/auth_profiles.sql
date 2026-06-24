-- ERUTY Auth 로그인용 profiles 보강 컬럼
-- Supabase SQL Editor에서 이 파일 전체를 실행해주세요.
--
-- 주의:
-- 1. profiles.id 는 auth.users.id 와 동일한 값을 사용해야 합니다.
-- 2. 현재 프론트는 로그인 후 profiles.id = auth.user.id 기준으로 사용자 정보를 조회합니다.
-- 3. service_role key 는 프론트엔드나 Vercel 환경변수에 넣지 않습니다.

alter table public.profiles
  add column if not exists position text not null default '';

alter table public.profiles
  add column if not exists status text not null default 'active';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_status_check'
  ) then
    alter table public.profiles
      add constraint profiles_status_check
      check (status in ('active', 'inactive'));
  end if;
end
$$;

update public.profiles
set status = case
  when coalesce(is_active, true) = true then 'active'
  else 'inactive'
end
where status not in ('active', 'inactive')
   or status is null;
