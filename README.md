# ERUTY 자금관리 시스템

사내 경비 기안·승인·정산 관리 UI 프로토타입

## 프로젝트 소개

ERUTY 자금관리 시스템은 사내 경비 기안, 승인, 정산, 회계 자료 전달 흐름을 한 화면에서 점검할 수 있도록 만든 B2B SaaS 스타일의 프론트엔드 UI 프로토타입입니다.

- `Next.js`
- `TypeScript`
- `Tailwind CSS`
- 한국어 UI
- mock data 기반 데스크톱 중심 관리자 화면

## 실행 방법

### pnpm 기준

```bash
pnpm install
pnpm dev
```

### npm 기준

```bash
npm install
npm run dev
```

개발 서버 실행 후 아래 주소에서 확인할 수 있습니다.

- [http://127.0.0.1:3000](http://127.0.0.1:3000)

검증 및 프로덕션 실행 명령:

```bash
pnpm lint
pnpm build
pnpm start
```

또는

```bash
npm run lint
npm run build
npm run start
```

## 다른 컴퓨터에서 이어서 작업하기

다른 노트북이나 PC에서도 바로 이어서 작업할 수 있도록 별도 안내 문서를 추가했습니다.

- 작업 가이드: [docs/WORKING_ON_ANOTHER_COMPUTER.md](docs/WORKING_ON_ANOTHER_COMPUTER.md)

기본 흐름만 먼저 보면:

```bash
git clone https://github.com/kimue7057/ERUTY_Managing-accounting-settlement.git
cd ERUTY_Managing-accounting-settlement
pnpm install
pnpm dev
```

## 배포 방법

### GitHub 업로드

```bash
git add -A
git commit -m "작업 내용 요약"
git push origin main
```

### Vercel 배포

1. GitHub 저장소를 Vercel에 Import 합니다.
2. Framework Preset은 `Next.js`로 자동 감지되면 그대로 사용합니다.
3. 현재 저장소에는 `pnpm-lock.yaml`이 있으므로 Vercel은 `pnpm` 기반으로 설치/빌드를 진행하면 됩니다.
4. 별도 환경 변수는 현재 mock data UI 프로토타입 기준으로 필요하지 않습니다.
5. 배포 후 기본 라우트와 주요 화면이 정상 표시되는지 확인합니다.

현재 프로젝트는 Next.js 표준 구조를 따르고 있어, 추가 커스텀 서버나 API 설정 없이 Vercel에 바로 배포할 수 있는 상태를 목표로 정리했습니다.

## 구현된 화면 목록

- `대시보드` `/`
- `지출 기안 작성` `/expenses/request`
- `내 지출 내역` `/expenses/history`
- `승인 대기함` `/approvals/pending`
- `지출 상세 검토` `/approvals/pending/[requestNumber]`
- `회사 자금 현황` `/funds`
- `프로젝트 예산` `/projects/budget`
- `월말 정산` `/settlements/monthly`
- `회계 자료` `/accounting/materials`
- `설정` `/settings`

## 현재 상태

현재 프로젝트는 mock data 기반 UI 프로토타입입니다.

- 실제 DB 저장은 연결되어 있지 않습니다.
- 실제 API 호출은 하지 않습니다.
- 승인, 정산, 다운로드, 저장 버튼은 React state 또는 안내용 alert 중심으로 동작합니다.
- 증빙 파일 미리보기와 회계 처리 결과는 목업 데이터로 표현됩니다.
- 실제 금융 데이터나 회계 데이터는 모두 연동되어 있지 않습니다.

## 추후 연동 예정 기능

- DB 연동
- 백엔드 API 연동
- 로그인 및 권한 인증
- 실제 파일 업로드 및 증빙 관리
- 엑셀 다운로드
- 회계 마감 처리
- 회계 전표 생성
- 월말 정산 확정 및 지급 처리 자동화
