# ERUTY 자금관리 시스템

사내 경비 기안, 승인, 정산, 회계 자료 확인 흐름을 위한 Next.js 기반 UI 프로토타입입니다.  
현재는 Supabase를 연결한 프론트엔드 중심 프로젝트이며, 주요 서비스 화면은 mock fallback 없이 실제 Supabase 데이터만 표시하도록 정리되어 있습니다.
또한 Supabase Auth 로그인 기준으로 사용자별 조회와 관리자 권한 접근 제어가 적용되어 있습니다.

## 프로젝트 개요

- Next.js 16
- TypeScript
- Tailwind CSS
- Supabase
- B2B SaaS 스타일의 사내 경비/자금관리 관리자 UI

## 현재 구현 상태

### Supabase 실데이터 연결 화면

- 대시보드 `/`
  - `expense_requests` 기준 요약 카드
  - 최근 지출 기안
  - 승인 대기 목록
  - 프로젝트별 사용 현황
  - 경비 유형별 사용 현황
- 지출 기안 작성 `/expenses/request`
  - `projects`, `expense_categories` 조회
  - `expense_requests` 실제 insert
  - 증빙 파일 Supabase Storage 업로드
  - `expense_attachments` insert
  - 첨부 성공 시 `expense_requests.evidence_status` 업데이트
- 내 지출 내역 `/expenses/history`
  - 로그인한 사용자 본인 `expense_requests` 조회
- 승인 대기함 `/approvals/pending`
  - manager/admin 기준 전체 `expense_requests` 조회
- 지출 상세 검토 `/approvals/pending/[requestNumber]`
  - 단건 상세 조회
  - 승인 / 반려 / 수정요청 status update
- 프로젝트 예산 `/projects/budget`
  - `projects.budget_amount`, `used_amount`, `remaining_amount`, `budget_status` 기준 실제 예산 표시
  - 승인 처리 시 DB trigger 기반 프로젝트 사용 예산 반영
  - `project_budget_logs` 예산 차감 이력 저장
- 자금 현황 `/funds`
  - `company_funds`, `fund_transactions` 실제 조회
  - 자금 항목 추가, 수정, 비활성화
  - 입출금 내역 등록 시 `current_balance` 자동 반영
- 월말 정산 `/settlements/monthly`
  - 승인 완료된 개인카드/현금 건 기준 직원별 집계
  - `monthly_settlements`, `settlement_items` 정산 확정 저장
- 회계 자료 `/accounting/materials`
  - 월별 지출, 직원별 정산, 프로젝트별 지출, 계정과목별 지출 집계
- 설정 `/settings`
  - `profiles`, `projects`, `expense_categories` 실제 조회
  - 저장 기능은 아직 연결 전
- 로그인 `/login`
  - Supabase Auth 이메일/비밀번호 로그인
  - 로그인 사용자 기준 `profiles` 조회
  - 비로그인 사용자는 로그인 페이지로 이동
- 개발 확인 `/dev/supabase-test`
  - 환경변수, 연결 상태, 테이블 조회 결과 확인
  - 사이드바에는 노출하지 않음
- 개발 확인 `/dev/qa-checklist`
  - 운영 배포 전 역할별 전체 기능 QA 체크리스트
  - 체크 상태는 브라우저 localStorage에만 저장
  - 사이드바에는 노출하지 않음

### 참고

- `data/mockData.ts` 파일은 저장소에 남아 있지만, 주요 서비스 화면은 더 이상 이를 fallback으로 사용하지 않습니다.
- 데이터가 없으면 임의 mock row 대신 EmptyState가 표시됩니다.

## 실행 방법

### pnpm

```bash
pnpm install
pnpm dev
```

### npm

```bash
npm install
npm run dev
```

브라우저에서 아래 주소로 확인합니다.

- [http://127.0.0.1:3000](http://127.0.0.1:3000)

## 검증 명령어

```bash
npm run lint
npm run build
npm run start
```

또는

```bash
pnpm lint
pnpm build
pnpm start
```

## 환경변수 설정

로컬 개발에서는 `.env.local` 파일을 사용합니다.

필수 환경변수:

```bash
NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-supabase-publishable-key
```

참고:

- `.env.local`은 `.gitignore`에 포함되어 있어 커밋되지 않습니다.
- 프론트엔드와 Vercel에는 `NEXT_PUBLIC_`로 시작하는 값만 사용합니다.
- `service_role` key는 프론트 코드나 Vercel 환경변수에 절대 넣지 마세요.
- Vercel 운영 배포 시에도 아래 2개만 등록합니다.
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

예시 파일은 [`.env.example`](C:/Users/user/OneDrive/문서/GitHub/ERUTY_Managing-accounting-settlement/.env.example)에 정리되어 있습니다.

## Supabase 설정

### SQL 실행 순서

Supabase SQL Editor에서 아래 파일을 순서대로 실행합니다.

1. [supabase/schema.sql](C:/Users/user/OneDrive/문서/GitHub/ERUTY_Managing-accounting-settlement/supabase/schema.sql)
2. [supabase/monthly_settlements.sql](C:/Users/user/OneDrive/문서/GitHub/ERUTY_Managing-accounting-settlement/supabase/monthly_settlements.sql)
3. [supabase/company_funds.sql](C:/Users/user/OneDrive/문서/GitHub/ERUTY_Managing-accounting-settlement/supabase/company_funds.sql)
4. [supabase/project_budgets.sql](C:/Users/user/OneDrive/문서/GitHub/ERUTY_Managing-accounting-settlement/supabase/project_budgets.sql)
5. [supabase/auth_profiles.sql](C:/Users/user/OneDrive/문서/GitHub/ERUTY_Managing-accounting-settlement/supabase/auth_profiles.sql)
6. [supabase/rls.sql](C:/Users/user/OneDrive/문서/GitHub/ERUTY_Managing-accounting-settlement/supabase/rls.sql)

### Storage bucket 설정

Supabase Storage에서는 아래 bucket을 생성합니다.

- `expense-evidence`

권장 설정:

- bucket 이름: `expense-evidence`
- 업로드 경로 규칙: `expense-requests/{expense_request_id}/{timestamp}-{fileName}`
- 허용 파일 형식: `jpg`, `jpeg`, `png`, `pdf`
- 파일 크기 제한: 10MB
- 프론트에서는 publishable key만 사용하므로 Storage 접근은 `storage.objects` 정책이 반드시 필요합니다.
- public bucket으로 열기보다, 현재처럼 signed URL 또는 제한된 접근 정책 기준으로 운영하는 것을 권장합니다.

운영 전 주의사항:

- `supabase/rls.sql`은 운영용 역할 기반 정책을 기준으로 작성되어 있습니다.
- `monthly_settlements.sql`, `company_funds.sql`, `project_budgets.sql`을 다시 실행한 뒤에는 마지막에 `supabase/rls.sql`을 다시 실행해 정책 상태를 맞춰주세요.
- Storage 정책은 테이블 RLS와 별개이므로 `expense-evidence` bucket 용 `storage.objects` 정책을 따로 구성해야 합니다.
- 개발용 allow-all 정책이 과거 환경에 남아 있었다면, `supabase/rls.sql`을 다시 실행해 drop 구문으로 정리한 뒤 운영용 정책만 유지해야 합니다.

## 운영용 RLS QA 시나리오

`supabase/rls.sql` 적용 후에는 아래 순서로 QA하면 됩니다.

1. employee 계정 로그인
   - `/expenses/request`에서 경비 요청을 생성할 수 있어야 합니다.
   - `/expenses/history`에서는 본인 요청만 보여야 합니다.
   - `/approvals/pending`, `/funds`, `/settlements/monthly`, `/accounting/materials`, `/settings`는 접근 권한 없음 화면이 보여야 합니다.
   - Supabase Table Editor에서 다른 직원의 `expense_requests`를 브라우저 public key로 직접 읽으려고 하면 실패해야 합니다.
2. manager 계정 로그인
   - `/approvals/pending`과 `/approvals/pending/[requestNumber]`에서 전체 요청 조회와 승인 처리 저장이 가능해야 합니다.
   - `/projects/budget`에서 프로젝트 예산과 로그를 조회할 수 있어야 합니다.
   - `/funds`, `/settlements/monthly`, `/accounting/materials`, `/settings`는 접근 권한 없음 화면이 보여야 합니다.
   - 승인 처리 후 `expense_requests.status`, `approved_at`, `approved_amount`가 변경되고 프로젝트 예산 집계가 DB trigger 기준으로 반영되어야 합니다.
3. admin 계정 로그인
   - 모든 주요 화면에 접근 가능해야 합니다.
   - `/funds`에서 `company_funds`, `fund_transactions` 추가/수정이 가능해야 합니다.
   - `/settlements/monthly`에서 정산 확정 및 지급 완료 처리가 가능해야 합니다.
   - `/settings`에서 `profiles`, `projects`, `expense_categories` 조회가 가능해야 합니다.
4. 첨부파일 흐름 확인
   - employee 또는 admin이 `/expenses/request`에서 파일 첨부 후 제출하면 `expense_attachments` row가 생기고 `expense_requests.evidence_status = attached`로 바뀌어야 합니다.
   - manager/admin은 상세 검토 화면에서 첨부 목록을 볼 수 있어야 합니다.
   - Storage 접근이 실패한다면 테이블 RLS가 아니라 bucket 정책을 먼저 확인해야 합니다.

## 전체 기능 QA 체크리스트

운영 배포 전에는 [app/dev/qa-checklist/page.tsx](C:/Users/user/OneDrive/문서/GitHub/ERUTY_Managing-accounting-settlement/app/dev/qa-checklist/page.tsx) 기준으로 전체 흐름을 다시 확인하는 것을 권장합니다.

- 개발용 체크리스트 페이지 경로: `/dev/qa-checklist`
- 접근 권한: admin만 접근 가능
- 주의: 체크 상태는 브라우저 localStorage에만 저장되며 Supabase에는 저장되지 않습니다.
- 기준: 모든 확인은 mock data가 아닌 실제 Supabase 데이터 기준으로 진행합니다.

### 공통

- 로그인
- 로그아웃
- 권한 없는 페이지 접근 차단
- 새로고침 시 로그인 유지
- 모바일 화면 기본 확인

### employee

- 지출 기안 작성
- 증빙 파일 첨부
- 제출 후 내 지출 내역 표시
- 승인 전 상태 확인
- 반려/수정요청 상태 확인
- 승인 후 정산 예정 반영 확인

### manager

- 승인 대기함 조회
- 직원 요청 상세 확인
- 증빙 파일 확인
- 승인 처리
- 반려 처리
- 수정요청 처리
- 대시보드 반영 확인

### admin

- 직원/프로젝트/경비유형 관리
- 회사 자금 현황 관리
- 프로젝트 예산 확인
- 월말 정산 확정
- 지급 완료 처리
- 회계 자료 CSV 다운로드
- RLS 적용 후 전체 접근 정상 확인

### 에러 케이스

- 필수값 누락
- 잘못된 파일 형식
- 10MB 초과 파일
- 권한 없는 승인 처리
- 예산 초과 승인
- 데이터 0개 EmptyState

## Vercel 배포 방법

1. GitHub 저장소를 Vercel에 Import합니다.
2. Framework Preset은 `Next.js`를 사용합니다.
3. Build Command는 `npm run build`를 사용합니다.
4. Output Directory는 기본값을 사용합니다.
5. Environment Variables에 아래 값을 등록합니다.

```bash
NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-supabase-publishable-key
```

중요:

- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`만 사용합니다.
- `service_role` key는 Vercel에 등록하면 안 됩니다.
- 운영 배포 전에는 `supabase/rls.sql`과 `storage.objects` 정책이 실제 권한 구조와 일치하는지 확인해야 합니다.

## 배포 후 QA 절차

Vercel 배포가 완료되면 아래 순서로 최소 QA를 권장합니다.

1. `/login` 접속 후 employee 계정 로그인
   - 지출 기안 작성
   - 파일 첨부 업로드
   - 내 지출 내역 반영 확인
2. manager 계정 로그인
   - 승인 대기함 조회
   - 상세 검토
   - 승인, 반려, 수정요청 각각 1건씩 확인
   - 대시보드 집계 반영 확인
3. admin 계정 로그인
   - 설정 조회
   - 자금 현황 조회/수정
   - 프로젝트 예산 반영 확인
   - 월말 정산 확정 및 지급 완료 처리 확인
   - 회계 자료 CSV 다운로드 확인
4. 권한 검증
   - employee가 `/approvals/pending`, `/funds`, `/settings`에 접근 불가인지 확인
   - manager가 `/funds`, `/settlements/monthly`, `/accounting/materials`, `/settings`에 접근 불가인지 확인
   - admin이 전체 운영 메뉴에 접근 가능한지 확인
5. EmptyState 및 에러 케이스 확인
   - 데이터가 없는 월/필터에서 mock row 없이 EmptyState가 보이는지 확인
   - 잘못된 파일 형식, 10MB 초과 파일, 필수값 누락 메시지가 자연스럽게 표시되는지 확인

상세 QA 동선은 `/dev/qa-checklist`에서 역할별로 다시 점검할 수 있습니다. 이 개발용 페이지는 운영 메뉴에 노출되지 않습니다.

## 현재 구현된 Supabase 기능 목록

- `profiles`, `projects`, `expense_categories`, `expense_requests`, `expense_attachments` 조회
- Supabase Auth 로그인 / 로그아웃
- 로그인 사용자 기준 `profiles` 조회 및 전역 사용자 상태 관리
- 비로그인 사용자 로그인 페이지 이동
- manager / admin 권한 화면 접근 제어
- 역할별 RLS 정책과 프론트 접근 제한 분리 적용
- 지출 기안 작성 시 `expense_requests` insert
- 관리자 상세 검토 시 `expense_requests` status update
- 증빙 파일 Supabase Storage 업로드
- 업로드 성공 시 `expense_attachments` insert
- 첨부 성공 시 `expense_requests.evidence_status = attached` update
- `company_funds`, `fund_transactions` 조회 및 자금 CRUD
- 대시보드, 프로젝트 예산, 월말 정산, 회계 자료 화면의 실데이터 집계
- 월말 정산 확정 시 `monthly_settlements`, `settlement_items` 저장
- 승인 처리 시 `expense_requests.approved_amount` 저장
- 승인 처리 시 DB trigger 기반 `projects.used_amount`, `remaining_amount`, `budget_status` 재계산
- 승인 처리 시 DB trigger 기반 `project_budget_logs` 저장
- `/dev/supabase-test` 디버그 조회 페이지

## 주요 화면 경로

- 대시보드 `/`
- 로그인 `/login`
- 지출 기안 작성 `/expenses/request`
- 내 지출 내역 `/expenses/history`
- 승인 대기함 `/approvals/pending`
- 지출 상세 검토 `/approvals/pending/[requestNumber]`
- 자금 현황 `/funds`
- 프로젝트 예산 `/projects/budget`
- 월말 정산 `/settlements/monthly`
- 회계 자료 `/accounting/materials`
- 설정 `/settings`

## 배포 전 체크리스트

```bash
npm run lint
npm run build
```

추가 확인:

- `.env.local`이 Git에 포함되지 않았는지 확인
- Vercel 환경변수가 정확히 등록되었는지 확인
- 운영 배포 전 RLS 정책과 Storage 정책을 실제 권한 구조에 맞게 점검
