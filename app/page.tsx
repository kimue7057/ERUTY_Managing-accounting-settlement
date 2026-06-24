"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BanknoteArrowDown,
  CircleDollarSign,
  ClipboardList,
  FileWarning,
  Landmark,
  Wallet,
} from "lucide-react";

import { useAuth } from "@/components/auth/AuthProvider";
import { AmountText } from "@/components/common/AmountText";
import { PageHeader } from "@/components/common/PageHeader";
import { StatCard } from "@/components/common/StatCard";
import { ExpenseCategorySummary } from "@/components/dashboard/ExpenseCategorySummary";
import { PendingApprovals } from "@/components/dashboard/PendingApprovals";
import { ProjectBudgetSummary } from "@/components/dashboard/ProjectBudgetSummary";
import { RecentExpenses } from "@/components/dashboard/RecentExpenses";
import { roleViews } from "@/data/uiOptions";
import {
  getSupabaseBrowserClient,
  isSupabaseConfigured,
} from "@/lib/supabase/client";
import type { ExpenseCategory, PendingApproval, ProjectBudget } from "@/types";
import {
  formatSupabaseDate,
  getRequestSortValue,
  getSingleRelation,
  inferUrgencyLevel,
  mapDbExpenseStatus,
  type DbEvidenceStatus,
  type DbExpenseStatus,
  type DbPaymentMethod,
} from "@/utils/expenseRequests";
import {
  calculateFundOverview,
  isFundSchemaMissing,
  isSettlementSchemaMissing,
  type DbFundStatus,
} from "@/utils/funds";
import {
  calculateProjectBudgetMetrics,
  type DbProjectBudgetStatus,
} from "@/utils/projectBudget";
import { isAdmin, isManagerOrAdmin, mapAuthRoleLabel } from "@/utils/auth";
import { getUserFacingSupabaseMessage } from "@/utils/userFacingError";

type RelationValue<T> = T | T[] | null;

type RequesterRelation = {
  id: string;
  name: string;
};

type ProjectRelation = {
  id: string;
  name: string;
};

type ProjectBudgetRow = {
  id: string;
  name: string;
  budget_amount: number | string | null;
  used_amount: number | string | null;
  remaining_amount: number | string | null;
  budget_status: DbProjectBudgetStatus | null;
};

type CategoryRelation = {
  id: string;
  name: string;
};

type DashboardExpenseRequestRow = {
  id: string;
  request_no: string;
  title: string;
  amount: number;
  expense_date: string;
  requested_at: string | null;
  created_at: string | null;
  status: DbExpenseStatus;
  payment_method: DbPaymentMethod;
  settlement_requested: boolean;
  evidence_status: DbEvidenceStatus;
  requester: RelationValue<RequesterRelation>;
  project: RelationValue<ProjectRelation>;
  category: RelationValue<CategoryRelation>;
};

type SettlementRecordStatus = "confirmed" | "paid" | "on_hold";

type CompanyFundRow = {
  id: string;
  current_balance: number;
  status: DbFundStatus;
};

type MonthlySettlementRow = {
  id: string;
  final_payment_amount: number;
  status: SettlementRecordStatus;
};

type SettlementStatusRelation = {
  status: SettlementRecordStatus;
};

type SettlementItemRow = {
  expense_request_id: string;
  settlement: RelationValue<SettlementStatusRelation>;
};

type FundTransactionRow = {
  id: string;
  amount: number;
  transaction_date: string;
  related_expense_request_id: string | null;
};

function getCurrentMonthKey() {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
  }).format(new Date());
}

function getExpenseMonthKey(expenseDate: string) {
  return expenseDate.slice(0, 7);
}

function sortByRequestDateDesc(
  left: Pick<DashboardExpenseRequestRow, "requested_at" | "created_at">,
  right: Pick<DashboardExpenseRequestRow, "requested_at" | "created_at">,
) {
  return getRequestSortValue(right).localeCompare(getRequestSortValue(left));
}

function PlaceholderValue({ text = "연결 전" }: { text?: string }) {
  return <span className="text-xl font-semibold text-slate-400">{text}</span>;
}

function mapRecentExpense(row: DashboardExpenseRequestRow) {
  const requester = getSingleRelation(row.requester);

  return {
    draftNumber: row.request_no,
    title: row.title,
    requester: requester?.name ?? "미지정 직원",
    amount: row.amount,
    status: mapDbExpenseStatus(row.status),
    requestedAt: formatSupabaseDate(getRequestSortValue(row)),
  };
}

function mapPendingApproval(row: DashboardExpenseRequestRow): PendingApproval {
  const requester = getSingleRelation(row.requester);
  const project = getSingleRelation(row.project);

  return {
    requester: requester?.name ?? "미지정 직원",
    title: row.title,
    project: project?.name ?? "미지정 프로젝트",
    requestedAmount: row.amount,
    urgency: inferUrgencyLevel(row.title, null),
  };
}

export default function Home() {
  const { isLoading: isAuthLoading, profile } = useAuth();
  const [expenseRequests, setExpenseRequests] = useState<DashboardExpenseRequestRow[]>([]);
  const [projects, setProjects] = useState<ProjectBudgetRow[]>([]);
  const [companyFunds, setCompanyFunds] = useState<CompanyFundRow[]>([]);
  const [monthlySettlements, setMonthlySettlements] = useState<MonthlySettlementRow[]>([]);
  const [settlementItems, setSettlementItems] = useState<SettlementItemRow[]>([]);
  const [fundTransactions, setFundTransactions] = useState<FundTransactionRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [fundsNotice, setFundsNotice] = useState<string | null>(null);
  const [projectBudgetNotice, setProjectBudgetNotice] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadDashboardData() {
      setIsLoading(true);
      setLoadError(null);
      setFundsNotice(null);
      setProjectBudgetNotice(null);

      if (isAuthLoading) {
        return;
      }

      if (!isSupabaseConfigured) {
        if (isMounted) {
          setLoadError("Supabase 연결 정보가 설정되지 않았습니다.");
          setExpenseRequests([]);
          setProjects([]);
          setCompanyFunds([]);
          setMonthlySettlements([]);
          setSettlementItems([]);
          setFundTransactions([]);
          setIsLoading(false);
        }
        return;
      }

      if (!profile?.id) {
        if (isMounted) {
          setLoadError("로그인 사용자 프로필을 찾을 수 없습니다. 다시 로그인해주세요.");
          setExpenseRequests([]);
          setProjects([]);
          setCompanyFunds([]);
          setMonthlySettlements([]);
          setSettlementItems([]);
          setFundTransactions([]);
          setIsLoading(false);
        }
        return;
      }

      try {
        const supabase = getSupabaseBrowserClient();
        const canViewAllExpenses = isManagerOrAdmin(profile.role);
        const canViewProjects = isManagerOrAdmin(profile.role);
        const canViewFunds = isAdmin(profile.role);
        const expenseRequestsQuery = supabase
          .from("expense_requests")
          .select(
            `
              id,
              request_no,
              title,
              amount,
              expense_date,
              requested_at,
              created_at,
              status,
              payment_method,
              settlement_requested,
              evidence_status,
              requester:profiles!expense_requests_user_id_fkey (
                id,
                name
              ),
              project:projects!expense_requests_project_id_fkey (
                id,
                name
              ),
              category:expense_categories!expense_requests_category_id_fkey (
                id,
                name
              )
            `,
          )
          .order("requested_at", { ascending: false })
          .order("created_at", { ascending: false });

        if (!canViewAllExpenses) {
          expenseRequestsQuery.eq("user_id", profile.id);
        }

        const [
          expenseRequestsResult,
          projectsResult,
          companyFundsResult,
          monthlySettlementsResult,
          settlementItemsResult,
          fundTransactionsResult,
        ] = await Promise.all([
          expenseRequestsQuery,
          canViewProjects
            ? supabase
                .from("projects")
                .select("id, name, budget_amount, used_amount, remaining_amount, budget_status")
                .order("created_at", { ascending: false })
            : Promise.resolve({ data: [], error: null }),
          canViewFunds
            ? supabase
                .from("company_funds")
                .select("id, current_balance, status")
            : Promise.resolve({ data: [], error: null }),
          canViewFunds
            ? supabase
                .from("monthly_settlements")
                .select("id, final_payment_amount, status")
                .in("status", ["confirmed", "paid"])
            : Promise.resolve({ data: [], error: null }),
          canViewFunds
            ? supabase
                .from("settlement_items")
                .select(
                  `
                    expense_request_id,
                    settlement:monthly_settlements!settlement_items_settlement_id_fkey (
                      status
                    )
                  `,
                )
            : Promise.resolve({ data: [], error: null }),
          canViewFunds
            ? supabase
                .from("fund_transactions")
                .select("id, amount, transaction_date, related_expense_request_id")
            : Promise.resolve({ data: [], error: null }),
        ]);

        if (expenseRequestsResult.error) {
          throw expenseRequestsResult.error;
        }

        if (!isMounted) {
          return;
        }

        setExpenseRequests((expenseRequestsResult.data ?? []) as DashboardExpenseRequestRow[]);

        if (projectsResult.error) {
          setProjectBudgetNotice(
            getUserFacingSupabaseMessage(
              projectsResult.error,
              "프로젝트 예산 데이터를 불러오지 못했습니다.",
            ),
          );
          setProjects([]);
        } else {
          setProjects((projectsResult.data ?? []) as ProjectBudgetRow[]);
        }

        const fundErrors = canViewFunds
          ? [companyFundsResult.error, fundTransactionsResult.error].filter(Boolean)
          : [];
        const settlementSchemaError = canViewFunds
          ? [monthlySettlementsResult.error, settlementItemsResult.error]
              .filter(Boolean)
              .find((error) => isSettlementSchemaMissing(error))
          : null;
        const settlementErrors =
          canViewFunds && !settlementSchemaError
            ? [monthlySettlementsResult.error, settlementItemsResult.error].filter(Boolean)
            : [];

        const fundSchemaError = fundErrors.find((error) => isFundSchemaMissing(error));

        if (!canViewFunds) {
          setCompanyFunds([]);
          setMonthlySettlements([]);
          setSettlementItems([]);
          setFundTransactions([]);
        } else if (fundSchemaError) {
          setFundsNotice(
            "회사 자금 테이블이 아직 없습니다. Supabase SQL Editor에서 supabase/company_funds.sql을 먼저 실행해주세요.",
          );
          setCompanyFunds([]);
          setMonthlySettlements([]);
          setSettlementItems([]);
          setFundTransactions([]);
        } else if (fundErrors.length > 0 || settlementErrors.length > 0) {
          setFundsNotice(
            getUserFacingSupabaseMessage(
              fundErrors[0] ?? settlementErrors[0],
              "회사 자금 요약 데이터를 불러오지 못했습니다.",
            ),
          );
          setCompanyFunds([]);
          setMonthlySettlements([]);
          setSettlementItems([]);
          setFundTransactions([]);
        } else {
          setCompanyFunds((companyFundsResult.data ?? []) as CompanyFundRow[]);
          setMonthlySettlements(
            settlementSchemaError
              ? []
              : ((monthlySettlementsResult.data ?? []) as MonthlySettlementRow[]),
          );
          setSettlementItems(
            settlementSchemaError
              ? []
              : ((settlementItemsResult.data ?? []) as SettlementItemRow[]),
          );
          setFundTransactions((fundTransactionsResult.data ?? []) as FundTransactionRow[]);
        }
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setLoadError(
          getUserFacingSupabaseMessage(
            error,
            "대시보드 데이터를 불러오지 못했습니다.",
          ),
        );
        setExpenseRequests([]);
        setProjects([]);
        setCompanyFunds([]);
        setMonthlySettlements([]);
        setSettlementItems([]);
        setFundTransactions([]);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadDashboardData();

    return () => {
      isMounted = false;
    };
  }, [isAuthLoading, profile?.id, profile?.role]);

  const dashboardData = useMemo(() => {
    const currentMonthKey = getCurrentMonthKey();
    const approvedRequests = expenseRequests.filter((row) => row.status === "approved");
    const currentMonthApprovedRequests = approvedRequests.filter(
      (row) => getExpenseMonthKey(row.expense_date) === currentMonthKey,
    );
    const handledExpenseRequestIds = new Set<string>();

    settlementItems.forEach((item) => {
      const settlement = getSingleRelation(item.settlement);

      if (
        item.expense_request_id &&
        (settlement?.status === "confirmed" || settlement?.status === "paid")
      ) {
        handledExpenseRequestIds.add(item.expense_request_id);
      }
    });

    fundTransactions.forEach((transaction) => {
      if (transaction.related_expense_request_id && transaction.amount < 0) {
        handledExpenseRequestIds.add(transaction.related_expense_request_id);
      }
    });

    const settlementPlannedAmount = monthlySettlements
      .filter((settlement) => settlement.status === "confirmed")
      .reduce((sum, settlement) => sum + settlement.final_payment_amount, 0);

    const categoryAmountMap = new Map<string, number>();

    approvedRequests.forEach((row) => {
      const categoryName = getSingleRelation(row.category)?.name ?? "기타";
      categoryAmountMap.set(
        categoryName,
        (categoryAmountMap.get(categoryName) ?? 0) + row.amount,
      );
    });

    const approvedCurrentMonthAmount = currentMonthApprovedRequests.reduce(
      (sum, row) => sum + row.amount,
      0,
    );
    const paidCurrentMonthAmount = fundTransactions
      .filter(
        (transaction) =>
          transaction.amount < 0 &&
          getExpenseMonthKey(transaction.transaction_date) === currentMonthKey,
      )
      .reduce((sum, transaction) => sum + Math.abs(transaction.amount), 0);
    const approvedExpenseByProjectId = new Map<string, number>();

    approvedRequests.forEach((row) => {
      const projectId = getSingleRelation(row.project)?.id;

      if (!projectId) {
        return;
      }

      approvedExpenseByProjectId.set(
        projectId,
        (approvedExpenseByProjectId.get(projectId) ?? 0) + row.amount,
      );
    });

    const fundOverview = calculateFundOverview({
      funds: companyFunds,
      approvedExpenses: approvedRequests.map((row) => ({
        id: row.id,
        amount: row.amount,
        status: row.status,
        settlement_requested: row.settlement_requested,
        payment_method: row.payment_method,
      })),
      handledExpenseRequestIds,
    });

    const recentExpenseItems = [...expenseRequests]
      .sort(sortByRequestDateDesc)
      .slice(0, 5)
      .map(mapRecentExpense);

    const pendingApprovalItems = expenseRequests
      .filter((row) => row.status === "submitted")
      .sort(sortByRequestDateDesc)
      .slice(0, 5)
      .map(mapPendingApproval);

    const projectBudgetItems: ProjectBudget[] = projects
      .map((project) => {
        const metrics = calculateProjectBudgetMetrics(
          project.budget_amount ?? 0,
          project.used_amount ?? approvedExpenseByProjectId.get(project.id) ?? 0,
          project.budget_status,
        );

        return {
          id: project.id,
          name: project.name,
          totalBudget: metrics.budgetAmount,
          spentBudget: metrics.usedAmount,
          remainingBudget: metrics.remainingAmount,
          usageRate: metrics.usageRate,
          status: metrics.status,
          budgetConfigured: metrics.budgetConfigured,
        };
      })
      .filter((project) => project.totalBudget > 0 || project.spentBudget > 0)
      .sort((left, right) => right.spentBudget - left.spentBudget);

    const expenseCategoryItems: ExpenseCategory[] = [...categoryAmountMap.entries()]
      .sort((left, right) => right[1] - left[1])
      .map(([category, amount]) => ({
        category,
        amount,
      }));

    return {
      approvedCurrentMonthAmount,
      paidCurrentMonthAmount,
      settlementPlannedAmount,
      personalSettlementPlannedAmount: approvedRequests
        .filter(
          (row) =>
            row.settlement_requested &&
            (row.payment_method === "personal_card" || row.payment_method === "cash"),
        )
        .reduce((sum, row) => sum + row.amount, 0),
      totalFunds: fundOverview.totalFunds,
      availableFunds: fundOverview.availableFunds,
      approvedPendingAmount: fundOverview.approvedExpensePendingAmount,
      pendingApprovalCount: expenseRequests.filter((row) => row.status === "submitted").length,
      missingProofCount: expenseRequests.filter((row) => row.evidence_status === "none").length,
      recentExpenseItems,
      pendingApprovalItems,
      projectBudgetItems,
      expenseCategoryItems,
    };
  }, [
    companyFunds,
    expenseRequests,
    fundTransactions,
    monthlySettlements,
    projects,
    settlementItems,
  ]);

  const isAdminUser = isAdmin(profile?.role);
  const isManagerUser = isManagerOrAdmin(profile?.role);
  const isEmployeeUser = profile?.role === "employee";

  const summaryCards = [
    {
      id: "total-funds",
      title: "현재 총 보유자금",
      description: fundsNotice
        ? "company_funds 연결 후 실제 값으로 표시됩니다."
        : "company_funds.status = active 기준 current_balance 합계",
      value: isLoading
        ? null
        : fundsNotice
          ? <PlaceholderValue />
          : <AmountText value={dashboardData.totalFunds} />,
      icon: <Wallet className="h-5 w-5" strokeWidth={1.8} />,
    },
    {
      id: "available-funds",
      title: "실질 가용 자금",
      description: fundsNotice
        ? "회사 자금 테이블 연결 후 계산됩니다."
        : "총 보유 자금 - 승인 지출 예정액 - 직원 정산 예정액 기준",
      value: isLoading
        ? null
        : fundsNotice
          ? <PlaceholderValue />
          : <AmountText value={dashboardData.availableFunds} />,
      icon: <Landmark className="h-5 w-5" strokeWidth={1.8} />,
    },
    {
      id: "approved-current-month",
      title: "이번 달 승인 지출",
      description: "이번 달 expense_date 기준 승인 완료 금액 합계",
      value: isLoading ? null : <AmountText value={dashboardData.approvedCurrentMonthAmount} />,
      icon: <CircleDollarSign className="h-5 w-5" strokeWidth={1.8} />,
    },
    {
      id: "paid-current-month",
      title: "이번 달 실제 지급액",
      description: "fund_transactions 기준 이번 달 실제 출금 반영 금액입니다.",
      value: isLoading ? null : <AmountText value={dashboardData.paidCurrentMonthAmount} />,
      icon: <BanknoteArrowDown className="h-5 w-5" strokeWidth={1.8} />,
    },
    {
      id: "settlement-planned",
      title: "직원 정산 예정액",
      description: "monthly_settlements.status = confirmed 기준 지급 대기 금액입니다.",
      value: isLoading ? null : <AmountText value={dashboardData.settlementPlannedAmount} />,
      icon: <BanknoteArrowDown className="h-5 w-5" strokeWidth={1.8} />,
    },
    {
      id: "pending-approvals",
      title: "승인 대기 건수",
      description: "status = submitted 기준 건수",
      value: isLoading ? null : <span>{dashboardData.pendingApprovalCount}건</span>,
      icon: <ClipboardList className="h-5 w-5" strokeWidth={1.8} />,
    },
    {
      id: "missing-proof",
      title: "증빙 미첨부 건수",
      description: "evidence_status = none 기준 건수",
      value: isLoading ? null : <span>{dashboardData.missingProofCount}건</span>,
      icon: <FileWarning className="h-5 w-5" strokeWidth={1.8} />,
    },
  ].filter((card) => {
    if (isAdminUser) {
      return true;
    }

    if (isManagerUser) {
      return !["total-funds", "available-funds", "paid-current-month", "settlement-planned"].includes(
        card.id,
      );
    }

    return ["approved-current-month", "pending-approvals", "missing-proof"].includes(card.id);
  });

  return (
    <div className="space-y-8">
      <PageHeader
        title="대시보드"
        description={
          isEmployeeUser
            ? "로그인한 사용자 기준으로 본인 경비 요청과 승인 흐름만 확인합니다."
            : isAdminUser
              ? "회사 자금 현황과 지출 흐름을 실제 경비 요청 데이터 기준으로 확인합니다."
              : "승인 대기와 프로젝트 예산을 포함한 운영 현황을 실제 데이터 기준으로 확인합니다."
        }
        roles={roleViews}
        activeRole="관리자 보기"
        eyebrow="운영 대시보드"
        badgeText={`${mapAuthRoleLabel(profile?.role ?? "employee")} 권한 기준`}
      />

      {loadError ? (
        <section className="rounded-[1.75rem] border border-rose-200 bg-rose-50 px-5 py-4 text-sm leading-6 text-rose-700 shadow-sm">
          <p className="font-semibold">대시보드 데이터를 불러오지 못했습니다.</p>
          <p className="mt-2 whitespace-pre-wrap break-words">{loadError}</p>
        </section>
      ) : null}

      {isAdminUser && fundsNotice ? (
        <section className="rounded-[1.75rem] border border-amber-200 bg-amber-50 px-5 py-4 text-sm leading-6 text-amber-800 shadow-sm">
          <p className="font-semibold">회사 자금 요약 카드 일부를 불러오지 못했습니다.</p>
          <p className="mt-2 whitespace-pre-wrap break-words">{fundsNotice}</p>
        </section>
      ) : null}

      {isManagerUser && projectBudgetNotice ? (
        <section className="rounded-[1.75rem] border border-amber-200 bg-amber-50 px-5 py-4 text-sm leading-6 text-amber-800 shadow-sm">
          <p className="font-semibold">프로젝트 예산 사용 현황 일부를 불러오지 못했습니다.</p>
          <p className="mt-2 whitespace-pre-wrap break-words">{projectBudgetNotice}</p>
        </section>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-7">
        {summaryCards.map((stat) => (
          <StatCard
            key={stat.id}
            title={stat.title}
            description={stat.description}
            value={
              stat.value ?? (
                <span className="text-base font-medium text-slate-400">불러오는 중...</span>
              )
            }
            icon={stat.icon}
          />
        ))}
      </section>

      {isEmployeeUser ? (
        <section className="rounded-[1.75rem] border border-sky-200 bg-sky-50 px-5 py-4 text-sm leading-6 text-sky-800 shadow-sm">
          <p className="font-semibold">직원 권한 안내</p>
          <p className="mt-2">
            직원 계정에서는 본인 경비 요청 기준의 요약, 최근 요청, 증빙 상태만 표시됩니다.
            회사 자금, 승인 대기함, 프로젝트 예산, 정산, 회계, 설정 화면은 숨겨집니다.
          </p>
          <p className="mt-2 font-medium">
            내 정산 예정 참고 금액: <AmountText value={dashboardData.personalSettlementPlannedAmount} />
          </p>
        </section>
      ) : null}

      <section className="grid gap-6 xl:grid-cols-[1.45fr_1fr]">
        <div className="space-y-6">
          <RecentExpenses items={dashboardData.recentExpenseItems} isLoading={isLoading} />
          {isManagerUser ? (
            <PendingApprovals items={dashboardData.pendingApprovalItems} isLoading={isLoading} />
          ) : null}
        </div>

        <div className="space-y-6">
          {isManagerUser ? (
            <ProjectBudgetSummary items={dashboardData.projectBudgetItems} isLoading={isLoading} />
          ) : null}
          <ExpenseCategorySummary items={dashboardData.expenseCategoryItems} isLoading={isLoading} />
        </div>
      </section>
    </div>
  );
}
