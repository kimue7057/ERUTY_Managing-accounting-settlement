# 다른 컴퓨터에서 이어서 작업하기

## 목적

이 문서는 다른 노트북이나 PC에서 `ERUTY 자금관리 시스템` 작업을 바로 이어가기 위한 간단한 작업 가이드입니다.

## 1. 먼저 준비할 것

- Git 설치
- Node.js LTS 설치
- `pnpm` 사용 가능 상태

`pnpm`이 없다면 아래 둘 중 하나로 준비합니다.

```bash
corepack enable
```

또는

```bash
npm install -g pnpm
```

## 2. 저장소 내려받기

```bash
git clone https://github.com/kimue7057/ERUTY_Managing-accounting-settlement.git
cd ERUTY_Managing-accounting-settlement
```

이미 같은 저장소가 있다면 새로 clone 하지 말고 최신 내용만 받으면 됩니다.

```bash
git pull origin main
```

## 3. 패키지 설치

```bash
pnpm install
```

## 4. 개발 서버 실행

```bash
pnpm dev
```

브라우저에서 아래 주소로 확인합니다.

- [http://127.0.0.1:3000](http://127.0.0.1:3000)

## 5. 자주 쓰는 검증 명령

```bash
pnpm lint
pnpm build
```

## 6. 현재 프로젝트 구조에서 주로 보는 위치

- `app/`
  - 각 화면 페이지 라우트
- `components/`
  - 공통 UI와 화면별 컴포넌트
- `data/mockData.ts`
  - mock data 모음
- `types/index.ts`
  - 공통 타입 정의
- `utils/format.ts`
  - 금액/숫자 포맷 유틸
- `stores/approvalQueueStore.ts`
  - 승인 대기함 mock 상태 저장

## 7. 화면 라우트 참고

- `/` 대시보드
- `/expenses/request` 지출 기안 작성
- `/expenses/history` 내 지출 내역
- `/approvals/pending` 승인 대기함
- `/approvals/pending/[requestNumber]` 지출 상세 검토
- `/funds` 회사 자금 현황
- `/projects/budget` 프로젝트 예산
- `/settlements/monthly` 월말 정산
- `/accounting/materials` 회계 자료
- `/settings` 설정

## 8. 작업 이어갈 때 추천 순서

1. `git pull origin main` 으로 최신 내용 받기
2. `pnpm install` 필요 시 다시 실행
3. `pnpm dev` 로 화면 확인
4. 수정 후 `pnpm lint`
5. 필요하면 `pnpm build`
6. 커밋 후 `git push origin main` 또는 작업 브랜치 푸시

## 9. Git 반영 예시

바로 `main`에 올릴 경우:

```bash
git add -A
git commit -m "작업 내용 요약"
git push origin main
```

브랜치로 작업할 경우:

```bash
git checkout -b feature/your-change
git add -A
git commit -m "작업 내용 요약"
git push -u origin feature/your-change
```

## 10. 현재 프로젝트 특성

- 이 프로젝트는 현재 mock data 기반 UI 프로토타입입니다.
- 실제 API, DB, 로그인, 파일 업로드, 엑셀 다운로드는 아직 연결되어 있지 않습니다.
- 일부 버튼은 실제 저장 대신 안내용 `alert` 로 동작합니다.

## 11. Windows 환경에서 참고할 점

- 개발 서버가 켜진 상태에서 빌드를 반복하면 `.next` 폴더가 잠기는 경우가 있을 수 있습니다.
- 이럴 때는 개발 서버를 먼저 종료한 뒤 다시 `pnpm build` 를 실행하는 것이 안전합니다.
- OneDrive 동기화 폴더 안에서 작업 중이라면, 파일 잠금이 심할 때 잠시 동기화를 멈추고 작업하는 편이 안정적일 수 있습니다.

## 12. 다음 작업자가 바로 이해하면 좋은 포인트

- 전체 디자인 톤은 흰색/회색 기반의 B2B SaaS 관리자 화면입니다.
- 금액 표기는 `utils/format.ts` 기준으로 맞추고 있습니다.
- 상태 배지는 `components/common/StatusBadge.tsx` 기준으로 통일하고 있습니다.
- 빈 데이터 영역은 `components/common/EmptyState.tsx` 를 우선 사용합니다.
