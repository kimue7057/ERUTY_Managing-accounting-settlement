# ERUTY 자금관리 시스템

사내 경비 기안, 승인, 정산, 회계 자료 확인 흐름을 위한 Next.js 기반 UI 프로토타입입니다.  
현재는 Supabase를 연결한 프론트엔드 중심 프로젝트이며, 주요 서비스 화면은 mock fallback 없이 실제 Supabase 데이터만 표시하도록 정리되어 있습니다.

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
  - 임시 employee 기준 `expense_requests` 조회
- 승인 대기함 `/approvals/pending`
  - 전체 `expense_requests` 조회
- 지출 상세 검토 `/approvals/pending/[requestNumber]`
  - 단건 상세 조회
  - 승인 / 반려 / 수정요청 status update
- 프로젝트 예산 `/projects/budget`
  - `projects` + `expense_requests` 기준 실제 집계
  - 예산 배정 전용 테이블은 아직 없어 요청/승인 흐름만 표시
- 월말 정산 `/settlements/monthly`
  - 승인 완료된 개인카드/현금 건 기준 직원별 집계
- 회계 자료 `/accounting/materials`
  - 월별 지출, 직원별 정산, 프로젝트별 지출, 계정과목별 지출 집계
- 설정 `/settings`
  - `profiles`, `projects`, `expense_categories` 실제 조회
  - 저장 기능은 아직 연결 전
- 개발 확인 `/dev/supabase-test`
  - 환경변수, 연결 상태, 테이블 조회 결과 확인
  - 사이드바에는 노출하지 않음

### 연결 전 화면

- 자금 현황 `/funds`
  - 실제 계좌/출납 테이블이 아직 없어 mock 없이 EmptyState 및 안내만 표시

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

예시 파일은 [`.env.example`](C:/Users/user/OneDrive/문서/GitHub/ERUTY_Managing-accounting-settlement/.env.example)에 정리되어 있습니다.

## Supabase 설정

Supabase SQL Editor에서 아래 파일을 순서대로 실행합니다.

1. [supabase/schema.sql](C:/Users/user/OneDrive/문서/GitHub/ERUTY_Managing-accounting-settlement/supabase/schema.sql)
2. [supabase/rls.sql](C:/Users/user/OneDrive/문서/GitHub/ERUTY_Managing-accounting-settlement/supabase/rls.sql)

Storage에서는 아래 bucket을 생성합니다.

- `expense-evidence`

운영 전 주의사항:

- 현재 개발 확인을 위한 RLS 정책이나 allow-all 성격의 정책을 사용 중이라면, 운영 배포 전에 실제 권한 정책으로 교체해야 합니다.
- Storage 정책도 운영 권한 구조에 맞게 별도로 구성해야 합니다.

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
- 운영 배포 전에는 개발용 RLS 정책을 실제 권한 구조에 맞게 반드시 교체해야 합니다.

## 현재 구현된 Supabase 기능 목록

- `profiles`, `projects`, `expense_categories`, `expense_requests`, `expense_attachments` 조회
- 지출 기안 작성 시 `expense_requests` insert
- 관리자 상세 검토 시 `expense_requests` status update
- 증빙 파일 Supabase Storage 업로드
- 업로드 성공 시 `expense_attachments` insert
- 첨부 성공 시 `expense_requests.evidence_status = attached` update
- 대시보드, 프로젝트 예산, 월말 정산, 회계 자료 화면의 실데이터 집계
- `/dev/supabase-test` 디버그 조회 페이지

## 주요 화면 경로

- 대시보드 `/`
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
