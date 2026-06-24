"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  AlertTriangle,
  BadgeCheck,
  FolderKanban,
  Landmark,
  WalletCards,
} from "lucide-react";

import { AmountText } from "@/components/common/AmountText";
import { DashboardTable } from "@/components/common/DashboardTable";
import { EmptyState } from "@/components/common/EmptyState";
import { PageHeader } from "@/components/common/PageHeader";
import { ProgressBar } from "@/components/common/ProgressBar";
import { StatCard } from "@/components/common/StatCard";
import { roleViews } from "@/data/uiOptions";
import {
  getSupabaseBrowserClient,
  isSupabaseConfigured,
} from "@/lib/supabase/client";
import type { BudgetHealthStatus } from "@/types";
import {
  formatSupabaseDate,
  getRequestSortValue,
  getSingleRelation,
  type DbExpenseStatus,
} from "@/utils/expenseRequests";
import {
  calculateProjectBudgetMetrics,
  getBudgetHealthBadgeClassName,
  getBudgetHealthProgressTone,
  toBudgetNumber,
  type DbProjectBudgetStatus,
} from "@/utils/projectBudget";
import { getUserFacingSupabaseMessage } from "@/utils/userFacingError";

type RelationValue<T> = T | T[] | null;

type ProjectRow = {
  id: string;
  name: string;
  description: string | null;
  status: string | null;
  created_at: string | null;
  budget_amount: number | string | null;
  used_amount: number | string | null;
  remaining_amount: number | string | null;
  budget_status: DbProjectBudgetStatus | null;
};

type CategoryRelation = {
  id: string;
  name: string;
};

type ProjectExpenseRequestRow = {
  id: string;
  project_id: string | null;
  amount: number;
  status: DbExpenseStatus;
  expense_date: string;
  requested_at: string | null;
  created_at: string | null;
  category: RelationValue<CategoryRelation>;
};

type ProjectStatusLabel = "진행중" | "준비중" | "종료" | "상태 미정";

type CategoryAggregate = {
  category: string;
  requestCount: number;
  approvedAmount: number;
  pendingAmount: number;
  recentExpenseDate: string | null;
  statusLabel: "집행중" | "검토중" | "요청 있음" | "데이터 없음";
};

type ProjectSummary = {
  id: string;
  name: string;
  description: string | null;
  createdAt: string | null;
  statusLabel: ProjectStatusLabel;
  requestCount: number;
  totalRequestedAmount: number;
  approvedAmount: number;
  pendingAmount: number;
  recentRequestDate: string | null;
  categoryAggregates: CategoryAggregate[];
  totalBudget: number;
  usedBudget: number;
  remainingBudget: number;
  usageRate: number;
  budgetStatus: BudgetHealthStatus;
  budgetConfigured: boolean;
};

const detailColumns = [
  { key: "category", label: "경비 유형" },
  { key: "requestCount", label: "요청 건수", align: "right" as const },
  { key: "approvedAmount", label: "사용 금액", align: "right" as const },
  { key: "pendingAmount", label: "승인 예정 금액", align: "right" as const },
  { key: "recentExpenseDate", label: "최근 사용일", align: "center" as const },
  { key: "status", label: "상태", align: "center" as const },
];

function ToneBadge({
  children,
  className,
}: {
  children: ReactNode;
  className: string;
}) {
  return (
    <span
      className={[
        "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold",
        className,
      ].join(" ")}
    >
      {children}
    </span>
  );
}

function mapProjectStatusLabel(status: string | null): ProjectStatusLabel {
  if (!status) {
    return "상태 미정";
  }

  const normalized = status.trim().toLowerCase();

  if (normalized === "active" || normalized === "in_progress" || normalized === "진행중") {
    return "진행중";
  }

  if (normalized === "planning" || normalized === "planned" || normalized === "준비중") {
    return "준비중";
  }

  if (
    normalized === "completed" ||
    normalized === "closed" ||
    normalized === "archived" ||
    normalized === "종료"
  ) {
    return "종료";
  }

  return "상태 미정";
}

function getProjectStatusTone(status: ProjectStatusLabel) {
  switch (status) {
    case "진행중":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "준비중":
      return "border-amber-200 bg-amber-50 text-amber-700";
    case "종료":
      return "border-slate-300 bg-slate-100 text-slate-600";
    case "상태 미정":
    default:
      return "border-slate-200 bg-slate-50 text-slate-600";
  }
}

function getCategoryStatusTone(status: CategoryAggregate["statusLabel"]) {
  switch (status) {
    case "집행중":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "검토중":
      return "border-amber-200 bg-amber-50 text-amber-700";
    case "요청 있음":
      return "border-sky-200 bg-sky-50 text-sky-700";
    case "데이터 없음":
    default:
      return "border-slate-200 bg-slate-100 text-slate-600";
  }
}

function mapBudgetStatusLabel(status: BudgetHealthStatus, budgetConfigured: boolean) {
  if (!budgetConfigured) {
    return "예산 미설정";
  }

  return status;
}

function buildProjectSummary(
  project: ProjectRow,
  expenseRequests: ProjectExpenseRequestRow[],
): ProjectSummary {
  const projectRows = expenseRequests.filter((row) => row.project_id === project.id);
  const pendingRows = projectRows.filter(
    (row) => row.status === "submitted" || row.status === "revision_requested",
  );
  const budgetMetrics = calculateProjectBudgetMetrics(
    toBudgetNumber(project.budget_amount),
    toBudgetNumber(project.used_amount),
    project.budget_status,
  );

  const categoryMap = new Map<string, CategoryAggregate>();

  projectRows.forEach((row) => {
    const categoryName = getSingleRelation(row.category)?.name ?? "미분류";
    const current = categoryMap.get(categoryName) ?? {
      category: categoryName,
      requestCount: 0,
      approvedAmount: 0,
      pendingAmount: 0,
      recentExpenseDate: null,
      statusLabel: "데이터 없음" as const,
    };

    current.requestCount += 1;

    if (row.status === "approved") {
      current.approvedAmount += row.amount;
    }

    if (row.status === "submitted" || row.status === "revision_requested") {
      current.pendingAmount += row.amount;
    }

    const currentDateValue = current.recentExpenseDate ?? "";
    if (row.expense_date > currentDateValue) {
      current.recentExpenseDate = row.expense_date;
    }

    if (current.approvedAmount > 0 && current.pendingAmount > 0) {
      current.statusLabel = "집행중";
    } else if (current.pendingAmount > 0) {
      current.statusLabel = "검토중";
    } else if (current.requestCount > 0) {
      current.statusLabel = "요청 있음";
    }

    categoryMap.set(categoryName, current);
  });

  return {
    id: project.id,
    name: project.name,
    description: project.description,
    createdAt: project.created_at,
    statusLabel: mapProjectStatusLabel(project.status),
    requestCount: projectRows.length,
    totalRequestedAmount: projectRows.reduce((sum, row) => sum + row.amount, 0),
    approvedAmount: budgetMetrics.usedAmount,
    pendingAmount: pendingRows.reduce((sum, row) => sum + row.amount, 0),
    recentRequestDate:
      [...projectRows]
        .sort((left, right) => getRequestSortValue(right).localeCompare(getRequestSortValue(left)))
        .map((row) => getRequestSortValue(row))[0] ?? null,
    categoryAggregates: [...categoryMap.values()].sort(
      (left, right) => right.requestCount - left.requestCount,
    ),
    totalBudget: budgetMetrics.budgetAmount,
    usedBudget: budgetMetrics.usedAmount,
    remainingBudget: budgetMetrics.remainingAmount,
    usageRate: budgetMetrics.usageRate,
    budgetStatus: budgetMetrics.status,
    budgetConfigured: budgetMetrics.budgetConfigured,
  };
}

export default function ProjectBudgetPage() {
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [expenseRequests, setExpenseRequests] = useState<ProjectExpenseRequestRow[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadProjectBudgetData() {
      setIsLoading(true);
      setLoadError(null);

      if (!isSupabaseConfigured) {
        if (isMounted) {
          setLoadError("Supabase 연결 정보가 설정되지 않았습니다.");
          setProjects([]);
          setExpenseRequests([]);
          setIsLoading(false);
        }
        return;
      }

      try {
        const supabase = getSupabaseBrowserClient();
        const [projectsResult, requestsResult] = await Promise.all([
          supabase
            .from("projects")
            .select(
              "id, name, description, status, created_at, budget_amount, used_amount, remaining_amount, budget_status",
            )
            .order("created_at", { ascending: false }),
          supabase
            .from("expense_requests")
            .select(
              `
                id,
                project_id,
                amount,
                status,
                expense_date,
                requested_at,
                created_at,
                category:expense_categories!expense_requests_category_id_fkey (
                  id,
                  name
                )
              `,
            )
            .not("project_id", "is", null)
            .order("requested_at", { ascending: false })
            .order("created_at", { ascending: false }),
        ]);

        if (projectsResult.error) {
          throw projectsResult.error;
        }

        if (requestsResult.error) {
          throw requestsResult.error;
        }

        if (!isMounted) {
          return;
        }

        setProjects((projectsResult.data ?? []) as ProjectRow[]);
        setExpenseRequests((requestsResult.data ?? []) as ProjectExpenseRequestRow[]);
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setLoadError(
          getUserFacingSupabaseMessage(
            error,
            "프로젝트 예산 화면의 데이터를 불러오지 못했습니다.",
          ),
        );
        setProjects([]);
        setExpenseRequests([]);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadProjectBudgetData();

    return () => {
      isMounted = false;
    };
  }, []);

  const projectSummaries = useMemo(
    () => projects.map((project) => buildProjectSummary(project, expenseRequests)),
    [expenseRequests, projects],
  );

  const effectiveSelectedProjectId = projectSummaries.some(
    (project) => project.id === selectedProjectId,
  )
    ? selectedProjectId
    : (projectSummaries[0]?.id ?? "");

  const selectedProject =
    projectSummaries.find((project) => project.id === effectiveSelectedProjectId) ?? null;

  const overallBudgetAmount = projectSummaries.reduce(
    (sum, project) => sum + project.totalBudget,
    0,
  );
  const overallUsedAmount = projectSummaries.reduce(
    (sum, project) => sum + project.usedBudget,
    0,
  );
  const overallPendingAmount = projectSummaries.reduce(
    (sum, project) => sum + project.pendingAmount,
    0,
  );
  const overallRemainingAmount = projectSummaries.reduce(
    (sum, project) => sum + project.remainingBudget,
    0,
  );
  const configuredBudgetCount = projectSummaries.filter((project) => project.budgetConfigured).length;

  const summaryCards = [
    {
      id: "total-budget",
      title: "전체 프로젝트 예산",
      description: "projects.budget_amount 기준 합계",
      value: isLoading ? null : <AmountText value={overallBudgetAmount} />,
      icon: <WalletCards className="h-5 w-5" strokeWidth={1.8} />,
    },
    {
      id: "used-budget",
      title: "누적 사용 예산",
      description: "status = approved 기준 프로젝트별 실제 사용액 합계",
      value: isLoading ? null : <AmountText value={overallUsedAmount} />,
      icon: <BadgeCheck className="h-5 w-5" strokeWidth={1.8} />,
    },
    {
      id: "pending-budget",
      title: "승인 예정 예산",
      description: "submitted, revision_requested 기준 합계",
      value: isLoading ? null : <AmountText value={overallPendingAmount} />,
      icon: <Landmark className="h-5 w-5" strokeWidth={1.8} />,
    },
    {
      id: "remaining-budget",
      title: "전체 잔여 예산",
      description: "총예산 - 사용 예산 기준 합계",
      value: isLoading ? null : <AmountText value={overallRemainingAmount} />,
      icon: <FolderKanban className="h-5 w-5" strokeWidth={1.8} />,
    },
  ];

  return (
    <div className="space-y-8">
      <PageHeader
        title="프로젝트 예산"
        description="Supabase 프로젝트 예산과 실제 승인 지출 기준으로 사용률과 잔여 예산을 확인합니다."
        roles={roleViews}
        activeRole="관리자 보기"
        eyebrow="예산 운영"
        badgeText="Supabase 예산 연동"
      />

      {loadError ? (
        <section className="rounded-[1.75rem] border border-rose-200 bg-rose-50 px-5 py-4 text-sm leading-6 text-rose-700 shadow-sm">
          <p className="font-semibold">프로젝트 예산 데이터를 불러오지 못했습니다.</p>
          <p className="mt-2 whitespace-pre-wrap break-words">{loadError}</p>
        </section>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((summary) => (
          <StatCard
            key={summary.id}
            title={summary.title}
            description={summary.description}
            value={
              summary.value ?? (
                <span className="text-base font-medium text-slate-400">불러오는 중...</span>
              )
            }
            icon={summary.icon}
          />
        ))}
      </section>

      <section className="rounded-[1.75rem] border border-slate-200/90 bg-[var(--card-secondary)] p-5 shadow-sm">
        <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-4 text-sm leading-6 text-slate-600">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-[var(--primary)]" strokeWidth={1.9} />
          <div className="space-y-1">
            <p className="font-semibold text-slate-900">
              예산이 설정된 프로젝트 {configuredBudgetCount}개 / 전체 {projectSummaries.length}개
            </p>
            <p>
              승인 완료 지출만 사용 예산으로 반영되며, 프로젝트 예산이 없는 경우 사용률은 계산하지 않고
              예산 미설정으로 표시합니다.
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-[1.75rem] border border-slate-200/90 bg-white p-5 shadow-sm">
        <div className="mb-5 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-950">프로젝트별 예산 현황</h3>
            <p className="mt-1 text-sm text-slate-500">
              각 프로젝트의 총예산, 사용 예산, 승인 예정 금액, 잔여 예산을 함께 확인합니다.
            </p>
          </div>
          <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">
            총 {projectSummaries.length}개 프로젝트
          </span>
        </div>

        {isLoading ? (
          <EmptyState
            title="프로젝트 데이터를 불러오는 중입니다."
            description="Supabase projects와 expense_requests를 함께 조회하고 있습니다."
          />
        ) : null}

        {!isLoading && projectSummaries.length === 0 ? (
          <EmptyState
            title="표시할 프로젝트가 없습니다."
            description="Supabase projects 테이블에 프로젝트와 예산을 등록하면 이 화면에 실제 데이터만 표시됩니다."
          />
        ) : null}

        {!isLoading && projectSummaries.length > 0 ? (
          <div className="grid gap-4 xl:grid-cols-2 2xl:grid-cols-4">
            {projectSummaries.map((project) => (
              <button
                key={project.id}
                type="button"
                onClick={() => setSelectedProjectId(project.id)}
                aria-pressed={selectedProject?.id === project.id}
                className={[
                  "rounded-[1.5rem] border bg-slate-50/70 p-5 text-left shadow-sm transition",
                  selectedProject?.id === project.id
                    ? "border-[var(--primary)] bg-white ring-4 ring-[color:rgba(22,59,111,0.08)]"
                    : "border-slate-200 hover:border-slate-300 hover:bg-white",
                ].join(" ")}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                      Project
                    </p>
                    <h4 className="mt-2 text-lg font-semibold text-slate-950">{project.name}</h4>
                    <p className="mt-2 line-clamp-2 text-sm text-slate-500">
                      {project.description?.trim() || "프로젝트 설명이 아직 등록되지 않았습니다."}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <ToneBadge className={getProjectStatusTone(project.statusLabel)}>
                      {project.statusLabel}
                    </ToneBadge>
                    <ToneBadge className={getBudgetHealthBadgeClassName(project.budgetStatus)}>
                      {mapBudgetStatusLabel(project.budgetStatus, project.budgetConfigured)}
                    </ToneBadge>
                  </div>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl bg-white px-4 py-3 shadow-sm">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                      총예산
                    </p>
                    <p className="mt-2 text-sm font-semibold text-slate-950">
                      {project.budgetConfigured ? (
                        <AmountText value={project.totalBudget} />
                      ) : (
                        <span className="text-slate-400">미설정</span>
                      )}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-white px-4 py-3 shadow-sm">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                      사용 예산
                    </p>
                    <p className="mt-2 text-sm font-semibold text-slate-950">
                      <AmountText value={project.usedBudget} />
                    </p>
                  </div>
                  <div className="rounded-2xl bg-white px-4 py-3 shadow-sm">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                      승인 예정
                    </p>
                    <p className="mt-2 text-sm font-semibold text-[var(--primary)]">
                      <AmountText value={project.pendingAmount} />
                    </p>
                  </div>
                  <div className="rounded-2xl bg-white px-4 py-3 shadow-sm">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                      잔여 예산
                    </p>
                    <p
                      className={[
                        "mt-2 text-sm font-semibold",
                        project.remainingBudget < 0 ? "text-rose-600" : "text-slate-900",
                      ].join(" ")}
                    >
                      <AmountText value={project.remainingBudget} />
                    </p>
                  </div>
                </div>

                <div className="mt-5">
                  <ProgressBar
                    label="예산 사용률"
                    value={project.usedBudget}
                    max={project.totalBudget || 100}
                    rightText={
                      project.budgetConfigured ? `${project.usageRate}%` : "예산 미설정"
                    }
                    description={
                      project.budgetConfigured
                        ? `총예산 ${project.totalBudget.toLocaleString("ko-KR")}원 / 사용 ${project.usedBudget.toLocaleString("ko-KR")}원`
                        : `요청 ${project.requestCount}건 / 최근 요청일 ${formatSupabaseDate(project.recentRequestDate)}`
                    }
                    tone={getBudgetHealthProgressTone(project.budgetStatus)}
                  />
                </div>
              </button>
            ))}
          </div>
        ) : null}
      </section>

      {selectedProject ? (
        <section className="rounded-[1.75rem] border border-slate-200/90 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h3 className="text-lg font-semibold text-slate-950">{selectedProject.name} 상세</h3>
                <ToneBadge className={getProjectStatusTone(selectedProject.statusLabel)}>
                  {selectedProject.statusLabel}
                </ToneBadge>
                <ToneBadge className={getBudgetHealthBadgeClassName(selectedProject.budgetStatus)}>
                  {mapBudgetStatusLabel(selectedProject.budgetStatus, selectedProject.budgetConfigured)}
                </ToneBadge>
              </div>
              <p className="mt-2 text-sm text-slate-500">
                선택한 프로젝트의 실제 승인 지출과 승인 예정 지출 기준으로 예산 현황을 보여줍니다.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-600">
              등록일{" "}
              <span className="font-semibold text-slate-900">
                {formatSupabaseDate(selectedProject.createdAt)}
              </span>
            </div>
          </div>

          {!selectedProject.budgetConfigured ? (
            <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm leading-6 text-amber-800">
              이 프로젝트는 아직 총예산이 설정되지 않았습니다. `projects.budget_amount`를 입력하면 사용률과
              잔여 예산이 바로 계산됩니다.
            </div>
          ) : null}

          <div className="mt-5 grid gap-3 lg:grid-cols-4">
            <div className="rounded-2xl bg-slate-50 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                총예산
              </p>
              <p className="mt-2 text-sm font-semibold text-slate-950">
                <AmountText value={selectedProject.totalBudget} />
              </p>
            </div>
            <div className="rounded-2xl bg-slate-50 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                사용 예산
              </p>
              <p className="mt-2 text-sm font-semibold text-[var(--primary)]">
                <AmountText value={selectedProject.usedBudget} />
              </p>
            </div>
            <div className="rounded-2xl bg-slate-50 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                승인 예정 금액
              </p>
              <p className="mt-2 text-sm font-semibold text-slate-950">
                <AmountText value={selectedProject.pendingAmount} />
              </p>
            </div>
            <div className="rounded-2xl bg-slate-50 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                잔여 예산
              </p>
              <p
                className={[
                  "mt-2 text-sm font-semibold",
                  selectedProject.remainingBudget < 0 ? "text-rose-600" : "text-slate-950",
                ].join(" ")}
              >
                <AmountText value={selectedProject.remainingBudget} />
              </p>
            </div>
          </div>

          <div className="mt-6">
            <ProgressBar
              label="프로젝트 예산 사용률"
              value={selectedProject.usedBudget}
              max={selectedProject.totalBudget || 100}
              rightText={
                selectedProject.budgetConfigured
                  ? `${selectedProject.usageRate}%`
                  : "예산 미설정"
              }
              description={
                selectedProject.budgetConfigured
                  ? `총예산 ${selectedProject.totalBudget.toLocaleString("ko-KR")}원 대비 사용 ${selectedProject.usedBudget.toLocaleString("ko-KR")}원`
                  : "프로젝트 총예산이 등록되면 사용률이 계산됩니다."
              }
              tone={getBudgetHealthProgressTone(selectedProject.budgetStatus)}
            />
          </div>

          <div className="mt-6">
            <div className="mb-4">
              <h4 className="text-base font-semibold text-slate-950">경비 유형별 사용 현황</h4>
              <p className="mt-1 text-sm text-slate-500">
                카테고리별로 실제 사용 금액과 승인 예정 금액을 함께 표시합니다.
              </p>
            </div>

            {selectedProject.categoryAggregates.length === 0 ? (
              <EmptyState
                title="이 프로젝트에 연결된 경비 요청이 없습니다."
                description="지출 기안 작성 시 프로젝트를 선택하고 제출하면 이 영역에 실제 집계가 표시됩니다."
              />
            ) : (
              <DashboardTable columns={detailColumns}>
                {selectedProject.categoryAggregates.map((item) => (
                  <tr key={item.category} className="border-b border-slate-100 last:border-b-0">
                    <td className="px-4 py-4 font-medium text-slate-900">{item.category}</td>
                    <td className="px-4 py-4 text-right text-slate-700">{item.requestCount}건</td>
                    <td className="px-4 py-4 text-right font-medium text-slate-900">
                      <AmountText value={item.approvedAmount} />
                    </td>
                    <td className="px-4 py-4 text-right text-[var(--primary)]">
                      <AmountText value={item.pendingAmount} />
                    </td>
                    <td className="px-4 py-4 text-center text-slate-500">
                      {formatSupabaseDate(item.recentExpenseDate)}
                    </td>
                    <td className="px-4 py-4 text-center">
                      <ToneBadge className={getCategoryStatusTone(item.statusLabel)}>
                        {item.statusLabel}
                      </ToneBadge>
                    </td>
                  </tr>
                ))}
              </DashboardTable>
            )}
          </div>
        </section>
      ) : null}
    </div>
  );
}
