"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import {
  FolderKanban,
  Plus,
  Settings2,
  ShieldCheck,
  Users,
  X,
} from "lucide-react";

import { useAuth } from "@/components/auth/AuthProvider";
import { AmountText } from "@/components/common/AmountText";
import { DashboardTable } from "@/components/common/DashboardTable";
import { EmptyState } from "@/components/common/EmptyState";
import { PageHeader } from "@/components/common/PageHeader";
import { StatCard } from "@/components/common/StatCard";
import { StatusBadge } from "@/components/common/StatusBadge";
import { roleViews } from "@/data/uiOptions";
import {
  getSupabaseBrowserClient,
  isSupabaseConfigured,
} from "@/lib/supabase/client";
import { formatSupabaseDate } from "@/utils/expenseRequests";
import { mapAuthRoleLabel, mapAuthRoleToView } from "@/utils/auth";
import {
  calculateProjectBudgetMetrics,
  getBudgetHealthBadgeClassName,
  type DbProjectBudgetStatus,
} from "@/utils/projectBudget";
import { getUserFacingSupabaseMessage } from "@/utils/userFacingError";

type SettingsTabKey =
  | "users"
  | "projects"
  | "expense-types"
  | "accounts"
  | "settlement-policy";

type FeedbackState = {
  type: "success" | "error";
  message: string;
};

type ProfileRow = {
  id: string;
  email: string | null;
  name: string | null;
  department: string | null;
  role: string | null;
  is_active: boolean | null;
  created_at: string | null;
};

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

type ExpenseCategoryRow = {
  id: string;
  name: string;
  is_active: boolean | null;
  created_at: string | null;
};

type ProjectFormState = {
  name: string;
  description: string;
  status: string;
  budgetAmount: string;
};

const tabs: Array<{ key: SettingsTabKey; label: string }> = [
  { key: "users", label: "사용자 관리" },
  { key: "projects", label: "프로젝트 관리" },
  { key: "expense-types", label: "경비 유형 관리" },
  { key: "accounts", label: "계좌 관리" },
  { key: "settlement-policy", label: "정산 정책" },
];

const userColumns = [
  { key: "name", label: "이름" },
  { key: "email", label: "이메일" },
  { key: "department", label: "부서" },
  { key: "role", label: "권한", align: "center" as const },
  { key: "status", label: "상태", align: "center" as const },
  { key: "createdAt", label: "등록일", align: "center" as const },
];

const projectColumns = [
  { key: "projectName", label: "프로젝트명" },
  { key: "status", label: "진행 상태", align: "center" as const },
  { key: "budgetAmount", label: "총 예산", align: "right" as const },
  { key: "usedAmount", label: "사용 예산", align: "right" as const },
  { key: "remainingAmount", label: "잔여 예산", align: "right" as const },
  { key: "budgetStatus", label: "예산 상태", align: "center" as const },
  { key: "manage", label: "관리", align: "center" as const },
];

const projectStatusOptions = [
  { value: "planning", label: "준비중" },
  { value: "active", label: "진행중" },
  { value: "completed", label: "종료" },
];

function createProjectFormState(project?: ProjectRow | null): ProjectFormState {
  return {
    name: project?.name ?? "",
    description: project?.description ?? "",
    status: project?.status ?? "planning",
    budgetAmount:
      project?.budget_amount === null || project?.budget_amount === undefined
        ? "0"
        : String(project.budget_amount),
  };
}

function ToneBadge({ children, className }: { children: ReactNode; className: string }) {
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

function mapProfileRole(role: string | null) {
  switch (role) {
    case "admin":
      return {
        label: "admin",
        className:
          "border-[color:rgba(22,59,111,0.14)] bg-[var(--primary-soft)] text-[var(--primary)]",
      };
    case "manager":
      return {
        label: "manager",
        className: "border-sky-200 bg-sky-50 text-sky-700",
      };
    case "employee":
    default:
      return {
        label: "employee",
        className: "border-slate-200 bg-slate-100 text-slate-700",
      };
  }
}

function mapProjectStatus(status: string | null) {
  const normalized = status?.trim().toLowerCase();

  if (normalized === "active" || normalized === "in_progress") {
    return { label: "진행중", className: "border-emerald-200 bg-emerald-50 text-emerald-700" };
  }

  if (normalized === "planning" || normalized === "planned") {
    return { label: "준비중", className: "border-amber-200 bg-amber-50 text-amber-700" };
  }

  if (normalized === "completed" || normalized === "closed" || normalized === "archived") {
    return { label: "종료", className: "border-slate-300 bg-slate-100 text-slate-600" };
  }

  return { label: "상태 미정", className: "border-slate-200 bg-slate-50 text-slate-600" };
}

function SectionCard({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-[1.75rem] border border-slate-200/90 bg-white p-5 shadow-sm">
      <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-950">{title}</h3>
          <p className="mt-1 text-sm text-slate-500">{description}</p>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function SecondaryButton({
  children,
  onClick,
}: {
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
    >
      {children}
    </button>
  );
}

export default function SettingsPage() {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState<SettingsTabKey>("users");
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [expenseCategories, setExpenseCategories] = useState<ExpenseCategoryRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [projectModalTarget, setProjectModalTarget] = useState<ProjectRow | null>(null);
  const [projectForm, setProjectForm] = useState<ProjectFormState>(createProjectFormState());
  const [projectFormError, setProjectFormError] = useState<string | null>(null);
  const [isProjectSaving, setIsProjectSaving] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadSettingsData() {
      setIsLoading(true);
      setLoadError(null);

      if (!isSupabaseConfigured) {
        if (isMounted) {
          setLoadError(
            "Supabase 환경변수가 설정되지 않았습니다. NEXT_PUBLIC_SUPABASE_URL과 NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY를 확인해 주세요.",
          );
          setProfiles([]);
          setProjects([]);
          setExpenseCategories([]);
          setIsLoading(false);
        }
        return;
      }

      try {
        const supabase = getSupabaseBrowserClient();
        const [profilesResult, projectsResult, categoriesResult] = await Promise.all([
          supabase
            .from("profiles")
            .select("id, email, name, department, role, is_active, created_at")
            .order("created_at", { ascending: false }),
          supabase
            .from("projects")
            .select(
              "id, name, description, status, created_at, budget_amount, used_amount, remaining_amount, budget_status",
            )
            .order("created_at", { ascending: false }),
          supabase
            .from("expense_categories")
            .select("id, name, is_active, created_at")
            .order("created_at", { ascending: false }),
        ]);

        if (profilesResult.error) {
          throw profilesResult.error;
        }

        if (projectsResult.error) {
          throw projectsResult.error;
        }

        if (categoriesResult.error) {
          throw categoriesResult.error;
        }

        if (!isMounted) {
          return;
        }

        setProfiles((profilesResult.data ?? []) as ProfileRow[]);
        setProjects((projectsResult.data ?? []) as ProjectRow[]);
        setExpenseCategories((categoriesResult.data ?? []) as ExpenseCategoryRow[]);
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setLoadError(
          getUserFacingSupabaseMessage(error, "설정 화면 데이터를 불러오지 못했습니다."),
        );
        setProfiles([]);
        setProjects([]);
        setExpenseCategories([]);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadSettingsData();

    return () => {
      isMounted = false;
    };
  }, [reloadToken]);

  const summaryData = useMemo(() => {
    const activeUserCount = profiles.filter((item) => item.is_active).length;
    const activeCategoryCount = expenseCategories.filter((item) => item.is_active).length;
    const configuredBudgetCount = projects.filter(
      (project) => Number(project.budget_amount ?? 0) > 0,
    ).length;

    return {
      totalUsers: profiles.length,
      activeUserCount,
      projectCount: projects.length,
      activeCategoryCount,
      configuredBudgetCount,
    };
  }, [expenseCategories, profiles, projects]);

  function openCreateProjectModal() {
    setFeedback(null);
    setProjectModalTarget(null);
    setProjectForm(createProjectFormState());
    setProjectFormError(null);
    setIsProjectModalOpen(true);
  }

  function openEditProjectModal(project: ProjectRow) {
    setFeedback(null);
    setProjectModalTarget(project);
    setProjectForm(createProjectFormState(project));
    setProjectFormError(null);
    setIsProjectModalOpen(true);
  }

  function closeProjectModal() {
    setIsProjectModalOpen(false);
    setProjectModalTarget(null);
    setProjectForm(createProjectFormState());
    setProjectFormError(null);
  }

  async function handleProjectSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setProjectFormError(null);
    setFeedback(null);

    if (!isSupabaseConfigured) {
      setProjectFormError(
        "Supabase 환경변수가 설정되지 않았습니다. NEXT_PUBLIC_SUPABASE_URL과 NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY를 확인해 주세요.",
      );
      return;
    }

    const normalizedName = projectForm.name.trim();
    const normalizedDescription = projectForm.description.trim();
    const numericBudgetAmount = Number(projectForm.budgetAmount);

    if (normalizedName.length === 0) {
      setProjectFormError("프로젝트명을 입력해 주세요.");
      return;
    }

    if (!Number.isFinite(numericBudgetAmount) || numericBudgetAmount < 0) {
      setProjectFormError("총 예산은 0 이상의 숫자로 입력해 주세요.");
      return;
    }

    setIsProjectSaving(true);

    try {
      const supabase = getSupabaseBrowserClient();
      const payload = {
        name: normalizedName,
        description: normalizedDescription.length > 0 ? normalizedDescription : null,
        status: projectForm.status,
        budget_amount: numericBudgetAmount,
      };

      const query = projectModalTarget
        ? supabase.from("projects").update(payload).eq("id", projectModalTarget.id)
        : supabase.from("projects").insert(payload);

      const { error } = await query.select("id").single();

      if (error) {
        throw error;
      }

      setFeedback({
        type: "success",
        message: projectModalTarget
          ? "프로젝트 정보와 예산을 저장했습니다."
          : "프로젝트를 추가했습니다.",
      });
      closeProjectModal();
      setReloadToken((current) => current + 1);
    } catch (error) {
      setProjectFormError(
        getUserFacingSupabaseMessage(error, "프로젝트 저장 중 오류가 발생했습니다."),
      );
    } finally {
      setIsProjectSaving(false);
    }
  }

  const summaryCards = [
    {
      id: "total-users",
      title: "전체 사용자 수",
      description: "profiles 테이블 기준",
      value: isLoading ? null : <span>{summaryData.totalUsers}명</span>,
      icon: <Users className="h-5 w-5" strokeWidth={1.8} />,
    },
    {
      id: "active-users",
      title: "활성 사용자 수",
      description: "is_active = true 기준",
      value: isLoading ? null : <span>{summaryData.activeUserCount}명</span>,
      icon: <ShieldCheck className="h-5 w-5" strokeWidth={1.8} />,
    },
    {
      id: "project-count",
      title: "프로젝트 수",
      description: "projects 테이블 기준",
      value: isLoading ? null : <span>{summaryData.projectCount}개</span>,
      icon: <FolderKanban className="h-5 w-5" strokeWidth={1.8} />,
    },
    {
      id: "budget-count",
      title: "예산 설정 프로젝트",
      description: "budget_amount > 0 기준",
      value: isLoading ? null : <span>{summaryData.configuredBudgetCount}개</span>,
      icon: <Settings2 className="h-5 w-5" strokeWidth={1.8} />,
    },
  ];

  const renderUsersTab = () => (
    <SectionCard
      title="사용자 관리"
      description="Supabase profiles 테이블의 실제 사용자 정보를 조회합니다."
    >
      {isLoading ? (
        <EmptyState
          title="사용자 정보를 불러오는 중입니다."
          description="profiles 테이블을 조회하고 있습니다."
        />
      ) : null}

      {!isLoading && profiles.length === 0 ? (
        <EmptyState
          title="등록된 사용자가 없습니다."
          description="Supabase profiles 테이블에 사용자를 생성하면 이 화면에 바로 반영됩니다."
        />
      ) : null}

      {!isLoading && profiles.length > 0 ? (
        <DashboardTable columns={userColumns}>
          {profiles.map((user) => {
            const role = mapProfileRole(user.role);

            return (
              <tr key={user.id} className="border-b border-slate-100 last:border-b-0">
                <td className="px-4 py-4 font-medium text-slate-900">
                  {user.name?.trim() || "이름 없음"}
                </td>
                <td className="px-4 py-4 text-slate-600">{user.email?.trim() || "-"}</td>
                <td className="px-4 py-4 text-slate-700">{user.department?.trim() || "-"}</td>
                <td className="px-4 py-4 text-center">
                  <ToneBadge className={role.className}>{role.label}</ToneBadge>
                </td>
                <td className="px-4 py-4 text-center">
                  <StatusBadge status={user.is_active ? "활성" : "비활성"} />
                </td>
                <td className="px-4 py-4 text-center text-slate-500">
                  {formatSupabaseDate(user.created_at)}
                </td>
              </tr>
            );
          })}
        </DashboardTable>
      ) : null}
    </SectionCard>
  );

  const renderProjectsTab = () => (
    <SectionCard
      title="프로젝트 관리"
      description="프로젝트 기본 정보와 예산을 Supabase projects 테이블 기준으로 관리합니다."
      action={
        <button
          type="button"
          onClick={openCreateProjectModal}
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[var(--primary)] px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:opacity-95"
        >
          <Plus className="h-4 w-4" strokeWidth={2} />
          프로젝트 추가
        </button>
      }
    >
      {isLoading ? (
        <EmptyState
          title="프로젝트 정보를 불러오는 중입니다."
          description="projects 테이블에서 예산 정보와 상태를 조회하고 있습니다."
        />
      ) : null}

      {!isLoading && projects.length === 0 ? (
        <EmptyState
          title="등록된 프로젝트가 없습니다."
          description="프로젝트를 추가하면 예산 관리 화면과 대시보드에 실제 데이터가 반영됩니다."
        />
      ) : null}

      {!isLoading && projects.length > 0 ? (
        <DashboardTable columns={projectColumns}>
          {projects.map((project) => {
            const status = mapProjectStatus(project.status);
            const budget = calculateProjectBudgetMetrics(
              project.budget_amount,
              project.used_amount,
              project.budget_status,
            );

            return (
              <tr key={project.id} className="border-b border-slate-100 last:border-b-0">
                <td className="px-4 py-4">
                  <p className="font-medium text-slate-900">{project.name}</p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    {project.description?.trim() || "설명이 아직 없습니다."}
                  </p>
                </td>
                <td className="px-4 py-4 text-center">
                  <ToneBadge className={status.className}>{status.label}</ToneBadge>
                </td>
                <td className="px-4 py-4 text-right text-slate-700">
                  <AmountText value={budget.budgetAmount} />
                </td>
                <td className="px-4 py-4 text-right text-slate-700">
                  <AmountText value={budget.usedAmount} />
                </td>
                <td className="px-4 py-4 text-right text-slate-700">
                  <AmountText value={budget.remainingAmount} />
                </td>
                <td className="px-4 py-4 text-center">
                  <div className="flex flex-col items-center gap-1">
                    <ToneBadge
                      className={getBudgetHealthBadgeClassName(
                        budget.budgetConfigured ? budget.status : "주의",
                      )}
                    >
                      {budget.budgetConfigured ? budget.status : "미설정"}
                    </ToneBadge>
                    <span className="text-xs text-slate-500">
                      {budget.budgetConfigured ? `${budget.usageRate}% 사용` : "예산 입력 필요"}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-4 text-center">
                  <SecondaryButton onClick={() => openEditProjectModal(project)}>
                    예산 수정
                  </SecondaryButton>
                </td>
              </tr>
            );
          })}
        </DashboardTable>
      ) : null}
    </SectionCard>
  );

  const renderExpenseTypesTab = () => (
    <SectionCard
      title="경비 유형 관리"
      description="Supabase expense_categories 테이블에 등록된 실제 경비 유형을 확인합니다."
    >
      {isLoading ? (
        <EmptyState
          title="경비 유형을 불러오는 중입니다."
          description="expense_categories 테이블을 조회하고 있습니다."
        />
      ) : null}

      {!isLoading && expenseCategories.length === 0 ? (
        <EmptyState
          title="등록된 경비 유형이 없습니다."
          description="expense_categories 테이블에 경비 유형이 추가되면 이 화면에 바로 반영됩니다."
        />
      ) : null}

      {!isLoading && expenseCategories.length > 0 ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {expenseCategories.map((item) => (
            <div
              key={item.id}
              className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-4 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{item.name}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    등록일 {formatSupabaseDate(item.created_at)}
                  </p>
                </div>
                <StatusBadge status={item.is_active ? "활성" : "비활성"} />
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </SectionCard>
  );

  const renderAccountsTab = () => (
    <SectionCard
      title="계좌 관리"
      description="회사 자금 현황 화면에서 별도 관리되는 계좌 데이터와 연결될 예정입니다."
    >
      <EmptyState
        title="계좌 관리 UI는 자금 현황 화면을 사용합니다."
        description="회사 자금 현황 화면에서 company_funds와 fund_transactions를 기준으로 계좌와 거래를 관리해 주세요."
      />
    </SectionCard>
  );

  const renderSettlementPolicyTab = () => (
    <SectionCard
      title="정산 정책"
      description="정산 정책 테이블이 준비되면 이 탭에서 정책값을 직접 관리할 수 있습니다."
    >
      <EmptyState
        title="정산 정책 연결 전입니다."
        description="현재는 실제 정책 테이블이 아직 연결되지 않아 안내만 표시합니다."
      />
    </SectionCard>
  );

  return (
    <div className="space-y-8">
      <PageHeader
        title="설정"
        description="Supabase 마스터 데이터를 기준으로 사용자, 프로젝트, 경비 유형 설정을 관리합니다."
        roles={roleViews}
        activeRole={profile?.role ? mapAuthRoleToView(profile.role) : "대표 보기"}
        eyebrow="시스템 설정"
        badgeText={profile?.role ? `${mapAuthRoleLabel(profile.role)} 권한` : "Supabase 연결"}
      />

      {loadError ? (
        <section className="rounded-[1.75rem] border border-rose-200 bg-rose-50 px-5 py-4 text-sm leading-6 text-rose-700 shadow-sm">
          <p className="font-semibold">설정 화면 데이터를 불러오지 못했습니다.</p>
          <p className="mt-2 whitespace-pre-wrap break-words">{loadError}</p>
        </section>
      ) : null}

      {feedback ? (
        <section
          className={[
            "rounded-[1.75rem] px-5 py-4 text-sm leading-6 shadow-sm",
            feedback.type === "success"
              ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border border-rose-200 bg-rose-50 text-rose-700",
          ].join(" ")}
        >
          <p className="font-semibold">{feedback.type === "success" ? "저장 완료" : "처리 실패"}</p>
          <p className="mt-2 whitespace-pre-wrap break-words">{feedback.message}</p>
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
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-950">설정 메뉴</h3>
            <p className="mt-1 text-sm text-slate-500">
              실제 데이터가 연결된 영역과 아직 연결 전인 영역을 구분해 제공합니다.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={[
                  "rounded-2xl px-4 py-2.5 text-sm font-semibold transition",
                  activeTab === tab.key
                    ? "bg-[var(--primary)] text-white shadow-sm"
                    : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900",
                ].join(" ")}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {activeTab === "users" ? renderUsersTab() : null}
      {activeTab === "projects" ? renderProjectsTab() : null}
      {activeTab === "expense-types" ? renderExpenseTypesTab() : null}
      {activeTab === "accounts" ? renderAccountsTab() : null}
      {activeTab === "settlement-policy" ? renderSettlementPolicyTab() : null}

      {isProjectModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4 py-8">
          <div className="w-full max-w-2xl rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-slate-500">프로젝트 예산 관리</p>
                <h3 className="mt-2 text-2xl font-semibold text-slate-950">
                  {projectModalTarget ? "프로젝트 수정" : "프로젝트 추가"}
                </h3>
                <p className="mt-2 text-sm text-slate-500">
                  프로젝트 기본 정보와 총 예산을 저장하면 사용 예산과 잔여 예산은 승인된 지출 기준으로 자동 계산됩니다.
                </p>
              </div>
              <button
                type="button"
                onClick={closeProjectModal}
                className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 text-slate-500 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-700"
                aria-label="닫기"
              >
                <X className="h-4.5 w-4.5" strokeWidth={1.9} />
              </button>
            </div>

            <form onSubmit={handleProjectSubmit} className="mt-6 space-y-5">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label htmlFor="project-name" className="text-sm font-semibold text-slate-900">
                    프로젝트명
                  </label>
                  <input
                    id="project-name"
                    value={projectForm.name}
                    onChange={(event) =>
                      setProjectForm((current) => ({ ...current, name: event.target.value }))
                    }
                    placeholder="예: AI 일기 서비스 개발"
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-[var(--primary)] focus:ring-4 focus:ring-[color:rgba(22,59,111,0.08)]"
                  />
                </div>
                <div>
                  <label htmlFor="project-status" className="text-sm font-semibold text-slate-900">
                    진행 상태
                  </label>
                  <select
                    id="project-status"
                    value={projectForm.status}
                    onChange={(event) =>
                      setProjectForm((current) => ({ ...current, status: event.target.value }))
                    }
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-[var(--primary)] focus:ring-4 focus:ring-[color:rgba(22,59,111,0.08)]"
                  >
                    {projectStatusOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="project-budget" className="text-sm font-semibold text-slate-900">
                  총 예산
                </label>
                <input
                  id="project-budget"
                  type="number"
                  min="0"
                  inputMode="numeric"
                  value={projectForm.budgetAmount}
                  onChange={(event) =>
                    setProjectForm((current) => ({
                      ...current,
                      budgetAmount: event.target.value,
                    }))
                  }
                  placeholder="0"
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-[var(--primary)] focus:ring-4 focus:ring-[color:rgba(22,59,111,0.08)]"
                />
                <p className="mt-2 text-xs leading-5 text-slate-500">
                  승인된 지출은 DB trigger 기준으로 자동 누적되며, used_amount와 remaining_amount가 함께 갱신됩니다.
                </p>
              </div>

              <div>
                <label
                  htmlFor="project-description"
                  className="text-sm font-semibold text-slate-900"
                >
                  설명
                </label>
                <textarea
                  id="project-description"
                  rows={4}
                  value={projectForm.description}
                  onChange={(event) =>
                    setProjectForm((current) => ({
                      ...current,
                      description: event.target.value,
                    }))
                  }
                  placeholder="프로젝트 목적이나 예산 운영 메모를 입력해 주세요."
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm leading-6 text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-[var(--primary)] focus:ring-4 focus:ring-[color:rgba(22,59,111,0.08)]"
                />
              </div>

              {projectModalTarget ? (
                <div className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-700 md:grid-cols-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                      현재 사용 예산
                    </p>
                    <div className="mt-2 font-semibold text-slate-900">
                      <AmountText value={Number(projectModalTarget.used_amount ?? 0)} />
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                      현재 잔여 예산
                    </p>
                    <div className="mt-2 font-semibold text-slate-900">
                      <AmountText value={Number(projectModalTarget.remaining_amount ?? 0)} />
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                      예산 상태
                    </p>
                    <div className="mt-2">
                      <ToneBadge
                        className={getBudgetHealthBadgeClassName(
                          calculateProjectBudgetMetrics(
                            projectModalTarget.budget_amount,
                            projectModalTarget.used_amount,
                            projectModalTarget.budget_status,
                          ).status,
                        )}
                      >
                        {
                          calculateProjectBudgetMetrics(
                            projectModalTarget.budget_amount,
                            projectModalTarget.used_amount,
                            projectModalTarget.budget_status,
                          ).status
                        }
                      </ToneBadge>
                    </div>
                  </div>
                </div>
              ) : null}

              {projectFormError ? (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm leading-6 text-rose-700">
                  {projectFormError}
                </div>
              ) : null}

              <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeProjectModal}
                  className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={isProjectSaving}
                  className={[
                    "inline-flex items-center justify-center rounded-2xl px-4 py-3 text-sm font-semibold shadow-sm transition",
                    isProjectSaving
                      ? "cursor-not-allowed bg-slate-200 text-slate-500"
                      : "bg-[var(--primary)] text-white hover:opacity-95",
                  ].join(" ")}
                >
                  {isProjectSaving
                    ? "저장 중..."
                    : projectModalTarget
                      ? "변경사항 저장"
                      : "프로젝트 추가"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
