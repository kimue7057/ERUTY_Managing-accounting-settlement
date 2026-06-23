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

import { AmountText } from "@/components/common/AmountText";
import { PageHeader } from "@/components/common/PageHeader";
import { StatCard } from "@/components/common/StatCard";
import { ExpenseCategorySummary } from "@/components/dashboard/ExpenseCategorySummary";
import { PendingApprovals } from "@/components/dashboard/PendingApprovals";
import { ProjectBudgetSummary } from "@/components/dashboard/ProjectBudgetSummary";
import { RecentExpenses } from "@/components/dashboard/RecentExpenses";
import {
  getSupabaseBrowserClient,
  isSupabaseConfigured,
} from "@/lib/supabase/client";
import type {
  ExpenseCategory,
  PendingApproval,
  ProjectBudget,
  RecentExpense,
  RoleView,
} from "@/types";
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

const roleViews: RoleView[] = ["직원 보기", "관리자 보기", "대표 보기"];

const mockHoldingAmount = 52_400_000;
const mockAvailableAmount = 41_800_000;

type RelationValue<T> = T | T[] | null;

type RequesterRelation = {
  id: string;
  name: string;
};

type ProjectRelation = {
  id: string;
  name: string;
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

function isSettlementTargetPaymentMethodValue(paymentMethod: DbPaymentMethod) {
  return paymentMethod === "personal_card" || paymentMethod === "cash";
}

function mapRecentExpense(row: DashboardExpenseRequestRow): RecentExpense {
  const requester = getSingleRelation(row.requester);

  return {
    draftNumber: row.request_no,
    title: row.title,
    requester: requester?.name ?? "미확인 직원",
    amount: row.amount,
    status: mapDbExpenseStatus(row.status),
    requestedAt: formatSupabaseDate(getRequestSortValue(row)),
  };
}

function mapPendingApproval(row: DashboardExpenseRequestRow): PendingApproval {
  const requester = getSingleRelation(row.requester);
  const project = getSingleRelation(row.project);

  return {
    requester: requester?.name ?? "미확인 직원",
    title: row.title,
    project: project?.name ?? "미지정 프로젝트",
    requestedAmount: row.amount,
    urgency: inferUrgencyLevel(row.title, null),
  };
}

export default function Home() {
  const [expenseRequests, setExpenseRequests] = useState<DashboardExpenseRequestRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadDashboardData() {
      setIsLoading(true);
      setLoadError(null);

      if (!isSupabaseConfigured) {
        if (!isMounted) {
          return;
        }

        setLoadError(
          "Supabase 환경변수가 설정되지 않았습니다. NEXT_PUBLIC_SUPABASE_URL과 NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY를 확인해주세요.",
        );
        setExpenseRequests([]);
        setIsLoading(false);
        return;
      }

      try {
        const supabase = getSupabaseBrowserClient();
        const { data, error } = await supabase
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

        if (error) {
          throw error;
        }

        if (!isMounted) {
          return;
        }

        setExpenseRequests((data ?? []) as DashboardExpenseRequestRow[]);
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "대시보드 데이터를 불러오는 중 알 수 없는 오류가 발생했습니다.";

        if (!isMounted) {
          return;
        }

        setLoadError(message);
        setExpenseRequests([]);
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
  }, []);

  const dashboardData = useMemo(() => {
    const currentMonthKey = getCurrentMonthKey();
    const currentMonthApprovedRequests = expenseRequests.filter(
      (row) => row.status === "approved" && getExpenseMonthKey(row.expense_date) === currentMonthKey,
    );
    const settlementTargetRequests = currentMonthApprovedRequests.filter(
      (row) => row.settlement_requested && isSettlementTargetPaymentMethodValue(row.payment_method),
    );
    const settlementReadyAmount = settlementTargetRequests
      .filter((row) => row.evidence_status === "attached")
      .reduce((sum, row) => sum + row.amount, 0);
    const settlementHoldRequests = settlementTargetRequests.filter(
      (row) => row.evidence_status === "none",
    );
    const settlementHoldAmount = settlementHoldRequests.reduce(
      (sum, row) => sum + row.amount,
      0,
    );

    const categoryAmountMap = new Map<string, number>();
    const projectAmountMap = new Map<string, number>();

    currentMonthApprovedRequests.forEach((row) => {
      const categoryName = getSingleRelation(row.category)?.name ?? "기타";
      const projectName = getSingleRelation(row.project)?.name ?? "미지정 프로젝트";

      categoryAmountMap.set(categoryName, (categoryAmountMap.get(categoryName) ?? 0) + row.amount);
      projectAmountMap.set(projectName, (projectAmountMap.get(projectName) ?? 0) + row.amount);
    });

    const approvedCurrentMonthAmount = currentMonthApprovedRequests.reduce(
      (sum, row) => sum + row.amount,
      0,
    );

    const recentExpenseItems = [...expenseRequests]
      .sort(sortByRequestDateDesc)
      .slice(0, 5)
      .map(mapRecentExpense);

    const pendingApprovalItems = expenseRequests
      .filter((row) => row.status === "submitted")
      .sort(sortByRequestDateDesc)
      .slice(0, 5)
      .map(mapPendingApproval);

    const expenseCategoryItems: ExpenseCategory[] = [...categoryAmountMap.entries()]
      .sort((left, right) => right[1] - left[1])
      .map(([category, amount]) => ({
        category,
        amount,
      }));

    const projectBudgetItems: ProjectBudget[] = [...projectAmountMap.entries()]
      .sort((left, right) => right[1] - left[1])
      .map(([name, spentAmount]) => ({
        name,
        totalBudget: approvedCurrentMonthAmount,
        spentBudget: spentAmount,
        usageRate:
          approvedCurrentMonthAmount > 0
            ? Math.round((spentAmount / approvedCurrentMonthAmount) * 100)
            : 0,
      }));

    return {
      approvedCurrentMonthAmount,
      settlementReadyAmount,
      settlementHoldAmount,
      settlementHoldCount: settlementHoldRequests.length,
      pendingApprovalCount: expenseRequests.filter((row) => row.status === "submitted").length,
      missingProofCount: expenseRequests.filter((row) => row.evidence_status === "none").length,
      recentExpenseItems,
      pendingApprovalItems,
      expenseCategoryItems,
      projectBudgetItems,
    };
  }, [expenseRequests]);

  const summaryCards = [
    {
      id: "total-funds",
      title: "현재 총 보유자금",
      description: "전체 계좌 기준 잔액",
      value: isLoading ? null : <AmountText value={mockHoldingAmount} />,
      icon: <Wallet className="h-5 w-5" strokeWidth={1.8} />,
    },
    {
      id: "available-funds",
      title: "실질 가용 자금",
      description: "예정 지출 차감 후 가용 금액",
      value: isLoading ? null : <AmountText value={mockAvailableAmount} />,
      icon: <Landmark className="h-5 w-5" strokeWidth={1.8} />,
    },
    {
      id: "approved-current-month",
      title: "이번 달 승인 지출",
      description: "이번 달 승인 완료된 경비 합계",
      value: isLoading ? null : <AmountText value={dashboardData.approvedCurrentMonthAmount} />,
      icon: <CircleDollarSign className="h-5 w-5" strokeWidth={1.8} />,
    },
    {
      id: "settlement-ready",
      title: "직원 정산 예정액",
      description:
        dashboardData.settlementHoldCount > 0
          ? `증빙 미첨부 ${dashboardData.settlementHoldCount}건은 보류 가능`
          : "개인카드/현금 승인 건 기준 예정 금액",
      value: isLoading ? null : <AmountText value={dashboardData.settlementReadyAmount} />,
      icon: <BanknoteArrowDown className="h-5 w-5" strokeWidth={1.8} />,
    },
    {
      id: "pending-approvals",
      title: "승인 대기 건수",
      description: "관리자 검토가 필요한 submitted 요청 수",
      value: isLoading ? null : <span>{dashboardData.pendingApprovalCount}건</span>,
      icon: <ClipboardList className="h-5 w-5" strokeWidth={1.8} />,
    },
    {
      id: "missing-proof",
      title: "증빙 미첨부 건수",
      description:
        dashboardData.settlementHoldAmount > 0
          ? `정산 보류 가능 금액 ${dashboardData.settlementHoldAmount.toLocaleString("ko-KR")}원`
          : "전체 요청 중 증빙 미첨부 건수",
      value: isLoading ? null : <span>{dashboardData.missingProofCount}건</span>,
      icon: <FileWarning className="h-5 w-5" strokeWidth={1.8} />,
    },
  ];

  return (
    <div className="space-y-8">
      <PageHeader
        title="대시보드"
        description="회사 자금 현황과 지출 흐름을 실제 경비 요청 데이터 기준으로 확인합니다."
        roles={roleViews}
        activeRole="관리자 보기"
        eyebrow="운영 대시보드"
        badgeText="Supabase 실데이터 집계"
      />

      {loadError ? (
        <section className="rounded-[1.75rem] border border-rose-200 bg-rose-50 px-5 py-4 text-sm leading-6 text-rose-700 shadow-sm">
          <p className="font-semibold">대시보드 데이터를 불러오지 못했습니다.</p>
          <p className="mt-2 whitespace-pre-wrap break-words">{loadError}</p>
        </section>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        {summaryCards.map((stat) => (
          <StatCard
            key={stat.id}
            title={stat.title}
            description={stat.description}
            value={
              stat.value ?? <span className="text-base font-medium text-slate-400">불러오는 중...</span>
            }
            icon={stat.icon}
          />
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.45fr_1fr]">
        <div className="space-y-6">
          <RecentExpenses items={dashboardData.recentExpenseItems} isLoading={isLoading} />
          <PendingApprovals items={dashboardData.pendingApprovalItems} isLoading={isLoading} />
        </div>

        <div className="space-y-6">
          <ProjectBudgetSummary items={dashboardData.projectBudgetItems} isLoading={isLoading} />
          <ExpenseCategorySummary items={dashboardData.expenseCategoryItems} isLoading={isLoading} />
        </div>
      </section>
    </div>
  );
}
