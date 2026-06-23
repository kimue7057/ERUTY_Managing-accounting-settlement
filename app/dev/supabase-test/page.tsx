"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import {
  AlertTriangle,
  Database,
  FolderKanban,
  ListChecks,
  RefreshCw,
  ReceiptText,
  ShieldCheck,
  Users,
} from "lucide-react";

import { AmountText } from "@/components/common/AmountText";
import { DashboardTable } from "@/components/common/DashboardTable";
import { EmptyState } from "@/components/common/EmptyState";
import { PageHeader } from "@/components/common/PageHeader";
import { StatCard } from "@/components/common/StatCard";
import { StatusBadge } from "@/components/common/StatusBadge";
import {
  getSupabaseBrowserClient,
  isSupabaseConfigured,
} from "@/lib/supabase/client";
import type { RoleView } from "@/types";

type QueryStatus = "idle" | "loading" | "success" | "error";

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

type QuerySectionState<T> = {
  rows: T[];
  error: string | null;
};

const devRoleViews: RoleView[] = ["직원 보기", "관리자 보기", "대표 보기"];
const supabaseUrlValue = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabasePublishableKeyValue =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";

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
    second: "2-digit",
  }).format(new Date(value));
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));
}

function getSupabaseHost(value: string) {
  if (!value) {
    return "-";
  }

  try {
    return new URL(value).host;
  } catch {
    return "형식 오류";
  }
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
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-sm font-semibold ${toneClassName}`}
    >
      {label}
    </span>
  );
}

function QueryInfoRow({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
        {label}
      </p>
      <div className="mt-2 text-sm font-semibold text-slate-900">{value}</div>
    </div>
  );
}

function ResultSection<T>({
  title,
  description,
  loading,
  error,
  rows,
  columns,
  firstRowSummary,
  renderRows,
}: {
  title: string;
  description: string;
  loading: boolean;
  error: string | null;
  rows: T[];
  columns: Array<{ key: string; label: string; align?: "left" | "center" | "right" }>;
  firstRowSummary: string;
  renderRows: (rows: T[]) => ReactNode;
}) {
  return (
    <section className="rounded-[1.75rem] border border-slate-200/90 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-950">{title}</h3>
            <p className="mt-1 text-sm text-slate-500">{description}</p>
          </div>

          <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">
            조회 결과 {rows.length}건
          </span>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-600">
          <p>
            첫 번째 row:
            <span className="ml-2 font-semibold text-slate-900">{firstRowSummary}</span>
          </p>
        </div>
      </div>

      <div className="mt-4">
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
            description="mock data 대신 실제 Supabase 조회 결과만 표시하며, 현재 응답한 row가 없습니다."
          />
        ) : (
          <DashboardTable columns={columns}>{renderRows(rows)}</DashboardTable>
        )}
      </div>
    </section>
  );
}

export default function SupabaseTestPage() {
  const [reloadToken, setReloadToken] = useState(0);
  const [loading, setLoading] = useState(false);
  const [queryStatus, setQueryStatus] = useState<QueryStatus>("idle");
  const [lastQueriedAt, setLastQueriedAt] = useState<string | null>(null);
  const [globalErrorMessage, setGlobalErrorMessage] = useState<string | null>(null);
  const [profilesState, setProfilesState] = useState<QuerySectionState<ProfileRow>>({
    rows: [],
    error: null,
  });
  const [projectsState, setProjectsState] = useState<QuerySectionState<ProjectRow>>({
    rows: [],
    error: null,
  });
  const [categoriesState, setCategoriesState] =
    useState<QuerySectionState<ExpenseCategoryRow>>({
      rows: [],
      error: null,
    });
  const [expenseRequestsState, setExpenseRequestsState] =
    useState<QuerySectionState<ExpenseRequestRow>>({
      rows: [],
      error: null,
    });

  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      const requestedAt = new Date().toISOString();

      if (!isMounted) {
        return;
      }

      setLoading(true);
      setQueryStatus("loading");
      setLastQueriedAt(requestedAt);
      setGlobalErrorMessage(null);
      setProfilesState({ rows: [], error: null });
      setProjectsState({ rows: [], error: null });
      setCategoriesState({ rows: [], error: null });
      setExpenseRequestsState({ rows: [], error: null });

      if (!isSupabaseConfigured) {
        const message =
          "Supabase 환경변수가 설정되지 않았습니다. NEXT_PUBLIC_SUPABASE_URL 및 NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY를 확인해주세요.";

        if (!isMounted) {
          return;
        }

        setGlobalErrorMessage(message);
        setQueryStatus("error");
        setLoading(false);
        return;
      }

      try {
        const supabase = getSupabaseBrowserClient();

        const [
          profilesResult,
          projectsResult,
          categoriesResult,
          expenseRequestsResult,
        ] = await Promise.all([
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

        setProfilesState({
          rows: profilesResult.error ? [] : (profilesResult.data ?? []),
          error: profilesResult.error ? profilesResult.error.message : null,
        });
        setProjectsState({
          rows: projectsResult.error ? [] : (projectsResult.data ?? []),
          error: projectsResult.error ? projectsResult.error.message : null,
        });
        setCategoriesState({
          rows: categoriesResult.error ? [] : (categoriesResult.data ?? []),
          error: categoriesResult.error ? categoriesResult.error.message : null,
        });
        setExpenseRequestsState({
          rows: expenseRequestsResult.error ? [] : (expenseRequestsResult.data ?? []),
          error: expenseRequestsResult.error ? expenseRequestsResult.error.message : null,
        });

        const errorMessages = [
          profilesResult.error
            ? `[profiles]\n${profilesResult.error.message}`
            : null,
          projectsResult.error
            ? `[projects]\n${projectsResult.error.message}`
            : null,
          categoriesResult.error
            ? `[expense_categories]\n${categoriesResult.error.message}`
            : null,
          expenseRequestsResult.error
            ? `[expense_requests]\n${expenseRequestsResult.error.message}`
            : null,
        ].filter(Boolean);

        if (errorMessages.length > 0) {
          setGlobalErrorMessage(errorMessages.join("\n\n"));
          setQueryStatus("error");
        } else {
          setQueryStatus("success");
        }
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.";

        if (!isMounted) {
          return;
        }

        setProfilesState({ rows: [], error: message });
        setProjectsState({ rows: [], error: message });
        setCategoriesState({ rows: [], error: message });
        setExpenseRequestsState({ rows: [], error: message });
        setGlobalErrorMessage(message);
        setQueryStatus("error");
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
  }, [reloadToken]);

  const queryStateSummary =
    queryStatus === "loading"
      ? {
          label: "조회 중",
          tone: "neutral" as const,
          description: "client component + useEffect 방식으로 Supabase를 다시 조회하고 있습니다.",
        }
      : queryStatus === "success"
        ? {
            label: "조회 성공",
            tone: "success" as const,
            description: "4개 테이블 select가 모두 정상 응답했습니다.",
          }
        : queryStatus === "error"
          ? {
              label: "조회 실패",
              tone: "danger" as const,
              description: "환경변수 문제 또는 RLS/권한 문제로 일부 또는 전체 조회가 실패했습니다.",
            }
          : {
              label: "조회 전",
              tone: "warning" as const,
              description: "아직 Supabase 조회가 시작되지 않았습니다.",
            };

  const summaryCards = [
    {
      id: "query-status",
      title: "Supabase 조회 상태",
      description: queryStateSummary.description,
      value: (
        <ConnectionPill
          label={queryStateSummary.label}
          tone={queryStateSummary.tone}
        />
      ),
      icon: <Database className="h-5 w-5" strokeWidth={1.8} />,
    },
    {
      id: "profiles",
      title: "profiles",
      description: profilesState.error ? "조회 실패" : "최근 5명",
      value: <span>{profilesState.rows.length}건</span>,
      icon: <Users className="h-5 w-5" strokeWidth={1.8} />,
    },
    {
      id: "projects",
      title: "projects",
      description: projectsState.error ? "조회 실패" : "전체 프로젝트",
      value: <span>{projectsState.rows.length}건</span>,
      icon: <FolderKanban className="h-5 w-5" strokeWidth={1.8} />,
    },
    {
      id: "categories",
      title: "expense_categories",
      description: categoriesState.error ? "조회 실패" : "전체 경비 유형",
      value: <span>{categoriesState.rows.length}건</span>,
      icon: <ListChecks className="h-5 w-5" strokeWidth={1.8} />,
    },
    {
      id: "requests",
      title: "expense_requests",
      description: expenseRequestsState.error ? "조회 실패" : "최근 5건",
      value: <span>{expenseRequestsState.rows.length}건</span>,
      icon: <ReceiptText className="h-5 w-5" strokeWidth={1.8} />,
    },
  ];

  const profilesFirstRowSummary =
    profilesState.rows[0]
      ? `id: ${profilesState.rows[0].id} / name: ${profilesState.rows[0].name}`
      : "없음";
  const projectsFirstRowSummary =
    projectsState.rows[0]
      ? `id: ${projectsState.rows[0].id} / name: ${projectsState.rows[0].name}`
      : "없음";
  const categoriesFirstRowSummary =
    categoriesState.rows[0]
      ? `id: ${categoriesState.rows[0].id} / name: ${categoriesState.rows[0].name}`
      : "없음";
  const expenseRequestsFirstRowSummary =
    expenseRequestsState.rows[0]
      ? `id: ${expenseRequestsState.rows[0].id} / title: ${expenseRequestsState.rows[0].title}`
      : "없음";

  return (
    <div className="space-y-8">
      <PageHeader
        title="Supabase 연결 테스트"
        description="Supabase 환경변수 인식 여부와 실제 select 조회 결과를 개발용으로 확인하는 화면입니다."
        roles={devRoleViews}
        activeRole="관리자 보기"
        eyebrow="개발 도구"
        badgeText="mock data 없이 실제 조회만 표시"
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

      <section className="rounded-[1.75rem] border border-slate-200/90 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-950">환경변수 및 조회 진단</h3>
            <p className="mt-1 text-sm text-slate-500">
              브라우저에서 `NEXT_PUBLIC_*` 환경변수를 실제로 읽는지와 마지막 조회 결과를 함께 확인합니다.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setReloadToken((current) => current + 1)}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
          >
            <RefreshCw className="h-4.5 w-4.5" strokeWidth={1.8} />
            다시 조회
          </button>
        </div>

        <div className="mt-5 grid gap-4 xl:grid-cols-3">
          <QueryInfoRow
            label="NEXT_PUBLIC_SUPABASE_URL 존재 여부"
            value={supabaseUrlValue ? "있음" : "없음"}
          />
          <QueryInfoRow
            label="NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY 존재 여부"
            value={supabasePublishableKeyValue ? "있음" : "없음"}
          />
          <QueryInfoRow
            label="NEXT_PUBLIC_SUPABASE_URL host"
            value={getSupabaseHost(supabaseUrlValue)}
          />
          <QueryInfoRow
            label="Supabase 조회 시각"
            value={lastQueriedAt ? formatDateTime(lastQueriedAt) : "조회 전"}
          />
          <QueryInfoRow
            label="Supabase 조회 성공/실패 상태"
            value={
              <ConnectionPill
                label={queryStateSummary.label}
                tone={queryStateSummary.tone}
              />
            }
          />
          <QueryInfoRow
            label="Supabase 브라우저 클라이언트 사용 가능 여부"
            value={isSupabaseConfigured ? "가능" : "불가"}
          />
        </div>

        {globalErrorMessage ? (
          <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-5 text-sm leading-6 text-rose-700">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" strokeWidth={1.8} />
              <div className="min-w-0">
                <p className="font-semibold">실패 시 error.message 전체</p>
                <pre className="mt-2 whitespace-pre-wrap break-words font-sans">
                  {globalErrorMessage}
                </pre>
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm leading-6 text-emerald-700">
            <div className="flex items-start gap-3">
              <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0" strokeWidth={1.8} />
              <p>
                현재 화면은 mock data fallback 없이 실제 Supabase 조회 결과만 표시합니다.
              </p>
            </div>
          </div>
        )}
      </section>

      <ResultSection
        title="profiles 최근 5명"
        description="생성일 기준 최근 프로필 5건을 실제 Supabase에서 조회합니다."
        loading={loading}
        error={profilesState.error}
        rows={profilesState.rows}
        columns={profileColumns}
        firstRowSummary={profilesFirstRowSummary}
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
              <td className="px-4 py-4 text-slate-500">
                {formatDateTime(profile.created_at)}
              </td>
            </tr>
          ))
        }
      />

      <ResultSection
        title="projects 전체"
        description="프로젝트 테이블 전체 목록을 실제 Supabase에서 조회합니다."
        loading={loading}
        error={projectsState.error}
        rows={projectsState.rows}
        columns={projectColumns}
        firstRowSummary={projectsFirstRowSummary}
        renderRows={(rows) =>
          rows.map((project) => (
            <tr key={project.id} className="border-b border-slate-100 last:border-b-0">
              <td className="px-4 py-4 font-medium text-slate-900">{project.name}</td>
              <td className="px-4 py-4 text-center">
                <StatusBadge status={mapProjectStatusToBadge(project.status)} />
              </td>
              <td className="px-4 py-4 text-slate-500">
                {formatDateTime(project.created_at)}
              </td>
              <td className="px-4 py-4 text-slate-600">{project.description || "-"}</td>
            </tr>
          ))
        }
      />

      <ResultSection
        title="expense_categories 전체"
        description="경비 유형 테이블 전체 목록을 실제 Supabase에서 조회합니다."
        loading={loading}
        error={categoriesState.error}
        rows={categoriesState.rows}
        columns={categoryColumns}
        firstRowSummary={categoriesFirstRowSummary}
        renderRows={(rows) =>
          rows.map((category) => (
            <tr key={category.id} className="border-b border-slate-100 last:border-b-0">
              <td className="px-4 py-4 font-medium text-slate-900">{category.name}</td>
              <td className="px-4 py-4 text-center">
                <StatusBadge status={category.is_active ? "활성" : "비활성"} />
              </td>
              <td className="px-4 py-4 text-slate-500">
                {formatDateTime(category.created_at)}
              </td>
            </tr>
          ))
        }
      />

      <ResultSection
        title="expense_requests 최근 5건"
        description="요청일 기준 최근 지출 요청 5건을 실제 Supabase에서 조회합니다."
        loading={loading}
        error={expenseRequestsState.error}
        rows={expenseRequestsState.rows}
        columns={expenseRequestColumns}
        firstRowSummary={expenseRequestsFirstRowSummary}
        renderRows={(rows) =>
          rows.map((request) => (
            <tr key={request.id} className="border-b border-slate-100 last:border-b-0">
              <td className="px-4 py-4 font-medium text-slate-700">
                {request.request_no}
              </td>
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
              <td className="px-4 py-4 text-slate-500">
                {formatDate(request.requested_at)}
              </td>
            </tr>
          ))
        }
      />
    </div>
  );
}
