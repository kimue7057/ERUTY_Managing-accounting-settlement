"use client";

import Link from "next/link";
import { useMemo, useSyncExternalStore } from "react";
import type { ReactNode } from "react";
import {
  AlertTriangle,
  CheckCheck,
  ClipboardCheck,
  Database,
  FileSearch,
  LogIn,
  RefreshCw,
  ShieldCheck,
  UserCheck,
  Users,
} from "lucide-react";

import { useAuth } from "@/components/auth/AuthProvider";
import { EmptyState } from "@/components/common/EmptyState";
import { PageHeader } from "@/components/common/PageHeader";
import { StatCard } from "@/components/common/StatCard";
import type { RoleView } from "@/types";
import { mapAuthRoleLabel } from "@/utils/auth";

type QaSectionKey = "common" | "employee" | "manager" | "admin" | "error";

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
const qaChecklistStorageKey = "eruty-qa-checklist-v1";
const qaChecklistChangeEventName = "eruty-qa-checklist-change";

const quickLinks = [
  { href: "/login", label: "로그인", description: "이메일/비밀번호 로그인과 로그아웃 확인" },
  { href: "/", label: "대시보드", description: "역할별 초기 진입 화면 및 집계 확인" },
  { href: "/expenses/request", label: "지출 기안 작성", description: "경비 요청 저장 및 첨부 업로드 확인" },
  { href: "/expenses/history", label: "내 지출 내역", description: "employee 본인 요청 조회와 상태 반영 확인" },
  { href: "/approvals/pending", label: "승인 대기함", description: "manager/admin 검토 흐름 확인" },
  { href: "/projects/budget", label: "프로젝트 예산", description: "예산 사용률 및 승인 반영 확인" },
  { href: "/funds", label: "회사 자금 현황", description: "admin 자금 관리와 실질 가용 자금 확인" },
  { href: "/settlements/monthly", label: "월말 정산", description: "정산 확정 및 지급 완료 처리 확인" },
  { href: "/accounting/materials", label: "회계 자료", description: "CSV 다운로드 및 월별 집계 확인" },
  { href: "/settings", label: "설정", description: "profiles/projects/categories 조회 확인" },
  { href: "/dev/supabase-test", label: "Supabase 테스트", description: "테이블 연결 및 RLS 응답 점검" },
];

const qaSections: QaSection[] = [
  {
    key: "common",
    title: "공통 QA",
    description: "로그인 상태와 권한 가드, 반응형 기본 상태를 먼저 점검합니다.",
    icon: <ShieldCheck className="h-5 w-5" strokeWidth={1.9} />,
    accentClassName: "border-slate-200 bg-slate-50 text-slate-700",
    items: [
      {
        id: "common-login",
        title: "로그인",
        description: "employee, manager, admin 계정으로 각각 로그인 시도",
        expected: "로그인 성공 후 각 역할의 기본 진입 화면으로 이동하고 profile 정보가 헤더에 표시됩니다.",
        routes: ["/login"],
      },
      {
        id: "common-logout",
        title: "로그아웃",
        description: "헤더 프로필 영역의 로그아웃 동작 확인",
        expected: "세션이 종료되고 로그인 페이지로 돌아가며 보호된 페이지 재접근이 차단됩니다.",
        routes: ["/login", "/"],
      },
      {
        id: "common-role-guard",
        title: "권한 없는 페이지 접근 차단",
        description: "역할에 맞지 않는 URL 직접 접근 시도",
        expected: "프론트에서 접근 권한 없음 화면이 표시되고, 데이터가 노출되지 않습니다.",
        routes: ["/approvals/pending", "/funds", "/settings"],
      },
      {
        id: "common-session-refresh",
        title: "새로고침 시 로그인 유지",
        description: "로그인 후 브라우저 새로고침 또는 직접 URL 접근",
        expected: "세션이 유지되고 다시 로그인하지 않아도 같은 계정 기준으로 화면이 복원됩니다.",
        routes: ["/", "/expenses/history"],
      },
      {
        id: "common-mobile",
        title: "모바일 화면 기본 확인",
        description: "브라우저 반응형 모드로 390px 전후 해상도 점검",
        expected: "레이아웃이 깨지지 않고 스크롤/버튼/표 영역이 기본 사용 가능 상태를 유지합니다.",
        routes: ["/", "/expenses/request", "/approvals/pending"],
      },
    ],
  },
  {
    key: "employee",
    title: "employee QA",
    description: "직원 계정 기준으로 경비 신청, 첨부, 상태 추적 흐름을 점검합니다.",
    icon: <UserCheck className="h-5 w-5" strokeWidth={1.9} />,
    accentClassName: "border-sky-200 bg-sky-50 text-sky-700",
    items: [
      {
        id: "employee-request-create",
        title: "지출 기안 작성",
        description: "필수값 입력 후 승인 요청 제출",
        expected: "`expense_requests`에 row가 생성되고 성공 메시지와 요청번호가 표시됩니다.",
        routes: ["/expenses/request"],
      },
      {
        id: "employee-attachment-upload",
        title: "증빙 파일 첨부",
        description: "jpg, jpeg, png, pdf 파일 첨부 후 제출",
        expected: "Storage `expense-evidence`에 파일이 저장되고 `expense_attachments`에 row가 생성되며 `evidence_status = attached`가 반영됩니다.",
        routes: ["/expenses/request", "/dev/supabase-test"],
      },
      {
        id: "employee-history-visible",
        title: "제출 후 내 지출 내역 표시",
        description: "방금 제출한 요청이 내 지출 내역 목록에 보이는지 확인",
        expected: "최신순으로 목록에 표시되고 요청번호, 상태, 증빙 상태가 Supabase 값과 일치합니다.",
        routes: ["/expenses/history"],
      },
      {
        id: "employee-status-before-approval",
        title: "승인 전 상태 확인",
        description: "제출 직후 상태와 증빙 컬럼 확인",
        expected: "`submitted`는 승인대기로 표시되고 증빙 미첨부 건은 눈에 띄게 구분됩니다.",
        routes: ["/expenses/history"],
      },
      {
        id: "employee-status-rejected-revision",
        title: "반려/수정요청 상태 확인",
        description: "manager 또는 admin 처리 후 employee 화면 재확인",
        expected: "반려, 수정요청 상태가 Supabase 업데이트 값과 동일하게 즉시 보입니다.",
        routes: ["/expenses/history"],
      },
      {
        id: "employee-settlement-preview",
        title: "승인 후 정산 예정 반영 확인",
        description: "개인카드 또는 현금 사용 승인 건의 정산 관련 상태 확인",
        expected: "내 지출 내역과 대시보드 employee 요약에서 정산 대상 흐름이 자연스럽게 반영됩니다.",
        routes: ["/expenses/history", "/"],
      },
    ],
  },
  {
    key: "manager",
    title: "manager QA",
    description: "관리자 계정 기준으로 승인 검토와 대시보드 반영 흐름을 점검합니다.",
    icon: <Users className="h-5 w-5" strokeWidth={1.9} />,
    accentClassName: "border-amber-200 bg-amber-50 text-amber-700",
    items: [
      {
        id: "manager-pending-list",
        title: "승인 대기함 조회",
        description: "submitted, revision_requested, approved, rejected 상태 목록 확인",
        expected: "전체 직원 요청이 최신순으로 보이고 employee 계정에서는 접근할 수 없어야 합니다.",
        routes: ["/approvals/pending"],
      },
      {
        id: "manager-detail-view",
        title: "직원 요청 상세 확인",
        description: "검토 버튼으로 상세 검토 화면 이동",
        expected: "요청번호, 직원명, 경비유형, 프로젝트, 메모 등 Supabase 단건 데이터가 정확히 보입니다.",
        routes: ["/approvals/pending"],
      },
      {
        id: "manager-proof-check",
        title: "증빙 파일 확인",
        description: "상세 검토 화면에서 첨부 목록과 링크 확인",
        expected: "첨부 파일명, 유형, 업로드일이 보이고 미첨부 건은 경고 박스로 표시됩니다.",
        routes: ["/approvals/pending"],
      },
      {
        id: "manager-approve",
        title: "승인 처리",
        description: "승인 금액 입력 후 승인 저장",
        expected: "`expense_requests.status = approved`, `approved_at`, `approved_amount`, `approver_id`가 저장되고 승인 대기함과 대시보드 집계가 갱신됩니다.",
        routes: ["/approvals/pending", "/"],
      },
      {
        id: "manager-reject",
        title: "반려 처리",
        description: "메모 입력 후 반려 저장",
        expected: "`status = rejected`와 반려 사유가 저장되고 employee 화면에서도 같은 상태가 보입니다.",
        routes: ["/approvals/pending", "/expenses/history"],
      },
      {
        id: "manager-revision",
        title: "수정요청 처리",
        description: "메모 입력 후 수정요청 저장",
        expected: "`status = revision_requested`가 저장되고 employee가 내역 화면에서 수정요청 상태를 확인할 수 있습니다.",
        routes: ["/approvals/pending", "/expenses/history"],
      },
      {
        id: "manager-dashboard-sync",
        title: "대시보드 반영 확인",
        description: "승인/반려 후 대시보드 요약과 최근 요청 목록 확인",
        expected: "승인 대기 건수, 최근 기안 목록, 프로젝트/경비 유형 집계가 실데이터 기준으로 다시 계산됩니다.",
        routes: ["/"],
      },
    ],
  },
  {
    key: "admin",
    title: "admin QA",
    description: "최고관리자 계정 기준으로 운영 기능과 전체 접근 권한을 점검합니다.",
    icon: <Database className="h-5 w-5" strokeWidth={1.9} />,
    accentClassName: "border-emerald-200 bg-emerald-50 text-emerald-700",
    items: [
      {
        id: "admin-settings",
        title: "직원/프로젝트/경비유형 관리",
        description: "설정 화면의 사용자, 프로젝트, 경비 유형 탭 확인",
        expected: "profiles, projects, expense_categories가 조회되고 admin만 접근 가능해야 합니다.",
        routes: ["/settings"],
      },
      {
        id: "admin-funds",
        title: "회사 자금 현황 관리",
        description: "자금 항목 추가, 수정, 비활성화 및 거래 등록 확인",
        expected: "`company_funds`, `fund_transactions`에 변경이 반영되고 대시보드 자금 카드와 일관되게 계산됩니다.",
        routes: ["/funds", "/"],
      },
      {
        id: "admin-budget",
        title: "프로젝트 예산 확인",
        description: "프로젝트별 총예산, 사용액, 사용률, 예산 로그 확인",
        expected: "승인 처리 후 DB trigger 기준으로 `used_amount`, `remaining_amount`, `project_budget_logs`가 반영됩니다.",
        routes: ["/projects/budget", "/approvals/pending"],
      },
      {
        id: "admin-settlement-confirm",
        title: "월말 정산 확정",
        description: "선택 월 기준 직원별 정산 확정 처리",
        expected: "`monthly_settlements`, `settlement_items`에 중복 없이 저장되고 확정 상태가 목록에 표시됩니다.",
        routes: ["/settlements/monthly"],
      },
      {
        id: "admin-settlement-paid",
        title: "지급 완료 처리",
        description: "confirmed 상태 정산에 대해 지급 완료 처리",
        expected: "`monthly_settlements.status = paid`, `paid_at`이 저장되고 회계 자료의 지급 상태에도 반영됩니다.",
        routes: ["/settlements/monthly", "/accounting/materials"],
      },
      {
        id: "admin-accounting-csv",
        title: "회계 자료 CSV 다운로드",
        description: "월 선택 후 전체/개별 CSV 다운로드 버튼 실행",
        expected: "데이터가 있을 때 UTF-8 BOM이 포함된 CSV가 다운로드되고, 데이터가 없으면 안내 메시지가 표시됩니다.",
        routes: ["/accounting/materials"],
      },
      {
        id: "admin-rls-all-access",
        title: "RLS 적용 후 전체 접근 정상 확인",
        description: "admin 계정으로 전 메뉴 접근 및 실데이터 조회 확인",
        expected: "admin은 전체 운영 화면을 정상 조회/수정할 수 있고 employee/manager 제한 범위는 유지됩니다.",
        routes: ["/", "/settings", "/funds", "/settlements/monthly", "/accounting/materials"],
      },
    ],
  },
  {
    key: "error",
    title: "에러 케이스 QA",
    description: "입력 오류, 파일 제약, 권한 오류, 빈 데이터 화면을 점검합니다.",
    icon: <AlertTriangle className="h-5 w-5" strokeWidth={1.9} />,
    accentClassName: "border-rose-200 bg-rose-50 text-rose-700",
    items: [
      {
        id: "error-required-fields",
        title: "필수값 누락",
        description: "지출 기안 작성에서 필수 입력 없이 제출 시도",
        expected: "화면에서 필수값 오류가 표시되고 insert가 실행되지 않아야 합니다.",
        routes: ["/expenses/request"],
      },
      {
        id: "error-invalid-file-type",
        title: "잘못된 파일 형식",
        description: "jpg/jpeg/png/pdf 외 파일 첨부 시도",
        expected: "허용되지 않는 형식 안내가 표시되고 업로드 대상에 포함되지 않아야 합니다.",
        routes: ["/expenses/request"],
      },
      {
        id: "error-file-size-limit",
        title: "10MB 초과 파일",
        description: "10MB를 넘는 첨부 파일 선택 시도",
        expected: "제출 전에 크기 제한 안내가 표시되고 업로드가 차단되어야 합니다.",
        routes: ["/expenses/request"],
      },
      {
        id: "error-forbidden-approval",
        title: "권한 없는 승인 처리",
        description: "employee 계정으로 승인 상세 URL 직접 접근 또는 저장 시도",
        expected: "접근 권한 없음 또는 저장 차단 메시지가 표시되고 `expense_requests` update가 발생하지 않아야 합니다.",
        routes: ["/approvals/pending"],
      },
      {
        id: "error-budget-overrun",
        title: "예산 초과 승인",
        description: "남은 예산보다 큰 승인 건을 승인 시도",
        expected: "경고 또는 confirm이 표시되고, 승인 진행 시에도 예산 초과 상태가 프로젝트 화면에 반영되어야 합니다.",
        routes: ["/approvals/pending", "/projects/budget"],
      },
      {
        id: "error-empty-state",
        title: "데이터 0개 EmptyState",
        description: "조회 결과가 없는 월/필터/계정 조합으로 화면 확인",
        expected: "mock row 대신 EmptyState 또는 명확한 안내 문구가 표시되어야 합니다.",
        routes: ["/expenses/history", "/approvals/pending", "/accounting/materials"],
      },
    ],
  },
];

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

function QaSectionBadge({
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
        description="운영 배포 전 ERUTY 자금관리 시스템의 로그인, 권한, Supabase 실데이터 흐름을 역할별로 빠짐없이 점검합니다."
        roles={roleViews}
        activeRole="대표 보기"
        eyebrow="개발 전용 QA"
        badgeText="사이드바 비노출"
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="전체 QA 항목"
          value={`${qaStats.totalCount}개`}
          description="공통, employee, manager, admin, 에러 케이스를 합친 수입니다."
          icon={<ClipboardCheck className="h-5 w-5" strokeWidth={1.8} />}
        />
        <StatCard
          title="완료 항목"
          value={`${qaStats.completedCount}개`}
          description="이 브라우저에서 체크 완료한 QA 항목 수입니다."
          icon={<CheckCheck className="h-5 w-5" strokeWidth={1.8} />}
        />
        <StatCard
          title="남은 항목"
          value={`${qaStats.remainingCount}개`}
          description="아직 확인되지 않은 QA 항목입니다."
          icon={<FileSearch className="h-5 w-5" strokeWidth={1.8} />}
        />
        <StatCard
          title="진행률"
          value={`${qaStats.progressRate}%`}
          description={`현재 로그인 역할: ${profile ? mapAuthRoleLabel(profile.role) : "확인 중"}`}
          icon={<RefreshCw className="h-5 w-5" strokeWidth={1.8} />}
        />
      </section>

      <section className="rounded-[1.75rem] border border-slate-200/90 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-950">QA 진행 가이드</h3>
            <p className="mt-1 text-sm leading-6 text-slate-500">
              모든 항목은 mock fallback 없이 현재 Supabase 실데이터 기준으로 확인합니다. 체크 상태는 이 브라우저의
              localStorage에 저장되며, 데이터베이스에는 기록되지 않습니다.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600">
              <LogIn className="h-4 w-4" strokeWidth={1.9} />
              마지막 업데이트: {formatDateTime(checklistState.updatedAt)}
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

      <section className="rounded-[1.75rem] border border-slate-200/90 bg-white p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <Database className="mt-0.5 h-5 w-5 text-[var(--primary)]" strokeWidth={1.9} />
          <div>
            <h3 className="text-lg font-semibold text-slate-950">Supabase 실데이터 확인 포인트</h3>
            <p className="mt-1 text-sm leading-6 text-slate-500">
              아래 항목은 QA 중 함께 확인하면 좋습니다. `expense_requests`, `expense_attachments`, `monthly_settlements`,
              `settlement_items`, `company_funds`, `fund_transactions`, `project_budget_logs` 값이 실제 화면과 일치하는지
              Table Editor 또는 `/dev/supabase-test`로 교차 확인해주세요.
            </p>
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {quickLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 transition hover:border-slate-300 hover:bg-white"
            >
              <p className="text-sm font-semibold text-slate-900">{link.label}</p>
              <p className="mt-1 text-sm leading-6 text-slate-500">{link.description}</p>
              <p className="mt-2 text-xs font-medium text-slate-400">{link.href}</p>
            </Link>
          ))}
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
                <QaSectionBadge
                  title={section.title}
                  icon={section.icon}
                  className={section.accentClassName}
                />
                <h3 className="mt-4 text-xl font-semibold text-slate-950">{section.title}</h3>
                <p className="mt-1 text-sm leading-6 text-slate-500">{section.description}</p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                <p className="font-semibold text-slate-900">
                  {completedCount} / {section.items.length} 완료
                </p>
                <p className="mt-1">각 항목을 확인한 뒤 체크해두면 새로고침 후에도 유지됩니다.</p>
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
                        ? "border-emerald-200 bg-emerald-50/80"
                        : "border-slate-200 bg-slate-50/80",
                    ].join(" ")}
                  >
                    <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="inline-flex h-7 min-w-7 items-center justify-center rounded-full bg-white px-2 text-xs font-semibold text-slate-500 shadow-sm">
                            {index + 1}
                          </span>
                          <h4 className="text-base font-semibold text-slate-950">{item.title}</h4>
                        </div>
                        <p className="mt-3 text-sm leading-6 text-slate-600">{item.description}</p>
                        <div className="mt-4 rounded-2xl border border-slate-200 bg-white px-4 py-4">
                          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">기대 결과</p>
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

                      <button
                        type="button"
                        onClick={() => toggleItem(item.id)}
                        className={[
                          "inline-flex min-w-[132px] items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-sm font-semibold shadow-sm transition",
                          isChecked
                            ? "border-emerald-300 bg-emerald-600 text-white hover:bg-emerald-700"
                            : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50",
                        ].join(" ")}
                      >
                        <ClipboardCheck className="h-4 w-4" strokeWidth={1.9} />
                        {isChecked ? "확인 완료" : "체크하기"}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        );
      })}

      {!profile ? (
        <section className="rounded-[1.75rem] border border-slate-200/90 bg-white p-8 shadow-sm">
          <EmptyState
            className="mt-0 border-none bg-slate-50 px-0 py-0"
            title="로그인 정보를 확인하는 중입니다."
            description="현재 사용자 역할을 불러온 뒤 체크리스트 진행 상태를 함께 확인합니다."
          />
        </section>
      ) : null}
    </div>
  );
}
