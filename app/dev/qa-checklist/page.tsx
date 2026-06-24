"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useMemo, useSyncExternalStore } from "react";
import {
  CheckCheck,
  ClipboardCheck,
  Database,
  FileCheck2,
  FolderKanban,
  Landmark,
  LogIn,
  ReceiptText,
  RefreshCw,
  ShieldCheck,
  WalletCards,
} from "lucide-react";

import { useAuth } from "@/components/auth/AuthProvider";
import { PageHeader } from "@/components/common/PageHeader";
import { StatCard } from "@/components/common/StatCard";
import type { RoleView } from "@/types";
import { mapAuthRoleLabel } from "@/utils/auth";

type QaSectionKey =
  | "foundation"
  | "expense-request"
  | "attachments"
  | "approvals"
  | "funds"
  | "project-budget"
  | "settlements"
  | "accounting"
  | "auth"
  | "deployment";

type QaItem = {
  id: string;
  title: string;
  description: string;
  expected: string;
  routes?: string[];
};

type QaSection = {
  key: QaSectionKey;
  title: string;
  description: string;
  icon: ReactNode;
  accentClassName: string;
  items: QaItem[];
};

type QaChecklistState = {
  checkedMap: Record<string, boolean>;
  updatedAt: string | null;
};

const roleViews: RoleView[] = ["직원 보기", "관리자 보기", "대표 보기"];
const qaChecklistStorageKey = "eruty-qa-checklist-v2";
const qaChecklistChangeEventName = "eruty-qa-checklist-change";

const qaSections: QaSection[] = [
  {
    key: "foundation",
    title: "1. 기초 데이터",
    description: "Supabase 기본 마스터 데이터가 실제 화면의 선택지와 관계 표시 기준으로 정상 동작하는지 점검합니다.",
    icon: <Database className="h-5 w-5" strokeWidth={1.9} />,
    accentClassName: "border-slate-200 bg-slate-50 text-slate-700",
    items: [
      {
        id: "foundation-profiles",
        title: "직원 데이터가 profiles에 존재한다",
        description: "설정 화면 또는 Supabase Table Editor에서 직원 프로필이 실제로 조회되는지 확인합니다.",
        expected: "profiles 테이블에 직원 데이터가 있고, 화면에서 이름과 부서가 정상 표시됩니다.",
        routes: ["/settings", "/dev/supabase-test"],
      },
      {
        id: "foundation-projects",
        title: "프로젝트 데이터가 projects에 존재한다",
        description: "프로젝트 목록이 설정 화면과 기안 작성 선택지에 실제 데이터로 노출되는지 확인합니다.",
        expected: "projects 테이블 데이터가 프로젝트 화면과 선택지에 동일하게 표시됩니다.",
        routes: ["/settings", "/projects/budget", "/expenses/request"],
      },
      {
        id: "foundation-categories",
        title: "경비 유형 데이터가 expense_categories에 존재한다",
        description: "경비 유형 관리와 기안 작성 화면의 경비 유형 선택지가 같은 기준으로 노출되는지 확인합니다.",
        expected: "expense_categories 테이블의 활성 데이터만 신규 선택지에 표시됩니다.",
        routes: ["/settings", "/expenses/request"],
      },
      {
        id: "foundation-inactive-filter",
        title: "inactive 데이터는 신규 선택지에서 제외된다",
        description: "비활성 프로젝트/경비 유형을 만든 뒤 신규 기안 작성 선택지에서 제외되는지 확인합니다.",
        expected: "inactive 항목은 신규 선택지에서 보이지 않지만, 기존 내역 화면에서는 이름이 유지됩니다.",
        routes: ["/expenses/request", "/expenses/history", "/approvals/pending"],
      },
    ],
  },
  {
    key: "expense-request",
    title: "2. 지출 기안",
    description: "직원이 실제 경비 요청을 제출하고, 제출 결과가 내역 화면에 반영되는지 확인합니다.",
    icon: <ReceiptText className="h-5 w-5" strokeWidth={1.9} />,
    accentClassName: "border-sky-200 bg-sky-50 text-sky-700",
    items: [
      {
        id: "expense-required-validation",
        title: "필수값 누락 시 오류 표시",
        description: "제목, 프로젝트, 경비 유형, 사용일, 금액 등 필수값을 비우고 제출을 시도합니다.",
        expected: "폼에서 필수 입력 오류가 표시되고 expense_requests insert가 실행되지 않습니다.",
        routes: ["/expenses/request"],
      },
      {
        id: "expense-insert-success",
        title: "정상 제출 시 expense_requests row 생성",
        description: "정상 입력값으로 승인 요청을 제출하고 Supabase Table Editor 또는 테스트 화면에서 row 생성 여부를 확인합니다.",
        expected: "expense_requests에 새 row가 생성되고 요청번호가 화면에 표시됩니다.",
        routes: ["/expenses/request", "/dev/supabase-test"],
      },
      {
        id: "expense-history-sync",
        title: "제출 후 내 지출 내역에 표시",
        description: "방금 제출한 요청이 최신순으로 내 지출 내역 화면에 보이는지 확인합니다.",
        expected: "요청번호, 상태, 금액, 사용처가 동일하게 내 지출 내역에 표시됩니다.",
        routes: ["/expenses/history"],
      },
      {
        id: "expense-personal-settlement",
        title: "개인카드/현금은 정산 요청 대상",
        description: "개인카드 또는 현금 결제수단으로 기안 작성 시 정산 요청 흐름이 자연스럽게 연결되는지 확인합니다.",
        expected: "개인카드/현금 선택 시 정산 요청 여부가 정상 반영되고 이후 정산 집계 대상이 됩니다.",
        routes: ["/expenses/request", "/expenses/history", "/settlements/monthly"],
      },
      {
        id: "expense-corporate-settlement",
        title: "법인카드는 정산 요청 제외 가능",
        description: "법인카드 결제수단으로 기안 작성 시 정산 제외 선택이 가능한지 확인합니다.",
        expected: "법인카드 요청은 정산 대상 아님으로 분류되고 직원 지급 집계에서 제외됩니다.",
        routes: ["/expenses/request", "/settlements/monthly", "/accounting/materials"],
      },
    ],
  },
  {
    key: "attachments",
    title: "3. 증빙 첨부",
    description: "증빙 파일 업로드와 evidence 상태 반영 흐름이 실제 Storage/DB 기준으로 동작하는지 확인합니다.",
    icon: <FileCheck2 className="h-5 w-5" strokeWidth={1.9} />,
    accentClassName: "border-emerald-200 bg-emerald-50 text-emerald-700",
    items: [
      {
        id: "attachment-allowed-upload",
        title: "허용 파일 업로드 성공",
        description: "jpg, jpeg, png, pdf 파일을 첨부하고 요청을 제출합니다.",
        expected: "허용 파일은 업로드 성공 메시지가 표시되고 Storage에 저장됩니다.",
        routes: ["/expenses/request"],
      },
      {
        id: "attachment-size-limit",
        title: "10MB 초과 파일 제한",
        description: "10MB를 초과하는 파일을 선택해 첨부 제한이 걸리는지 확인합니다.",
        expected: "제출 전 파일 크기 제한 안내가 표시되고 업로드 대상에 포함되지 않습니다.",
        routes: ["/expenses/request"],
      },
      {
        id: "attachment-file-type-limit",
        title: "허용되지 않는 파일 형식 제한",
        description: "exe, zip, docx 등 허용되지 않는 형식의 파일을 첨부해봅니다.",
        expected: "허용되지 않는 파일 형식 안내가 표시되고 첨부가 차단됩니다.",
        routes: ["/expenses/request"],
      },
      {
        id: "attachment-row-created",
        title: "expense_attachments row 생성",
        description: "파일 첨부 후 제출한 요청에 대해 expense_attachments 테이블 row 생성 여부를 확인합니다.",
        expected: "expense_request_id, file_type, file_name, file_path가 실제 DB에 저장됩니다.",
        routes: ["/approvals/pending", "/dev/supabase-test"],
      },
      {
        id: "attachment-evidence-status",
        title: "evidence_status = attached 반영",
        description: "첨부가 있는 요청의 evidence_status가 attached로 저장되고 화면에도 반영되는지 확인합니다.",
        expected: "내 지출 내역, 승인 대기함, 회계 자료 화면에 증빙 상태가 첨부완료 또는 확인완료로 표시됩니다.",
        routes: ["/expenses/history", "/approvals/pending", "/accounting/materials"],
      },
    ],
  },
  {
    key: "approvals",
    title: "4. 승인 처리",
    description: "관리자 검토에서 상태 변경과 메모 저장, 집계 반영이 제대로 되는지 확인합니다.",
    icon: <ClipboardCheck className="h-5 w-5" strokeWidth={1.9} />,
    accentClassName: "border-amber-200 bg-amber-50 text-amber-700",
    items: [
      {
        id: "approval-approved",
        title: "승인 시 status = approved",
        description: "승인 대기함 상세 검토 화면에서 승인 처리 후 상태 반영을 확인합니다.",
        expected: "expense_requests.status가 approved로 바뀌고 승인일과 승인금액이 저장됩니다.",
        routes: ["/approvals/pending"],
      },
      {
        id: "approval-rejected",
        title: "반려 시 status = rejected",
        description: "관리자 메모를 입력하고 반려 처리한 뒤 직원 화면에서 반영 여부를 확인합니다.",
        expected: "status가 rejected로 저장되고 내 지출 내역에도 반려 상태가 표시됩니다.",
        routes: ["/approvals/pending", "/expenses/history"],
      },
      {
        id: "approval-revision",
        title: "수정요청 시 status = revision_requested",
        description: "수정요청 처리 후 상태값과 메모 저장 여부를 확인합니다.",
        expected: "status가 revision_requested로 저장되고 직원 화면에서 수정요청 상태가 보입니다.",
        routes: ["/approvals/pending", "/expenses/history"],
      },
      {
        id: "approval-admin-memo",
        title: "관리자 메모 저장",
        description: "반려 또는 수정요청 시 입력한 메모가 상세 검토 화면에 다시 보이는지 확인합니다.",
        expected: "관리자 메모가 reject_reason 또는 메모 영역에 저장되어 재조회됩니다.",
        routes: ["/approvals/pending"],
      },
      {
        id: "approval-dashboard-sync",
        title: "승인 후 대시보드 반영",
        description: "승인 또는 반려 후 대시보드 요약 카드와 최근 목록 반영 여부를 확인합니다.",
        expected: "승인대기 건수, 최근 지출 기안 목록, 프로젝트/경비 유형 집계가 최신 데이터 기준으로 갱신됩니다.",
        routes: ["/", "/approvals/pending"],
      },
    ],
  },
  {
    key: "funds",
    title: "5. 자금 현황",
    description: "회사 자금 항목과 입출금 거래가 잔액 및 가용 자금 계산과 일관되게 연결되는지 확인합니다.",
    icon: <Landmark className="h-5 w-5" strokeWidth={1.9} />,
    accentClassName: "border-indigo-200 bg-indigo-50 text-indigo-700",
    items: [
      {
        id: "funds-create",
        title: "자금 항목 추가 가능",
        description: "새 자금 항목을 추가하고 목록 카드에 즉시 반영되는지 확인합니다.",
        expected: "company_funds에 row가 생성되고 자금 현황 화면 카드에 새 항목이 나타납니다.",
        routes: ["/funds"],
      },
      {
        id: "funds-deposit-balance",
        title: "입금 거래 시 잔액 증가",
        description: "입금 거래를 추가한 뒤 해당 자금 항목 잔액이 증가하는지 확인합니다.",
        expected: "fund_transactions 저장 후 current_balance가 증가하고 최근 거래 내역에도 표시됩니다.",
        routes: ["/funds"],
      },
      {
        id: "funds-withdrawal-balance",
        title: "출금 거래 시 잔액 감소",
        description: "출금 거래를 추가한 뒤 해당 자금 항목 잔액이 감소하는지 확인합니다.",
        expected: "fund_transactions 저장 후 current_balance가 감소하고 거래 후 잔액이 일치합니다.",
        routes: ["/funds"],
      },
      {
        id: "funds-total-balance",
        title: "총 보유 자금 계산 정상",
        description: "active 자금 항목들의 잔액 합계가 상단 총 보유 자금 카드와 일치하는지 확인합니다.",
        expected: "inactive 자금은 제외되고 active current_balance 합계만 총 보유 자금으로 집계됩니다.",
        routes: ["/funds", "/"],
      },
      {
        id: "funds-available-balance",
        title: "실질 가용 자금 계산 정상",
        description: "승인 지출 예정액과 정산 예정액을 차감한 값이 실질 가용 자금 카드와 맞는지 확인합니다.",
        expected: "총 보유 자금 - 승인 지출 예정액 - 직원 정산 예정액 계산이 자금 현황과 대시보드에서 동일합니다.",
        routes: ["/funds", "/"],
      },
    ],
  },
  {
    key: "project-budget",
    title: "6. 프로젝트 예산",
    description: "프로젝트 예산 입력과 승인 시 예산 차감 로직이 정상 반영되는지 확인합니다.",
    icon: <FolderKanban className="h-5 w-5" strokeWidth={1.9} />,
    accentClassName: "border-cyan-200 bg-cyan-50 text-cyan-700",
    items: [
      {
        id: "budget-input",
        title: "프로젝트 예산 입력 가능",
        description: "프로젝트 관리 또는 예산 화면에서 총 예산 값을 입력/수정합니다.",
        expected: "projects.budget_amount가 저장되고 프로젝트 예산 화면에 표시됩니다.",
        routes: ["/settings", "/projects/budget"],
      },
      {
        id: "budget-used-amount",
        title: "승인 시 used_amount 증가",
        description: "프로젝트가 연결된 지출 요청을 승인한 뒤 예산 사용액 증가 여부를 확인합니다.",
        expected: "approved 상태가 되면 프로젝트 used_amount가 증가하고 대시보드 집계에도 반영됩니다.",
        routes: ["/approvals/pending", "/projects/budget", "/"],
      },
      {
        id: "budget-remaining-amount",
        title: "remaining_amount 감소",
        description: "승인 후 프로젝트 잔여 예산이 자동 감소하는지 확인합니다.",
        expected: "remaining_amount = budget_amount - used_amount 기준으로 일관되게 갱신됩니다.",
        routes: ["/projects/budget"],
      },
      {
        id: "budget-overrun-warning",
        title: "예산 초과 시 경고 표시",
        description: "잔여 예산보다 큰 지출 승인 시 경고 문구가 보이는지 확인합니다.",
        expected: "승인 전에 예산 초과 경고가 표시되고 사용자가 확인해야만 승인이 진행됩니다.",
        routes: ["/approvals/pending"],
      },
      {
        id: "budget-duplicate-protection",
        title: "중복 승인 시 중복 차감 방지",
        description: "이미 approved 처리된 요청을 다시 승인해도 예산이 한 번만 반영되는지 확인합니다.",
        expected: "project_budget_logs 중복 방지 기준으로 used_amount가 두 번 차감되지 않습니다.",
        routes: ["/approvals/pending", "/projects/budget"],
      },
    ],
  },
  {
    key: "settlements",
    title: "7. 월말 정산",
    description: "승인된 개인 선지출이 정산 대상으로 잘 묶이고, 정산 확정과 지급 완료가 이어지는지 확인합니다.",
    icon: <WalletCards className="h-5 w-5" strokeWidth={1.9} />,
    accentClassName: "border-purple-200 bg-purple-50 text-purple-700",
    items: [
      {
        id: "settlement-target-filter",
        title: "승인된 개인카드/현금만 정산 대상",
        description: "approved + settlement_requested + 개인카드/현금 건만 정산 집계에 포함되는지 확인합니다.",
        expected: "개인 선지출 승인건만 직원별 정산 예정액으로 집계됩니다.",
        routes: ["/settlements/monthly", "/expenses/history"],
      },
      {
        id: "settlement-corporate-excluded",
        title: "법인카드 제외",
        description: "법인카드 승인 건이 월말 정산 직원 지급액에 포함되지 않는지 확인합니다.",
        expected: "법인카드 사용 건은 직원 지급 대상에서 제외됩니다.",
        routes: ["/settlements/monthly", "/accounting/materials"],
      },
      {
        id: "settlement-missing-proof-hold",
        title: "증빙 미첨부는 보류 처리",
        description: "증빙이 없는 승인 건이 보류 금액으로 분리되는지 확인합니다.",
        expected: "미첨부 승인건은 지급 예정액이 아니라 보류 금액으로 집계됩니다.",
        routes: ["/settlements/monthly", "/accounting/materials"],
      },
      {
        id: "settlement-confirm",
        title: "정산 확정 가능",
        description: "선택 월 기준 정산 확정 버튼으로 monthly_settlements와 settlement_items 생성 여부를 확인합니다.",
        expected: "정산 확정 후 confirmed 상태로 저장되고 중복 확정이 방지됩니다.",
        routes: ["/settlements/monthly"],
      },
      {
        id: "settlement-paid",
        title: "지급 완료 처리 가능",
        description: "confirmed 상태 정산을 paid로 변경하고 지급 완료일 반영 여부를 확인합니다.",
        expected: "monthly_settlements.status = paid, paid_at 저장 후 회계 자료 화면에도 지급 상태가 반영됩니다.",
        routes: ["/settlements/monthly", "/accounting/materials"],
      },
    ],
  },
  {
    key: "accounting",
    title: "8. 회계 자료",
    description: "월별 회계 자료 집계와 CSV 내보내기 기준이 실제 데이터와 맞는지 확인합니다.",
    icon: <FileCheck2 className="h-5 w-5" strokeWidth={1.9} />,
    accentClassName: "border-rose-200 bg-rose-50 text-rose-700",
    items: [
      {
        id: "accounting-monthly-expenses",
        title: "월별 지출 조회 정상",
        description: "선택 월 기준 expense_requests가 전체 지출 내역 탭에 정상 조회되는지 확인합니다.",
        expected: "요청번호, 직원명, 프로젝트, 경비유형, 증빙상태가 실제 DB 값과 일치합니다.",
        routes: ["/accounting/materials"],
      },
      {
        id: "accounting-employee-settlements",
        title: "직원별 정산 내역 표시",
        description: "직원별 승인 금액, 정산 예정액, 지급 상태가 monthly_settlements 기준으로 보이는지 확인합니다.",
        expected: "월말 정산 화면 집계와 회계 자료 화면의 직원별 정산 내역이 일치합니다.",
        routes: ["/accounting/materials", "/settlements/monthly"],
      },
      {
        id: "accounting-project-expenses",
        title: "프로젝트별 지출 표시",
        description: "프로젝트별 지출 내역과 총액/건수가 실제 expense_requests 기준으로 집계되는지 확인합니다.",
        expected: "프로젝트 예산 화면과 회계 자료 프로젝트 탭의 금액 흐름이 일관됩니다.",
        routes: ["/accounting/materials", "/projects/budget"],
      },
      {
        id: "accounting-category-expenses",
        title: "경비 유형별 지출 표시",
        description: "expense_categories 기준 합계가 경비 유형별 지출 내역 탭에 정상 표시되는지 확인합니다.",
        expected: "경비 유형별 총액과 증빙 완료율이 실제 데이터 기준으로 계산됩니다.",
        routes: ["/accounting/materials"],
      },
      {
        id: "accounting-missing-proofs",
        title: "증빙 누락 목록 표시",
        description: "evidence_status가 none이거나 실제 첨부가 없는 요청이 누락 목록에 나타나는지 확인합니다.",
        expected: "증빙 누락 목록에 해당 요청이 빠짐없이 노출되고 상태 배지가 일관되게 보입니다.",
        routes: ["/accounting/materials"],
      },
    ],
  },
  {
    key: "auth",
    title: "9. 권한/로그인",
    description: "로그인, 로그아웃, 권한 제한, 새로고침 유지까지 실제 사용자 흐름 기준으로 확인합니다.",
    icon: <LogIn className="h-5 w-5" strokeWidth={1.9} />,
    accentClassName: "border-teal-200 bg-teal-50 text-teal-700",
    items: [
      {
        id: "auth-login",
        title: "로그인 정상 동작",
        description: "employee, manager, admin 계정으로 각각 로그인합니다.",
        expected: "로그인 성공 후 해당 역할에 맞는 화면과 메뉴만 표시됩니다.",
        routes: ["/login", "/"],
      },
      {
        id: "auth-logout",
        title: "로그아웃 정상 동작",
        description: "로그아웃 후 보호된 화면 접근이 차단되는지 확인합니다.",
        expected: "로그아웃 시 로그인 페이지로 이동하고 세션이 정리됩니다.",
        routes: ["/login"],
      },
      {
        id: "auth-role-guard",
        title: "권한 없는 페이지 접근 차단",
        description: "employee로 승인 대기함, 설정, 자금 현황 등에 직접 접근해봅니다.",
        expected: "접근 권한이 없습니다 안내가 표시되고 데이터가 노출되지 않습니다.",
        routes: ["/approvals/pending", "/funds", "/settings"],
      },
      {
        id: "auth-session-refresh",
        title: "새로고침 시 로그인 유지",
        description: "로그인 후 주요 화면에서 새로고침 또는 직접 URL 접근을 수행합니다.",
        expected: "세션이 유지되고 같은 계정 기준으로 화면이 다시 로드됩니다.",
        routes: ["/", "/expenses/history", "/approvals/pending"],
      },
    ],
  },
  {
    key: "deployment",
    title: "10. 배포 확인",
    description: "운영 배포 URL에서 환경변수, 새로고침, 실제 Supabase 데이터 표시까지 점검합니다.",
    icon: <ShieldCheck className="h-5 w-5" strokeWidth={1.9} />,
    accentClassName: "border-orange-200 bg-orange-50 text-orange-700",
    items: [
      {
        id: "deploy-vercel-url",
        title: "Vercel URL 접속 정상",
        description: "배포된 운영 URL이 열리고 기본 레이아웃이 깨지지 않는지 확인합니다.",
        expected: "로그인 페이지 또는 홈 화면이 정상 렌더링되고 콘솔 치명 오류가 없습니다.",
      },
      {
        id: "deploy-env-vars",
        title: "환경변수 누락 없음",
        description: "배포 환경에서 NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY가 정상 설정됐는지 확인합니다.",
        expected: "Supabase 연결 오류 없이 데이터 조회가 가능하고 디버그 화면에서도 설정 상태가 정상입니다.",
        routes: ["/dev/supabase-test"],
      },
      {
        id: "deploy-refresh-safe",
        title: "새로고침 시 오류 없음",
        description: "여러 화면에서 새로고침, 직접 URL 접근, 뒤로가기를 반복해봅니다.",
        expected: "401, 404, hydration error 없이 정상적으로 화면이 복원됩니다.",
        routes: ["/", "/expenses/history", "/approvals/pending"],
      },
      {
        id: "deploy-supabase-data",
        title: "Supabase 데이터 표시 정상",
        description: "운영 URL에서 실제 데이터가 로컬과 같은 기준으로 보이는지 확인합니다.",
        expected: "mock fallback 없이 실제 Supabase 데이터만 표시되고 EmptyState와 오류 메시지도 정상 동작합니다.",
        routes: ["/", "/expenses/history", "/accounting/materials", "/funds"],
      },
    ],
  },
];

function getInitialState(): QaChecklistState {
  return {
    checkedMap: {},
    updatedAt: null,
  };
}

function readChecklistState(): QaChecklistState {
  if (typeof window === "undefined") {
    return getInitialState();
  }

  try {
    const storedValue = window.localStorage.getItem(qaChecklistStorageKey);

    if (!storedValue) {
      return getInitialState();
    }

    const parsedValue = JSON.parse(storedValue) as Partial<QaChecklistState>;

    return {
      checkedMap: parsedValue.checkedMap ?? {},
      updatedAt: parsedValue.updatedAt ?? null,
    };
  } catch {
    return getInitialState();
  }
}

function writeChecklistState(nextState: QaChecklistState) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(qaChecklistStorageKey, JSON.stringify(nextState));
  window.dispatchEvent(new Event(qaChecklistChangeEventName));
}

function subscribeChecklistState(callback: () => void) {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  const handleChange = () => callback();

  window.addEventListener("storage", handleChange);
  window.addEventListener(qaChecklistChangeEventName, handleChange);

  return () => {
    window.removeEventListener("storage", handleChange);
    window.removeEventListener(qaChecklistChangeEventName, handleChange);
  };
}

function formatDateTime(value: string | null) {
  if (!value) {
    return "-";
  }

  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(parsedDate);
}

function SectionBadge({
  title,
  icon,
  className,
}: {
  title: string;
  icon: ReactNode;
  className: string;
}) {
  return (
    <span
      className={[
        "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold shadow-sm",
        className,
      ].join(" ")}
    >
      {icon}
      {title}
    </span>
  );
}

export default function QaChecklistPage() {
  const { profile } = useAuth();
  const checklistState = useSyncExternalStore(
    subscribeChecklistState,
    readChecklistState,
    getInitialState,
  );

  const qaStats = useMemo(() => {
    const totalCount = qaSections.reduce((sum, section) => sum + section.items.length, 0);
    const completedCount = qaSections.reduce(
      (sum, section) =>
        sum + section.items.filter((item) => checklistState.checkedMap[item.id]).length,
      0,
    );

    return {
      totalCount,
      completedCount,
      remainingCount: totalCount - completedCount,
      progressRate: totalCount === 0 ? 0 : Math.round((completedCount / totalCount) * 100),
    };
  }, [checklistState.checkedMap]);

  function toggleItem(itemId: string) {
    writeChecklistState({
      checkedMap: {
        ...checklistState.checkedMap,
        [itemId]: !checklistState.checkedMap[itemId],
      },
      updatedAt: new Date().toISOString(),
    });
  }

  function resetChecklist() {
    writeChecklistState({
      checkedMap: {},
      updatedAt: new Date().toISOString(),
    });
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="QA 체크리스트"
        description="배포 전 실제 업무 흐름 기준으로 지출, 승인, 자금, 예산, 정산, 회계 자료 기능을 빠짐없이 점검하는 개발용 체크리스트입니다."
        roles={roleViews}
        activeRole="대표 보기"
        eyebrow="개발용 검수 페이지"
        badgeText="운영 메뉴 비노출"
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="전체 점검 항목"
          value={`${qaStats.totalCount}개`}
          description="기초 데이터부터 배포 확인까지 실제 업무 흐름 기준 점검 항목입니다."
          icon={<ClipboardCheck className="h-5 w-5" strokeWidth={1.8} />}
        />
        <StatCard
          title="완료 항목"
          value={`${qaStats.completedCount}개`}
          description="현재 브라우저 localStorage에 체크 완료로 저장된 항목 수입니다."
          icon={<CheckCheck className="h-5 w-5" strokeWidth={1.8} />}
        />
        <StatCard
          title="남은 항목"
          value={`${qaStats.remainingCount}개`}
          description="아직 확인하지 않은 항목 수입니다. 배포 전 0개를 목표로 확인해 주세요."
          icon={<RefreshCw className="h-5 w-5" strokeWidth={1.8} />}
        />
        <StatCard
          title="진행률"
          value={`${qaStats.progressRate}%`}
          description={`현재 로그인 계정: ${profile ? `${profile.name} (${mapAuthRoleLabel(profile.role)})` : "확인 중"}`}
          icon={<ShieldCheck className="h-5 w-5" strokeWidth={1.8} />}
        />
      </section>

      <section className="rounded-[1.75rem] border border-slate-200/90 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-950">사용 가이드</h3>
            <p className="mt-1 text-sm leading-6 text-slate-500">
              이 페이지는 실제 DB를 수정하지 않고 수동 QA 진행 상태만 저장합니다. 체크 상태는 현재 브라우저의
              <code className="mx-1 rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-700">localStorage</code>
              에 저장되며, 운영 메뉴에는 노출되지 않습니다.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600">
              <LogIn className="h-4 w-4" strokeWidth={1.9} />
              마지막 저장 시각: {formatDateTime(checklistState.updatedAt)}
            </span>
            <button
              type="button"
              onClick={resetChecklist}
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
            >
              <RefreshCw className="h-4 w-4" strokeWidth={1.9} />
              체크 상태 초기화
            </button>
          </div>
        </div>

        <div className="mt-5 rounded-3xl bg-slate-100 p-2">
          <div
            className="h-3 rounded-full bg-[var(--primary)] transition-[width]"
            style={{ width: `${qaStats.progressRate}%` }}
          />
        </div>
      </section>

      {qaSections.map((section) => {
        const completedCount = section.items.filter((item) => checklistState.checkedMap[item.id]).length;

        return (
          <section
            key={section.key}
            className="rounded-[1.75rem] border border-slate-200/90 bg-white p-5 shadow-sm"
          >
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <SectionBadge
                  title={section.title}
                  icon={section.icon}
                  className={section.accentClassName}
                />
                <p className="mt-4 text-sm leading-6 text-slate-500">{section.description}</p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                <p className="font-semibold text-slate-900">
                  {completedCount} / {section.items.length} 완료
                </p>
                <p className="mt-1">체크 시 현재 브라우저에 자동 저장됩니다.</p>
              </div>
            </div>

            <div className="mt-5 space-y-4">
              {section.items.map((item, index) => {
                const isChecked = Boolean(checklistState.checkedMap[item.id]);

                return (
                  <article
                    key={item.id}
                    className={[
                      "rounded-3xl border px-5 py-5 transition",
                      isChecked
                        ? "border-emerald-200 bg-emerald-50/70"
                        : "border-slate-200 bg-slate-50/80",
                    ].join(" ")}
                  >
                    <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-3">
                          <span className="inline-flex h-7 min-w-7 items-center justify-center rounded-full bg-white px-2 text-xs font-semibold text-slate-500 shadow-sm">
                            {index + 1}
                          </span>
                          <label
                            htmlFor={item.id}
                            className="cursor-pointer text-base font-semibold text-slate-950"
                          >
                            {item.title}
                          </label>
                        </div>

                        <p className="mt-3 text-sm leading-6 text-slate-600">{item.description}</p>

                        <div className="mt-4 rounded-2xl border border-slate-200 bg-white px-4 py-4">
                          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                            기대 결과
                          </p>
                          <p className="mt-2 text-sm leading-6 text-slate-700">{item.expected}</p>
                        </div>

                        {item.routes?.length ? (
                          <div className="mt-4 flex flex-wrap gap-2">
                            {item.routes.map((route) => (
                              <Link
                                key={route}
                                href={route}
                                className="inline-flex rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
                              >
                                {route}
                              </Link>
                            ))}
                          </div>
                        ) : null}
                      </div>

                      <label
                        htmlFor={item.id}
                        className={[
                          "inline-flex cursor-pointer items-center gap-3 rounded-2xl border px-4 py-3 text-sm font-semibold shadow-sm transition",
                          isChecked
                            ? "border-emerald-300 bg-emerald-600 text-white"
                            : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50",
                        ].join(" ")}
                      >
                        <input
                          id={item.id}
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleItem(item.id)}
                          className="h-4 w-4 rounded border-slate-300 text-[var(--primary)] focus:ring-[var(--primary)]"
                        />
                        {isChecked ? "확인 완료" : "체크하기"}
                      </label>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
