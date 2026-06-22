-- ERUTY 자금관리 시스템 1차 Supabase 스키마
-- Supabase SQL Editor에서 이 파일 전체를 실행하면 됩니다.
-- 현재 단계에서는 테이블, 기본 제약조건, updated_at 트리거, seed data, RLS enable만 포함합니다.
-- 실제 프론트 조회/저장 연결과 RLS policy 작성은 다음 단계에서 진행합니다.

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

create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  name text not null,
  department text not null default '',
  role text not null default 'employee' check (role in ('employee', 'manager', 'admin')),
  bank_name text not null default '',
  bank_account text not null default '',
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text not null default '',
  status text not null default 'active',
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.expense_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.expense_requests (
  id uuid primary key default gen_random_uuid(),
  request_no text not null unique,
  user_id uuid not null references public.profiles(id),
  project_id uuid not null references public.projects(id),
  category_id uuid not null references public.expense_categories(id),
  title text not null,
  purpose text not null default '',
  expense_date date not null,
  vendor text not null default '',
  amount integer not null default 0 check (amount >= 0),
  payment_method text not null check (
    payment_method in ('personal_card', 'corporate_card', 'cash', 'bank_transfer')
  ),
  settlement_requested boolean not null default false,
  attendees text not null default '',
  memo text not null default '',
  status text not null default 'draft' check (
    status in (
      'draft',
      'submitted',
      'approved',
      'rejected',
      'revision_requested',
      'settlement_pending',
      'settled',
      'on_hold'
    )
  ),
  evidence_status text not null default 'none' check (
    evidence_status in ('none', 'attached')
  ),
  requested_at timestamptz not null default timezone('utc', now()),
  approved_at timestamptz,
  approver_id uuid references public.profiles(id) on delete set null,
  reject_reason text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.expense_attachments (
  id uuid primary key default gen_random_uuid(),
  expense_request_id uuid not null references public.expense_requests(id) on delete cascade,
  file_type text not null check (
    file_type in (
      'receipt',
      'card_slip',
      'cash_receipt',
      'simple_receipt',
      'transport_receipt',
      'other'
    )
  ),
  file_name text not null,
  file_path text not null,
  uploaded_by uuid not null references public.profiles(id),
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_profiles_role on public.profiles (role);
create index if not exists idx_projects_status on public.projects (status);
create index if not exists idx_expense_requests_user_id on public.expense_requests (user_id);
create index if not exists idx_expense_requests_project_id on public.expense_requests (project_id);
create index if not exists idx_expense_requests_category_id on public.expense_requests (category_id);
create index if not exists idx_expense_requests_status on public.expense_requests (status);
create index if not exists idx_expense_requests_requested_at on public.expense_requests (requested_at desc);
create index if not exists idx_expense_attachments_request_id on public.expense_attachments (expense_request_id);

drop trigger if exists set_expense_requests_updated_at on public.expense_requests;

create trigger set_expense_requests_updated_at
before update on public.expense_requests
for each row
execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.expense_categories enable row level security;
alter table public.expense_requests enable row level security;
alter table public.expense_attachments enable row level security;

-- TODO: 다음 단계에서 RLS policy를 추가합니다.
-- 예시:
-- create policy "profiles_select_self" on public.profiles
--   for select to authenticated
--   using (auth.uid() = id);
--
-- create policy "expense_requests_select_own" on public.expense_requests
--   for select to authenticated
--   using (auth.uid() = user_id);

insert into public.profiles (
  id,
  email,
  name,
  department,
  role,
  bank_name,
  bank_account,
  is_active,
  created_at
)
values
  (
    '00000000-0000-0000-0000-000000000001',
    'yuseong.kim@eruty.co.kr',
    '김유성',
    '대표',
    'admin',
    '국민은행',
    '111-222-333333',
    true,
    '2026-01-01T09:00:00+09:00'
  ),
  (
    '00000000-0000-0000-0000-000000000002',
    'hongok.kim@eruty.co.kr',
    '김홍옥',
    '재무관리팀',
    'manager',
    '신한은행',
    '222-333-444444',
    true,
    '2026-01-02T09:00:00+09:00'
  ),
  (
    '00000000-0000-0000-0000-000000000003',
    'hayeon.gong@eruty.co.kr',
    '공하연',
    '디자인',
    'employee',
    '카카오뱅크',
    '3333-44-5555555',
    true,
    '2026-01-03T09:00:00+09:00'
  ),
  (
    '00000000-0000-0000-0000-000000000004',
    'taewoo.kim@eruty.co.kr',
    '김태우',
    '개발',
    'employee',
    '우리은행',
    '444-555555-66-777',
    true,
    '2026-01-04T09:00:00+09:00'
  ),
  (
    '00000000-0000-0000-0000-000000000005',
    'taeho.yoo@eruty.co.kr',
    '유태호',
    '기획',
    'manager',
    '하나은행',
    '555-666777-888',
    true,
    '2026-01-05T09:00:00+09:00'
  )
on conflict (id) do update
set
  email = excluded.email,
  name = excluded.name,
  department = excluded.department,
  role = excluded.role,
  bank_name = excluded.bank_name,
  bank_account = excluded.bank_account,
  is_active = excluded.is_active,
  created_at = excluded.created_at;

insert into public.projects (
  id,
  name,
  description,
  status,
  created_at
)
values
  (
    '00000000-0000-0000-0000-000000000101',
    'AI 일기 서비스 개발',
    'AI 기반 일기 서비스의 제품 개발과 운영을 위한 프로젝트입니다.',
    'active',
    '2026-01-02T09:00:00+09:00'
  ),
  (
    '00000000-0000-0000-0000-000000000102',
    '콘텐츠 투자 플랫폼 R&D',
    '콘텐츠 투자 플랫폼 리서치와 프로토타이핑을 위한 프로젝트입니다.',
    'active',
    '2026-01-15T09:00:00+09:00'
  ),
  (
    '00000000-0000-0000-0000-000000000103',
    '내부 SI 개발',
    '사내 운영 시스템 고도화를 위한 내부 SI 개발 프로젝트입니다.',
    'active',
    '2026-02-01T09:00:00+09:00'
  ),
  (
    '00000000-0000-0000-0000-000000000104',
    '마케팅·행사 운영',
    '브랜드 마케팅과 행사 운영을 위한 예산 집행 프로젝트입니다.',
    'active',
    '2026-03-01T09:00:00+09:00'
  ),
  (
    '00000000-0000-0000-0000-000000000105',
    '공통 운영비',
    '프로젝트 공통으로 사용되는 운영성 비용 관리용 프로젝트입니다.',
    'active',
    '2026-01-01T09:00:00+09:00'
  )
on conflict (id) do update
set
  name = excluded.name,
  description = excluded.description,
  status = excluded.status,
  created_at = excluded.created_at;

insert into public.expense_categories (
  id,
  name,
  is_active,
  created_at
)
values
  ('00000000-0000-0000-0000-000000000201', '식대/회의비', true, '2026-01-01T09:00:00+09:00'),
  ('00000000-0000-0000-0000-000000000202', '교통비', true, '2026-01-01T09:00:00+09:00'),
  ('00000000-0000-0000-0000-000000000203', '출장비', true, '2026-01-01T09:00:00+09:00'),
  ('00000000-0000-0000-0000-000000000204', '숙박비', true, '2026-01-01T09:00:00+09:00'),
  ('00000000-0000-0000-0000-000000000205', '소모품비', true, '2026-01-01T09:00:00+09:00'),
  ('00000000-0000-0000-0000-000000000206', '주차비', true, '2026-01-01T09:00:00+09:00'),
  ('00000000-0000-0000-0000-000000000207', '택배/배송비', true, '2026-01-01T09:00:00+09:00'),
  ('00000000-0000-0000-0000-000000000208', '서버/소프트웨어비', true, '2026-01-01T09:00:00+09:00'),
  ('00000000-0000-0000-0000-000000000209', '행사운영비', true, '2026-01-01T09:00:00+09:00'),
  ('00000000-0000-0000-0000-000000000210', '기타', true, '2026-01-01T09:00:00+09:00')
on conflict (id) do update
set
  name = excluded.name,
  is_active = excluded.is_active,
  created_at = excluded.created_at;

insert into public.expense_requests (
  id,
  request_no,
  user_id,
  project_id,
  category_id,
  title,
  purpose,
  expense_date,
  vendor,
  amount,
  payment_method,
  settlement_requested,
  attendees,
  memo,
  status,
  evidence_status,
  requested_at,
  approved_at,
  approver_id,
  reject_reason,
  created_at,
  updated_at
)
values
  (
    '00000000-0000-0000-0000-000000000301',
    'EXP-2026-011',
    '00000000-0000-0000-0000-000000000003',
    '00000000-0000-0000-0000-000000000102',
    '00000000-0000-0000-0000-000000000201',
    '거래처 미팅 식대',
    '콘텐츠 투자 플랫폼 협력사와 미팅을 진행하며 식대가 발생했습니다.',
    '2026-06-19',
    '스타벅스 강남점',
    48000,
    'personal_card',
    true,
    '공하연, 협력사 담당자 2명',
    '협력사와 3분기 파트너십 운영안 논의',
    'submitted',
    'attached',
    '2026-06-19T09:30:00+09:00',
    null,
    null,
    null,
    '2026-06-19T09:30:00+09:00',
    '2026-06-19T09:30:00+09:00'
  ),
  (
    '00000000-0000-0000-0000-000000000302',
    'EXP-2026-012',
    '00000000-0000-0000-0000-000000000004',
    '00000000-0000-0000-0000-000000000103',
    '00000000-0000-0000-0000-000000000202',
    'KTX 출장 교통비',
    '대전 고객사 방문을 위한 왕복 KTX 교통비입니다.',
    '2026-06-18',
    '코레일',
    82000,
    'personal_card',
    true,
    '김태우',
    '고객사 요구사항 반영 회의 참석',
    'submitted',
    'attached',
    '2026-06-19T10:00:00+09:00',
    null,
    null,
    null,
    '2026-06-19T10:00:00+09:00',
    '2026-06-19T10:00:00+09:00'
  ),
  (
    '00000000-0000-0000-0000-000000000303',
    'EXP-2026-013',
    '00000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000101',
    '00000000-0000-0000-0000-000000000208',
    '긴급 서버 소프트웨어 결제',
    '서비스 장애 예방을 위한 AWS 사용량 초과분을 긴급 결제했습니다.',
    '2026-06-20',
    'AWS',
    320000,
    'corporate_card',
    false,
    '운영 자동결제',
    '월간 사용량 초과로 즉시 결제가 필요했습니다.',
    'submitted',
    'attached',
    '2026-06-20T08:45:00+09:00',
    null,
    null,
    null,
    '2026-06-20T08:45:00+09:00',
    '2026-06-20T08:45:00+09:00'
  ),
  (
    '00000000-0000-0000-0000-000000000304',
    'EXP-2026-014',
    '00000000-0000-0000-0000-000000000005',
    '00000000-0000-0000-0000-000000000104',
    '00000000-0000-0000-0000-000000000201',
    '회의 식대',
    '내부 운영 회의 후 식대 정산 요청입니다.',
    '2026-06-20',
    '본도시락',
    54000,
    'cash',
    true,
    '유태호, 운영팀 3명',
    '행사 운영 회의 직후 식사 진행',
    'revision_requested',
    'none',
    '2026-06-20T14:20:00+09:00',
    null,
    '00000000-0000-0000-0000-000000000001',
    '증빙자료를 첨부한 뒤 다시 제출해주세요.',
    '2026-06-20T14:20:00+09:00',
    '2026-06-20T18:00:00+09:00'
  ),
  (
    '00000000-0000-0000-0000-000000000305',
    'EXP-2026-015',
    '00000000-0000-0000-0000-000000000003',
    '00000000-0000-0000-0000-000000000104',
    '00000000-0000-0000-0000-000000000202',
    '행사 운영 택시비',
    '행사 물품 이동을 위한 택시 이용 비용입니다.',
    '2026-06-20',
    '카카오택시',
    23000,
    'personal_card',
    true,
    '행사 배너 및 운영 물품 운송',
    '행사장 입고 일정이 촉박해 택시로 이동했습니다.',
    'submitted',
    'none',
    '2026-06-20T15:10:00+09:00',
    null,
    null,
    null,
    '2026-06-20T15:10:00+09:00',
    '2026-06-20T15:10:00+09:00'
  ),
  (
    '00000000-0000-0000-0000-000000000306',
    'EXP-2026-016',
    '00000000-0000-0000-0000-000000000004',
    '00000000-0000-0000-0000-000000000103',
    '00000000-0000-0000-0000-000000000201',
    '개발팀 점심 식대',
    '주간 개발 일정 조율 미팅을 겸한 점심 식대입니다.',
    '2026-06-21',
    '한식당 연',
    145000,
    'personal_card',
    true,
    '김태우, 박지훈, 오예린',
    '주간 스프린트 일정 및 배포 일정 조율',
    'submitted',
    'attached',
    '2026-06-21T12:30:00+09:00',
    null,
    null,
    null,
    '2026-06-21T12:30:00+09:00',
    '2026-06-21T12:30:00+09:00'
  ),
  (
    '00000000-0000-0000-0000-000000000307',
    'EXP-2026-017',
    '00000000-0000-0000-0000-000000000005',
    '00000000-0000-0000-0000-000000000104',
    '00000000-0000-0000-0000-000000000209',
    '콘텐츠 행사 공간 대관비',
    '사전 확정된 행사 운영을 위해 대관비를 선결제했습니다.',
    '2026-06-21',
    '성수 이벤트홀',
    1700000,
    'bank_transfer',
    false,
    '행사 운영팀',
    '행사 일정 확정에 따라 선납 처리',
    'on_hold',
    'attached',
    '2026-06-21T11:00:00+09:00',
    null,
    '00000000-0000-0000-0000-000000000001',
    '계약 요약서와 이체 증빙은 확인되었으나 추가 검토가 필요합니다.',
    '2026-06-21T11:00:00+09:00',
    '2026-06-21T17:30:00+09:00'
  ),
  (
    '00000000-0000-0000-0000-000000000308',
    'EXP-2026-018',
    '00000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000105',
    '00000000-0000-0000-0000-000000000205',
    '사무실 소모품 구매',
    '프린터 용지와 사무용품 구매 건입니다.',
    '2026-06-18',
    '쿠팡',
    65000,
    'corporate_card',
    false,
    '사무실 공용 사용',
    '프린터 용지, 네임펜, 파일홀더 포함',
    'approved',
    'attached',
    '2026-06-18T10:15:00+09:00',
    '2026-06-18T15:20:00+09:00',
    '00000000-0000-0000-0000-000000000001',
    null,
    '2026-06-18T10:15:00+09:00',
    '2026-06-18T15:20:00+09:00'
  ),
  (
    '00000000-0000-0000-0000-000000000309',
    'EXP-2026-019',
    '00000000-0000-0000-0000-000000000003',
    '00000000-0000-0000-0000-000000000102',
    '00000000-0000-0000-0000-000000000203',
    '출장 숙박비',
    '부산 세미나 참석을 위한 1박 숙박비입니다.',
    '2026-06-16',
    '호텔스닷컴',
    270000,
    'personal_card',
    true,
    '공하연',
    '세미나 일정으로 인한 1박 숙박',
    'settlement_pending',
    'attached',
    '2026-06-17T09:40:00+09:00',
    '2026-06-18T10:10:00+09:00',
    '00000000-0000-0000-0000-000000000002',
    null,
    '2026-06-17T09:40:00+09:00',
    '2026-06-18T10:10:00+09:00'
  ),
  (
    '00000000-0000-0000-0000-000000000310',
    'EXP-2026-020',
    '00000000-0000-0000-0000-000000000004',
    '00000000-0000-0000-0000-000000000103',
    '00000000-0000-0000-0000-000000000205',
    '문구류 구매',
    '팀 내 비품 보충을 위한 문구류 구매 건입니다.',
    '2026-06-16',
    '오피스디포',
    37000,
    'corporate_card',
    false,
    '개발팀 공용',
    '노트, 펜, 포스트잇 등 소모품 구매',
    'rejected',
    'attached',
    '2026-06-16T16:10:00+09:00',
    null,
    '00000000-0000-0000-0000-000000000002',
    '동일 품목이 이번 달 중복 구매되어 반려 처리했습니다.',
    '2026-06-16T16:10:00+09:00',
    '2026-06-17T11:30:00+09:00'
  )
on conflict (id) do update
set
  request_no = excluded.request_no,
  user_id = excluded.user_id,
  project_id = excluded.project_id,
  category_id = excluded.category_id,
  title = excluded.title,
  purpose = excluded.purpose,
  expense_date = excluded.expense_date,
  vendor = excluded.vendor,
  amount = excluded.amount,
  payment_method = excluded.payment_method,
  settlement_requested = excluded.settlement_requested,
  attendees = excluded.attendees,
  memo = excluded.memo,
  status = excluded.status,
  evidence_status = excluded.evidence_status,
  requested_at = excluded.requested_at,
  approved_at = excluded.approved_at,
  approver_id = excluded.approver_id,
  reject_reason = excluded.reject_reason,
  created_at = excluded.created_at,
  updated_at = excluded.updated_at;

insert into public.expense_attachments (
  id,
  expense_request_id,
  file_type,
  file_name,
  file_path,
  uploaded_by,
  created_at
)
values
  (
    '00000000-0000-0000-0000-000000000401',
    '00000000-0000-0000-0000-000000000301',
    'receipt',
    'receipt_meeting_lunch_0619.jpg',
    'expense-attachments/EXP-2026-011/receipt_meeting_lunch_0619.jpg',
    '00000000-0000-0000-0000-000000000003',
    '2026-06-19T09:31:00+09:00'
  ),
  (
    '00000000-0000-0000-0000-000000000402',
    '00000000-0000-0000-0000-000000000301',
    'card_slip',
    'card_slip_0619.pdf',
    'expense-attachments/EXP-2026-011/card_slip_0619.pdf',
    '00000000-0000-0000-0000-000000000003',
    '2026-06-19T09:31:30+09:00'
  ),
  (
    '00000000-0000-0000-0000-000000000403',
    '00000000-0000-0000-0000-000000000302',
    'transport_receipt',
    'ktx_ticket_20260618.pdf',
    'expense-attachments/EXP-2026-012/ktx_ticket_20260618.pdf',
    '00000000-0000-0000-0000-000000000004',
    '2026-06-19T10:01:00+09:00'
  ),
  (
    '00000000-0000-0000-0000-000000000404',
    '00000000-0000-0000-0000-000000000303',
    'card_slip',
    'aws_card_statement_0620.pdf',
    'expense-attachments/EXP-2026-013/aws_card_statement_0620.pdf',
    '00000000-0000-0000-0000-000000000002',
    '2026-06-20T08:46:00+09:00'
  ),
  (
    '00000000-0000-0000-0000-000000000405',
    '00000000-0000-0000-0000-000000000303',
    'other',
    'aws_invoice_0620.pdf',
    'expense-attachments/EXP-2026-013/aws_invoice_0620.pdf',
    '00000000-0000-0000-0000-000000000002',
    '2026-06-20T08:46:30+09:00'
  ),
  (
    '00000000-0000-0000-0000-000000000406',
    '00000000-0000-0000-0000-000000000306',
    'receipt',
    'dev_team_lunch_0621.jpg',
    'expense-attachments/EXP-2026-016/dev_team_lunch_0621.jpg',
    '00000000-0000-0000-0000-000000000004',
    '2026-06-21T12:31:00+09:00'
  ),
  (
    '00000000-0000-0000-0000-000000000407',
    '00000000-0000-0000-0000-000000000307',
    'other',
    'venue_contract_summary.pdf',
    'expense-attachments/EXP-2026-017/venue_contract_summary.pdf',
    '00000000-0000-0000-0000-000000000005',
    '2026-06-21T11:01:00+09:00'
  ),
  (
    '00000000-0000-0000-0000-000000000408',
    '00000000-0000-0000-0000-000000000307',
    'other',
    'bank_transfer_receipt_0621.pdf',
    'expense-attachments/EXP-2026-017/bank_transfer_receipt_0621.pdf',
    '00000000-0000-0000-0000-000000000005',
    '2026-06-21T11:01:30+09:00'
  ),
  (
    '00000000-0000-0000-0000-000000000409',
    '00000000-0000-0000-0000-000000000308',
    'card_slip',
    'office_supplies_card_0618.pdf',
    'expense-attachments/EXP-2026-018/office_supplies_card_0618.pdf',
    '00000000-0000-0000-0000-000000000002',
    '2026-06-18T10:16:00+09:00'
  ),
  (
    '00000000-0000-0000-0000-000000000410',
    '00000000-0000-0000-0000-000000000309',
    'receipt',
    'hotel_receipt_busan_0616.pdf',
    'expense-attachments/EXP-2026-019/hotel_receipt_busan_0616.pdf',
    '00000000-0000-0000-0000-000000000003',
    '2026-06-17T09:41:00+09:00'
  ),
  (
    '00000000-0000-0000-0000-000000000411',
    '00000000-0000-0000-0000-000000000309',
    'card_slip',
    'hotel_card_slip_0616.pdf',
    'expense-attachments/EXP-2026-019/hotel_card_slip_0616.pdf',
    '00000000-0000-0000-0000-000000000003',
    '2026-06-17T09:41:30+09:00'
  ),
  (
    '00000000-0000-0000-0000-000000000412',
    '00000000-0000-0000-0000-000000000310',
    'card_slip',
    'office_depot_0616.pdf',
    'expense-attachments/EXP-2026-020/office_depot_0616.pdf',
    '00000000-0000-0000-0000-000000000004',
    '2026-06-16T16:11:00+09:00'
  )
on conflict (id) do update
set
  expense_request_id = excluded.expense_request_id,
  file_type = excluded.file_type,
  file_name = excluded.file_name,
  file_path = excluded.file_path,
  uploaded_by = excluded.uploaded_by,
  created_at = excluded.created_at;
