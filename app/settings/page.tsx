"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  FolderKanban,
  Settings2,
  ShieldCheck,
  Users,
  WalletCards,
} from "lucide-react";

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
import { getUserFacingSupabaseMessage } from "@/utils/userFacingError";

type SettingsTabKey =
  | "users"
  | "projects"
  | "expense-types"
  | "accounts"
  | "settlement-policy";

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
};

type ExpenseCategoryRow = {
  id: string;
  name: string;
  is_active: boolean | null;
  created_at: string | null;
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
  { key: "manage", label: "관리", align: "center" as const },
];

const projectColumns = [
  { key: "projectName", label: "프로젝트명" },
  { key: "description", label: "설명" },
  { key: "status", label: "상태", align: "center" as const },
  { key: "createdAt", label: "등록일", align: "center" as const },
  { key: "manage", label: "관리", align: "center" as const },
];

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
        label: "최고관리자",
        className:
          "border-[color:rgba(22,59,111,0.14)] bg-[var(--primary-soft)] text-[var(--primary)]",
      };
    case "manager":
      return {
        label: "관리자",
        className:
          "border-sky-200 bg-sky-50 text-sky-700",
      };
    case "employee":
    default:
      return {
        label: "직원",
        className: "border-slate-200 bg-slate-100 text-slate-700",
      };
  }
}

function mapProjectStatus(status: string | null) {
  const normalized = status?.trim().toLowerCase();

  if (normalized === "active" || normalized === "in_progress" || normalized === "진행중") {
    return { label: "진행중", className: "border-emerald-200 bg-emerald-50 text-emerald-700" };
  }

  if (normalized === "planning" || normalized === "planned" || normalized === "준비중") {
    return { label: "준비중", className: "border-amber-200 bg-amber-50 text-amber-700" };
  }

  if (
    normalized === "completed" ||
    normalized === "closed" ||
    normalized === "archived" ||
    normalized === "종료"
  ) {
    return { label: "종료", className: "border-slate-300 bg-slate-100 text-slate-600" };
  }

  return { label: "상태 미정", className: "border-slate-200 bg-slate-50 text-slate-600" };
}

function ReadOnlyButton({
  label,
  message,
}: {
  label: string;
  message: string;
}) {
  return (
    <button
      type="button"
      onClick={() => window.alert(message)}
      className="inline-flex rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
    >
      {label}
    </button>
  );
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTabKey>("users");
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [expenseCategories, setExpenseCategories] = useState<ExpenseCategoryRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadSettingsData() {
      setIsLoading(true);
      setLoadError(null);

      if (!isSupabaseConfigured) {
        if (isMounted) {
          setLoadError("Supabase 연결 정보가 설정되지 않았습니다.");
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
            .select("id, name, description, status, created_at")
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
          getUserFacingSupabaseMessage(error, "설정 화면의 데이터를 불러오지 못했습니다."),
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
  }, []);

  const summaryData = useMemo(() => {
    const activeUserCount = profiles.filter((profile) => profile.is_active).length;
    const activeCategoryCount = expenseCategories.filter((category) => category.is_active).length;

    return {
      totalUsers: profiles.length,
      activeUserCount,
      projectCount: projects.length,
      activeCategoryCount,
    };
  }, [expenseCategories, profiles, projects]);

  const renderUsersTab = () => (
    <section className="rounded-[1.75rem] border border-slate-200/90 bg-white p-5 shadow-sm">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-slate-950">사용자 관리</h3>
        <p className="mt-1 text-sm text-slate-500">
          Supabase profiles 테이블의 실제 사용자만 표시합니다.
        </p>
      </div>

      {isLoading ? (
        <EmptyState
          title="사용자 정보를 불러오는 중입니다."
          description="profiles 테이블을 조회하고 있습니다."
        />
      ) : null}

      {!isLoading && profiles.length === 0 ? (
        <EmptyState
          title="등록된 사용자가 없습니다."
          description="profiles 테이블에 사용자를 생성하면 이 화면에 실제 데이터만 표시됩니다."
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
                <td className="px-4 py-4 text-center">
                  <ReadOnlyButton
                    label="읽기 전용"
                    message="사용자 권한/상태 수정 기능은 아직 연결 전입니다."
                  />
                </td>
              </tr>
            );
          })}
        </DashboardTable>
      ) : null}
    </section>
  );

  const renderProjectsTab = () => (
    <section className="rounded-[1.75rem] border border-slate-200/90 bg-white p-5 shadow-sm">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-slate-950">프로젝트 관리</h3>
        <p className="mt-1 text-sm text-slate-500">
          Supabase projects 테이블에 저장된 실제 프로젝트 정보를 표시합니다.
        </p>
      </div>

      {isLoading ? (
        <EmptyState
          title="프로젝트 정보를 불러오는 중입니다."
          description="projects 테이블을 조회하고 있습니다."
        />
      ) : null}

      {!isLoading && projects.length === 0 ? (
        <EmptyState
          title="등록된 프로젝트가 없습니다."
          description="projects 테이블에 프로젝트를 추가하면 이 화면에 바로 표시됩니다."
        />
      ) : null}

      {!isLoading && projects.length > 0 ? (
        <DashboardTable columns={projectColumns}>
          {projects.map((project) => {
            const projectStatus = mapProjectStatus(project.status);

            return (
              <tr key={project.id} className="border-b border-slate-100 last:border-b-0">
                <td className="px-4 py-4 font-medium text-slate-900">{project.name}</td>
                <td className="px-4 py-4 text-slate-600">
                  {project.description?.trim() || "설명이 아직 없습니다."}
                </td>
                <td className="px-4 py-4 text-center">
                  <ToneBadge className={projectStatus.className}>{projectStatus.label}</ToneBadge>
                </td>
                <td className="px-4 py-4 text-center text-slate-500">
                  {formatSupabaseDate(project.created_at)}
                </td>
                <td className="px-4 py-4 text-center">
                  <ReadOnlyButton
                    label="읽기 전용"
                    message="프로젝트 수정 기능은 아직 연결 전입니다."
                  />
                </td>
              </tr>
            );
          })}
        </DashboardTable>
      ) : null}
    </section>
  );

  const renderExpenseTypesTab = () => (
    <section className="rounded-[1.75rem] border border-slate-200/90 bg-white p-5 shadow-sm">
      <div className="mb-5">
        <h3 className="text-lg font-semibold text-slate-950">경비 유형 관리</h3>
        <p className="mt-1 text-sm text-slate-500">
          Supabase expense_categories 테이블의 실제 경비 유형만 표시합니다.
        </p>
      </div>

      {isLoading ? (
        <EmptyState
          title="경비 유형을 불러오는 중입니다."
          description="expense_categories 테이블을 조회하고 있습니다."
        />
      ) : null}

      {!isLoading && expenseCategories.length === 0 ? (
        <EmptyState
          title="등록된 경비 유형이 없습니다."
          description="expense_categories 테이블에 데이터를 추가하면 이 영역에 실제 값만 표시됩니다."
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

              <div className="mt-4">
                <ReadOnlyButton
                  label="읽기 전용"
                  message="경비 유형 수정 기능은 아직 연결 전입니다."
                />
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );

  const renderAccountsTab = () => (
    <section className="rounded-[1.75rem] border border-slate-200/90 bg-white p-5 shadow-sm">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-slate-950">계좌 관리</h3>
        <p className="mt-1 text-sm text-slate-500">
          계좌 관리용 Supabase 테이블이 아직 준비되지 않아 빈 상태로 표시합니다.
        </p>
      </div>

      <EmptyState
        title="표시할 계좌 설정이 없습니다."
        description="계좌 마스터 테이블이 연결되면 이 탭에서 실제 계좌만 관리할 수 있습니다."
      />
    </section>
  );

  const renderSettlementPolicyTab = () => (
    <section className="rounded-[1.75rem] border border-slate-200/90 bg-white p-5 shadow-sm">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-slate-950">정산 정책</h3>
        <p className="mt-1 text-sm text-slate-500">
          정책 저장용 테이블이 아직 준비되지 않아 mock form 없이 안내만 표시합니다.
        </p>
      </div>

      <EmptyState
        title="정산 정책 테이블이 아직 연결되지 않았습니다."
        description="정산 마감일, 증빙 정책, 법인카드 제외 여부 등은 별도 정책 테이블 연결 후 관리할 수 있습니다."
      />
    </section>
  );

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
      id: "active-categories",
      title: "활성 경비 유형 수",
      description: "expense_categories.is_active = true 기준",
      value: isLoading ? null : <span>{summaryData.activeCategoryCount}개</span>,
      icon: <Settings2 className="h-5 w-5" strokeWidth={1.8} />,
    },
  ];

  return (
    <div className="space-y-8">
      <PageHeader
        title="설정"
        description="실제 Supabase 마스터 데이터를 기준으로 기본 설정 현황을 확인합니다."
        roles={roleViews}
        activeRole="관리자 보기"
        eyebrow="시스템 설정"
        badgeText="읽기 전용 데이터 연결"
      />

      {loadError ? (
        <section className="rounded-[1.75rem] border border-rose-200 bg-rose-50 px-5 py-4 text-sm leading-6 text-rose-700 shadow-sm">
          <p className="font-semibold">설정 화면 데이터를 불러오지 못했습니다.</p>
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
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-950">설정 탭</h3>
            <p className="mt-1 text-sm text-slate-500">
              실제 데이터가 연결된 탭과 아직 테이블이 준비되지 않은 탭을 구분해서 표시합니다.
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

      <section className="rounded-[1.75rem] border border-slate-200/90 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--primary-soft)] text-[var(--primary)]">
              {activeTab === "users" ? (
                <Users className="h-5 w-5" strokeWidth={1.8} />
              ) : activeTab === "projects" ? (
                <FolderKanban className="h-5 w-5" strokeWidth={1.8} />
              ) : activeTab === "accounts" ? (
                <WalletCards className="h-5 w-5" strokeWidth={1.8} />
              ) : activeTab === "settlement-policy" ? (
                <ShieldCheck className="h-5 w-5" strokeWidth={1.8} />
              ) : (
                <Settings2 className="h-5 w-5" strokeWidth={1.8} />
              )}
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">변경사항 저장</p>
              <p className="mt-1 text-sm text-slate-500">
                현재 단계에서는 실제 데이터 조회만 연결되어 있으며 저장 기능은 아직 준비 중입니다.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => window.alert("설정 저장 기능은 아직 연결 전입니다.")}
            className="inline-flex items-center justify-center rounded-2xl bg-[var(--primary)] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:opacity-95"
          >
            변경사항 저장
          </button>
        </div>
      </section>
    </div>
  );
}
