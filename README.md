# ERUTY 자금관리 시스템

## 프로젝트 소개

ERUTY 자금관리 시스템은 사내 자금 사용 기안, 승인, 정산, 회계 자료 전달 흐름을 한 화면에서 점검할 수 있도록 만든 B2B SaaS 스타일의 관리자용 프론트엔드 UI 프로토타입입니다.

- `Next.js`
- `TypeScript`
- `Tailwind CSS`
- 한국어 UI
- mock data 기반 데스크톱 중심 관리자 화면

## 실행 방법

```bash
pnpm install
pnpm dev
```

개발 서버 실행 후 아래 주소에서 확인할 수 있습니다.

- [http://127.0.0.1:3000](http://127.0.0.1:3000)

추가 검증 명령:

```bash
pnpm lint
pnpm build
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

## 추후 연동 예정 기능

- DB 연동
- 백엔드 API 연동
- 로그인 및 권한 인증
- 실제 파일 업로드 및 증빙 관리
- 엑셀 다운로드
- 회계 마감 처리
- 회계 전표 생성
- 월말 정산 확정 및 지급 처리 자동화
