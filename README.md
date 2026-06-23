# ERUTY 자금관리 시스템

사내 경비 기안, 승인, 정산, 회계 자료 확인 흐름을 위한 Next.js 기반 프론트엔드 UI 프로토타입입니다.

## 프로젝트 개요

- Next.js 16
- TypeScript
- Tailwind CSS
- Supabase 연동 준비 및 일부 실제 조회/저장 연결
- 한국어 관리자형 B2B SaaS UI

현재 프로젝트는 UI 프로토타입 중심이며, 일부 화면은 Supabase 실제 데이터를 조회하거나 저장합니다.

## 현재 구현 상태

다음 흐름은 현재 Supabase와 연결되어 있습니다.

- 지출 기안 작성: `expense_requests` 저장
- 증빙 파일 업로드: Supabase Storage + `expense_attachments` 저장
- 내 지출 내역: Supabase 조회
- 승인 대기함: Supabase 조회
- 지출 상세 검토: Supabase 조회 및 상태 업데이트
- 대시보드: 일부 실제 집계 반영
- 월말 정산: 실제 집계 반영
- 회계 자료: 실제 집계 반영

아래 화면은 아직 mock data 중심 UI입니다.

- 자금 현황
- 프로젝트 예산
- 설정

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

개발 서버 실행 후 아래 주소에서 확인할 수 있습니다.

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

로컬 개발용 파일은 `.env.local`을 사용합니다.

필수 환경변수:

```bash
NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-supabase-publishable-key
```

참고:

- `.env.local`은 `.gitignore`에 포함되어 있어 Git에 커밋되면 안 됩니다.
- `NEXT_PUBLIC_`로 시작하는 값만 프론트와 Vercel에 넣습니다.
- `service_role` key는 절대 프론트엔드 코드나 Vercel 환경변수에 넣으면 안 됩니다.

예시 파일은 [.env.example](C:/Users/user/OneDrive/문서/GitHub/ERUTY_Managing-accounting-settlement/.env.example)에 정리되어 있습니다.

## Supabase 설정

Supabase SQL Editor에서 아래 파일을 순서대로 실행합니다.

1. [supabase/schema.sql](C:/Users/user/OneDrive/문서/GitHub/ERUTY_Managing-accounting-settlement/supabase/schema.sql)
2. [supabase/rls.sql](C:/Users/user/OneDrive/문서/GitHub/ERUTY_Managing-accounting-settlement/supabase/rls.sql)

추가로 Storage에서 아래 버킷을 준비해야 합니다.

- `expense-evidence`

운영 전 주의:

- 현재 개발 편의를 위한 RLS 정책 또는 allow-all 성격의 정책을 사용 중이라면 운영 배포 전에 반드시 실제 권한 정책으로 교체해야 합니다.
- Storage 정책도 운영용 접근 제어 기준으로 다시 점검해야 합니다.

## Vercel 배포 방법

1. GitHub 저장소를 Vercel에 Import 합니다.
2. Framework Preset은 `Next.js`를 사용합니다.
3. Build Command는 `npm run build`를 사용합니다.
4. Output Directory는 기본값을 사용합니다.
5. Environment Variables에 아래 값을 등록합니다.

```bash
NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-supabase-publishable-key
```

중요:

- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`만 넣어야 합니다.
- `service_role` key는 Vercel에 등록하면 안 됩니다.
- 운영 배포 전 RLS 정책을 실제 권한 구조에 맞게 교체해야 합니다.

## 개발 확인용 페이지

- `/dev/supabase-test`

이 페이지는 개발용 Supabase 연결 테스트 화면이며, 사이드바에는 노출하지 않습니다.

## 주요 화면 경로

- 대시보드: `/`
- 지출 기안 작성: `/expenses/request`
- 내 지출 내역: `/expenses/history`
- 승인 대기함: `/approvals/pending`
- 지출 상세 검토: `/approvals/pending/[requestNumber]`
- 자금 현황: `/funds`
- 프로젝트 예산: `/projects/budget`
- 월말 정산: `/settlements/monthly`
- 회계 자료: `/accounting/materials`
- 설정: `/settings`

## GitHub 반영 전 체크

배포 또는 푸시 전 아래 항목을 확인합니다.

```bash
npm run lint
npm run build
```

추가 확인:

- `.env.local`이 Git에 포함되지 않았는지 확인
- Vercel 환경변수가 정확히 등록되었는지 확인
- 운영 전 RLS 정책과 Storage 정책이 실제 권한 기준에 맞는지 확인
