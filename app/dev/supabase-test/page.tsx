"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import {
  AlertTriangle,
  Database,
  FolderKanban,
  ListChecks,
  ReceiptText,
  Users,
} from "lucide-react";

import { AmountText } from "@/components/common/AmountText";
import { DashboardTable } from "@/components/common/DashboardTable";
import { EmptyState } from "@/components/common/EmptyState";
import { PageHeader } from "@/components/common/PageHeader";
import { StatCard } from "@/components/common/StatCard";
import { StatusBadge } from "@/components/common/StatusBadge";
import { roleViews } from "@/data/mockData";
import {
  getSupabaseBrowserClient,
  isSupabaseConfigured,
} from "@/lib/supabase/client";

type ProfileRow = {
  id: string;
  email: string;
  name: string;
  department: string;
  role: string;
  created_at: string;
};

type ProjectRow = {
  id: string;
  name: string;
  description: string | null;
  status: string;
  created_at: string;
};

type ExpenseCategoryRow = {
  id: string;
  name: string;
  is_active: boolean;
  created_at: string;
};

type ExpenseRequestRow = {
  id: string;
  request_no: string;
  title: string;
  amount: number;
  status: string;
  evidence_status: string;
  requested_at: string;
};

const profileColumns = [
  { key: "name", label: "이름" },
  { key: "email", label: "이메일" },
  { key: "department", label: "부서" },
  { key: "role", label: "권한", align: "center" as const },
  { key: "created_at", label: "생성일" },
];

const projectColumns = [
  { key: "name", label: "프로젝트명" },
  { key: "status", label: "상태", align: "center" as const },
  { key: "created_at", label: "생성일" },
  { key: "description", label: "설명" },
];

const categoryColumns = [
  { key: "name", label: "경비 유형" },
  { key: "is_active", label: "활성 여부", align: "center" as const },
  { key: "created_at", label: "생성일" },
];

const expenseRequestColumns = [
  { key: "request_no", label: "요청번호" },
  { key: "title", label: "제목" },
  { key: "amount", label: "금액", align: "right" as const },
  { key: "status", label: "상태", align: "center" as const },
  { key: "evidence_status", label: "증빙", align: "center" as const },
  { key: "requested_at", label: "요청일" },
];

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));
}

function mapProjectStatusToBadge(status: string) {
  if (status === "active") {
    return "진행중" as const;
  }

  if (status === "inactive" || status === "archived") {
    return "종료" as const;
  }

  return "준비중" as const;
}

function mapExpenseRequestStatusToBadge(status: string) {
  switch (status) {
    case "draft":
      return "보류" as const;
    case "submitted":
      return "승인대기" as const;
    case "approved":
      return "승인완료" as const;
    case "rejected":
      return "반려" as const;
    case "revision_requested":
      return "수정요청" as const;
    case "settlement_pending":
      return "정산대기" as const;
    case "settled":
      return "정산완료" as const;
    case "on_hold":
      return "보류" as const;
    default:
      return "보류" as const;
  }
}

function mapEvidenceStatusToBadge(status: string) {
  return status === "attached" ? ("첨부완료" as const) : ("미첨부" as const);
}

function formatProfileRole(role: string) {
  switch (role) {
    case "employee":
      return "직원";
    case "manager":
      return "매니저";
    case "admin":
      return "관리자";
    default:
      return role;
  }
}

function ResultSection<T>({
  title,
  description,
  loading,
  error,
  countLabel,
  columns,
  rows,
  renderRows,
}: {
  title: string;
  description: string;
  loading: boolean;
  error: string | null;
  countLabel: string;
  columns: Array<{ key: string; label: string; align?: "left" | "center" | "right" }>;
  rows: T[];
  renderRows: (rows: T[]) => ReactNode;
}) {
  return (
    <section className="rounded-[1.75rem] border border-slate-200/90 bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-950">{title}</h3>
          <p className="mt-1 text-sm text-slate-500">{description}</p>
        </div>

        <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">
          {countLabel}
        </span>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-10 text-center">
          <p className="text-sm font-medium text-slate-700">데이터를 불러오는 중입니다...</p>
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-5 text-sm leading-6 text-rose-700">
          <p className="font-semibold">조회에 실패했습니다.</p>
          <p className="mt-2 whitespace-pre-wrap break-words">{error}</p>
        </div>
      ) : rows.length === 0 ? (
        <EmptyState
          className="mt-0"
          title="조회 결과가 없습니다."
          description="연결은 되었지만 표시할 데이터가 없거나 현재 정책상 조회 가능한 데이터가 없습니다."
        />
      ) : (
        <DashboardTable columns={columns}>{renderRows(rows)}</DashboardTable>
      )}
    </section>
  );
}

function ConnectionPill({
  label,
  tone,
}: {
  label: string;
  tone: "success" | "warning" | "danger" | "neutral";
}) {
  const toneClassName = {
    success: "border-emerald-200 bg-emerald-50 text-emerald-700",
    warning: "border-amber-200 bg-amber-50 text-amber-700",
    danger: "border-rose-200 bg-rose-50 text-rose-700",
    neutral: "border-slate-300 bg-slate-100 text-slate-600",
  }[tone];

  return (
    <span className={`inline-flex items-center rounded-full border px-3 py-1 text-sm font-semibold ${toneClassName}`}>
      {label}
    </span>
  );
}

export default function SupabaseTestPage() {
  const [loading, setLoading] = useState(false);
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [categories, setCategories] = useState<ExpenseCategoryRow[]>([]);
  const [expenseRequests, setExpenseRequests] = useState<ExpenseRequestRow[]>([]);
  const [profilesError, setProfilesError] = useState<string | null>(null);
  const [projectsError, setProjectsError] = useState<string | null>(null);
  const [categoriesError, setCategoriesError] = useState<string | null>(null);
  const [expenseRequestsError, setExpenseRequestsError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      if (!isSupabaseConfigured) {
        return;
      }

      setLoading(true);
      setProfilesError(null);
      setProjectsError(null);
      setCategoriesError(null);
      setExpenseRequestsError(null);

      try {
        const supabase = getSupabaseBrowserClient();

        const [profilesResult, projectsResult, categoriesResult, expenseRequestsResult] = await Promise.all([
          supabase
            .from("profiles")
            .select("id, email, name, department, role, created_at")
            .order("created_at", { ascending: false })
            .limit(5),
          supabase
            .from("projects")
            .select("id, name, description, status, created_at")
            .order("created_at", { ascending: false }),
          supabase
            .from("expense_categories")
            .select("id, name, is_active, created_at")
            .order("created_at", { ascending: false }),
          supabase
            .from("expense_requests")
            .select("id, request_no, title, amount, status, evidence_status, requested_at")
            .order("requested_at", { ascending: false })
            .limit(5),
        ]);

        if (!isMounted) {
          return;
        }

        if (profilesResult.error) {
          setProfiles([]);
          setProfilesError(profilesResult.error.message);
        } else {
          setProfiles(profilesResult.data ?? []);
        }

        if (projectsResult.error) {
          setProjects([]);
          setProjectsError(projectsResult.error.message);
        } else {
          setProjects(projectsResult.data ?? []);
        }

        if (categoriesResult.error) {
          setCategories([]);
          setCategoriesError(categoriesResult.error.message);
        } else {
          setCategories(categoriesResult.data ?? []);
        }

        if (expenseRequestsResult.error) {
          setExpenseRequests([]);
          setExpenseRequestsError(expenseRequestsResult.error.message);
        } else {
          setExpenseRequests(expenseRequestsResult.data ?? []);
        }
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.";

        if (!isMounted) {
          return;
        }

        setProfiles([]);
        setProjects([]);
        setCategories([]);
        setExpenseRequests([]);
        setProfilesError(message);
        setProjectsError(message);
        setCategoriesError(message);
        setExpenseRequestsError(message);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    void loadData();

    return () => {
      isMounted = false;
    };
  }, []);

  const hasEnv = isSupabaseConfigured;
  const queryErrors = [profilesError, projectsError, categoriesError, expenseRequestsError].filter(Boolean);
  const hasQueryError = queryErrors.length > 0;

  const connectionState = !hasEnv
    ? {
        label: "환경변수 미설정",
        tone: "warning" as const,
        description: "NEXT_PUBLIC_SUPABASE_URL 과 NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY 설정이 필요합니다.",
      }
    : loading
      ? {
          label: "연결 확인 중",
          tone: "neutral" as const,
          description: "Supabase에 연결하여 select 테스트를 수행하고 있습니다.",
        }
      : hasQueryError
        ? {
            label: "조회 실패",
            tone: "danger" as const,
            description: "환경변수는 확인되었지만 일부 또는 전체 조회에 실패했습니다.",
          }
        : {
            label: "조회 성공",
            tone: "success" as const,
            description: "모든 select 테스트가 정상적으로 응답했습니다.",
          };

  const summaryCards = [
    {
      id: "connection",
      title: "Supabase 연결 상태",
      description: connectionState.description,
      value: <ConnectionPill label={connectionState.label} tone={connectionState.tone} />,
      icon: <Database className="h-5 w-5" strokeWidth={1.8} />,
    },
    {
      id: "profiles",
      title: "profiles 조회",
      description: profilesError ? "조회 실패" : loading ? "로딩 중" : "최근 5명",
      value: <span>{profiles.length}건</span>,
      icon: <Users className="h-5 w-5" strokeWidth={1.8} />,
    },
    {
      id: "projects",
      title: "projects 조회",
      description: projectsError ? "조회 실패" : loading ? "로딩 중" : "전체 프로젝트",
      value: <span>{projects.length}건</span>,
      icon: <FolderKanban className="h-5 w-5" strokeWidth={1.8} />,
    },
    {
      id: "categories",
      title: "expense_categories 조회",
      description: categoriesError ? "조회 실패" : loading ? "로딩 중" : "전체 경비 유형",
      value: <span>{categories.length}건</span>,
      icon: <ListChecks className="h-5 w-5" strokeWidth={1.8} />,
    },
    {
      id: "requests",
      title: "expense_requests 조회",
      description: expenseRequestsError ? "조회 실패" : loading ? "로딩 중" : "최근 5건",
      value: <span>{expenseRequests.length}건</span>,
      icon: <ReceiptText className="h-5 w-5" strokeWidth={1.8} />,
    },
  ];

  return (
    <div className="space-y-8">
      <PageHeader
        title="Supabase 연결 테스트"
        description="Supabase DB 연결과 기본 select 조회 동작을 개발용으로 확인하는 화면입니다."
        roles={roleViews}
        activeRole="관리자 보기"
        eyebrow="개발 도구"
        badgeText="기존 mock UI와 분리된 테스트 페이지"
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {summaryCards.map((card) => (
          <StatCard
            key={card.id}
            title={card.title}
            description={card.description}
            value={card.value}
            icon={card.icon}
          />
        ))}
      </section>

      {!hasEnv ? (
        <section className="rounded-[1.75rem] border border-amber-200 bg-amber-50 p-5 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-amber-700 shadow-sm">
              <AlertTriangle className="h-5 w-5" strokeWidth={1.8} />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-amber-900">Supabase 환경변수가 설정되지 않았습니다.</h3>
              <p className="mt-2 text-sm leading-6 text-amber-800">
                <code>NEXT_PUBLIC_SUPABASE_URL</code> 과{" "}
                <code>NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY</code> 를 설정한 뒤 다시 확인해주세요.
              </p>
            </div>
          </div>
        </section>
      ) : (
        <section className="rounded-[1.75rem] border border-slate-200/90 bg-[var(--card-secondary)] p-5 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-[var(--primary)] shadow-sm">
              <Database className="h-5 w-5" strokeWidth={1.8} />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-950">조회 안내</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                이 페이지는 <code>select</code> 만 사용합니다. 현재 RLS 정책상 로그인 세션이 없으면 조회가 실패할 수 있으며,
                그 경우 아래에 Supabase 에러 메시지를 그대로 표시합니다.
              </p>
            </div>
          </div>
        </section>
      )}

      <ResultSection
        title="profiles 최근 5명"
        description="생성일 기준 최근 프로필 5건을 조회합니다."
        loading={loading}
        error={profilesError}
        countLabel={`총 ${profiles.length}건`}
        columns={profileColumns}
        rows={profiles}
        renderRows={(rows) =>
          rows.map((profile) => (
            <tr key={profile.id} className="border-b border-slate-100 last:border-b-0">
              <td className="px-4 py-4 font-medium text-slate-900">{profile.name}</td>
              <td className="px-4 py-4 text-slate-600">{profile.email}</td>
              <td className="px-4 py-4 text-slate-600">{profile.department || "-"}</td>
              <td className="px-4 py-4 text-center">
                <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-600">
                  {formatProfileRole(profile.role)}
                </span>
              </td>
              <td className="px-4 py-4 text-slate-500">{formatDateTime(profile.created_at)}</td>
            </tr>
          ))
        }
      />

      <ResultSection
        title="projects 테이블"
        description="프로젝트 테이블의 전체 목록을 조회합니다."
        loading={loading}
        error={projectsError}
        countLabel={`총 ${projects.length}건`}
        columns={projectColumns}
        rows={projects}
        renderRows={(rows) =>
          rows.map((project) => (
            <tr key={project.id} className="border-b border-slate-100 last:border-b-0">
              <td className="px-4 py-4 font-medium text-slate-900">{project.name}</td>
              <td className="px-4 py-4 text-center">
                <StatusBadge status={mapProjectStatusToBadge(project.status)} />
              </td>
              <td className="px-4 py-4 text-slate-500">{formatDateTime(project.created_at)}</td>
              <td className="px-4 py-4 text-slate-600">{project.description || "-"}</td>
            </tr>
          ))
        }
      />

      <ResultSection
        title="expense_categories 테이블"
        description="경비 유형 테이블의 전체 목록을 조회합니다."
        loading={loading}
        error={categoriesError}
        countLabel={`총 ${categories.length}건`}
        columns={categoryColumns}
        rows={categories}
        renderRows={(rows) =>
          rows.map((category) => (
            <tr key={category.id} className="border-b border-slate-100 last:border-b-0">
              <td className="px-4 py-4 font-medium text-slate-900">{category.name}</td>
              <td className="px-4 py-4 text-center">
                <StatusBadge status={category.is_active ? "활성" : "비활성"} />
              </td>
              <td className="px-4 py-4 text-slate-500">{formatDateTime(category.created_at)}</td>
            </tr>
          ))
        }
      />

      <ResultSection
        title="expense_requests 최근 5건"
        description="요청일 기준 최근 지출 요청 5건을 조회합니다."
        loading={loading}
        error={expenseRequestsError}
        countLabel={`총 ${expenseRequests.length}건`}
        columns={expenseRequestColumns}
        rows={expenseRequests}
        renderRows={(rows) =>
          rows.map((request) => (
            <tr key={request.id} className="border-b border-slate-100 last:border-b-0">
              <td className="px-4 py-4 font-medium text-slate-700">{request.request_no}</td>
              <td className="px-4 py-4 text-slate-900">{request.title}</td>
              <td className="px-4 py-4 text-right font-medium text-slate-900">
                <AmountText value={request.amount} />
              </td>
              <td className="px-4 py-4 text-center">
                <StatusBadge status={mapExpenseRequestStatusToBadge(request.status)} />
              </td>
              <td className="px-4 py-4 text-center">
                <StatusBadge status={mapEvidenceStatusToBadge(request.evidence_status)} />
              </td>
              <td className="px-4 py-4 text-slate-500">{formatDate(request.requested_at)}</td>
            </tr>
          ))
        }
      />
    </div>
  );
}
