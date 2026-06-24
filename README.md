# ERUTY 자금관리 시스템

사내 경비 기안, 승인, 정산, 회계 자료, 자금 현황을 관리하기 위한 Next.js 기반 프론트엔드 프로젝트입니다.

현재 프로젝트는 Supabase와 연결된 UI 프로토타입이며, 주요 서비스 화면은 mock fallback 없이 실제 Supabase 데이터를 기준으로 동작합니다.

## 프로젝트 개요

- Next.js 16
- TypeScript
- Tailwind CSS
- Supabase Auth
- Supabase Database
- Supabase Storage

## 현재 구현 범위

### 공통

- 로그인 / 로그아웃
- 역할 기반 화면 접근 제어
- 권한 없는 화면 접근 차단
- EmptyState 및 오류 메시지 표시

### 화면별 구현 기능

- 대시보드 `/`
  - 실제 `expense_requests`, `projects`, `monthly_settlements`, `company_funds` 기준 집계
- 지출 기안 작성 `/expenses/request`
  - `projects`, `expense_categories` 조회
  - `expense_requests` 실제 저장
  - 증빙 파일 업로드
  - `expense_attachments` 저장
  - 첨부 성공 시 `expense_requests.evidence_status` 갱신
- 내 지출 내역 `/expenses/history`
  - 로그인 사용자 본인 지출 요청 조회
  - 상태 / 유형 / 검색 필터
- 승인 대기함 `/approvals/pending`
  - 관리자용 전체 지출 요청 조회
- 지출 상세 검토 `/approvals/pending/[requestNumber]`
  - 단건 상세 조회
  - 승인 / 반려 / 수정요청 처리
  - 승인 금액 및 메모 저장
- 회사 자금 현황 `/funds`
  - `company_funds`, `fund_transactions` 기반 조회
  - 자금 항목 추가 / 수정 / 비활성화
  - 입금 / 출금 / 조정 내역 반영
- 프로젝트 예산 `/projects/budget`
  - `projects` 예산 컬럼 기반 조회
  - 승인 완료 지출 반영
  - `project_budget_logs` 기준 예산 차감 이력 관리
- 월말 정산 `/settlements/monthly`
  - 승인 완료된 개인카드 / 현금 지출 집계
  - `monthly_settlements`, `settlement_items` 저장
  - 정산 확정 / 지급 완료 처리
- 회계 자료 `/accounting/materials`
  - 월별 지출 / 정산 / 프로젝트 / 경비유형 / 증빙 누락 / 반려 목록 집계
  - CSV 다운로드
- 설정 `/settings`
  - `profiles`, `projects`, `expense_categories` 조회 기반 관리 UI

### 개발용 페이지

- `/dev/supabase-test`
  - Supabase 환경변수 및 테이블 조회 확인용
- `/dev/qa-checklist`
  - 배포 전 QA 체크리스트

개발용 페이지는 유지되지만 운영 사이드바에는 노출되지 않습니다.

## mock data 사용 상태

- `data/mockData.ts` 파일은 저장소에 남아 있을 수 있으나, 주요 서비스 화면에서는 사용하지 않습니다.
- 데이터가 없으면 mock row 대신 EmptyState가 표시됩니다.
- Supabase 조회 실패 시 mock fallback 대신 오류 메시지를 표시합니다.

## 실행 방법

### npm

```bash
npm install
npm run dev
```

### pnpm

```bash
pnpm install
pnpm dev
```

브라우저에서 아래 주소로 접속합니다.

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

## 필수 환경변수

로컬 개발에서는 `.env.local` 파일을 사용합니다.

```bash
NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-supabase-publishable-key
```

주의사항:

- `.env.local`은 커밋하지 않습니다.
- `service_role` key는 프론트엔드 코드나 Vercel 환경변수에 넣지 않습니다.
- Vercel에는 아래 두 값만 등록합니다.
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

예시 파일은 `.env.example`에 정리되어 있습니다.

## Supabase 테이블 목록

현재 프로젝트에서 사용하는 주요 테이블:

- `profiles`
- `projects`
- `expense_categories`
- `expense_requests`
- `expense_attachments`
- `monthly_settlements`
- `settlement_items`
- `company_funds`
- `fund_transactions`
- `project_budget_logs`

인증 기준:

- `auth.users`
- `profiles.id = auth.users.id`

## Supabase Storage bucket

사용 bucket:

- `expense-evidence`

권장 설정:

- 파일 경로: `expense-requests/{expense_request_id}/{timestamp}-{fileName}`
- 허용 형식: `jpg`, `jpeg`, `png`, `pdf`
- 파일 크기 제한: 10MB

## Supabase SQL 적용 순서

Supabase SQL Editor에서 아래 순서대로 실행합니다.

1. `supabase/schema.sql`
2. `supabase/monthly_settlements.sql`
3. `supabase/company_funds.sql`
4. `supabase/project_budgets.sql`
5. `supabase/auth_profiles.sql`
6. `supabase/rls.sql`

추가 안내:

- `monthly_settlements.sql`, `company_funds.sql`, `project_budgets.sql`을 다시 실행했다면 마지막에 `supabase/rls.sql`도 다시 실행해 정책 상태를 맞추는 것을 권장합니다.
- Storage 권한은 테이블 RLS와 별개이므로 `storage.objects` 정책도 함께 확인해야 합니다.

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

- `service_role` key는 절대 등록하지 않습니다.
- 운영 배포 전 `supabase/rls.sql`과 Storage 정책이 실제 권한 구조에 맞는지 확인해야 합니다.

## 배포 후 QA 절차

### 공통

1. `/login` 접속
2. 로그인 / 로그아웃 확인
3. 새로고침 후 세션 유지 확인
4. 권한 없는 페이지 접근 차단 확인
5. 모바일 화면 기본 확인

### employee

1. 지출 기안 작성
2. 증빙 파일 첨부
3. 제출 후 내 지출 내역 반영 확인
4. 승인 전 상태 확인
5. 반려 / 수정요청 상태 확인
6. 승인 후 정산 대상 반영 확인

### manager

1. 승인 대기함 조회
2. 지출 상세 검토 진입
3. 증빙 파일 확인
4. 승인 처리
5. 반려 처리
6. 수정요청 처리
7. 대시보드 반영 확인

### admin

1. 설정 화면 조회
2. 회사 자금 현황 조회 / 수정
3. 프로젝트 예산 반영 확인
4. 월말 정산 확정
5. 지급 완료 처리
6. 회계 자료 CSV 다운로드
7. 전체 권한 접근 정상 여부 확인

### 에러 / 예외 케이스

1. 필수값 누락
2. 잘못된 파일 형식 업로드
3. 10MB 초과 파일 업로드
4. 권한 없는 승인 처리 시도
5. 예산 초과 승인 경고 확인
6. 데이터 0건 시 EmptyState 표시 확인

상세 QA 흐름은 `/dev/qa-checklist`에서 역할별로 다시 점검할 수 있습니다.

## 운영 배포 전 체크

```bash
npm run lint
npm run build
```

최종 확인 항목:

- `.env.local`이 Git에 포함되지 않았는지 확인
- Vercel 환경변수가 정확히 등록되었는지 확인
- 주요 서비스 화면에 mock fallback이 남아 있지 않은지 확인
- Supabase RLS 및 Storage 정책이 운영 권한 구조와 맞는지 확인
