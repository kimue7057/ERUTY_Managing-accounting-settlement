"use client";

import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import {
  AlertTriangle,
  BadgeCheck,
  Download,
  FileArchive,
  Files,
  FileWarning,
  ReceiptText,
  WalletCards,
} from "lucide-react";

import { AmountText } from "@/components/common/AmountText";
import { DashboardTable } from "@/components/common/DashboardTable";
import { EmptyState } from "@/components/common/EmptyState";
import { PageHeader } from "@/components/common/PageHeader";
import { StatCard } from "@/components/common/StatCard";
import { StatusBadge } from "@/components/common/StatusBadge";
import {
  accountingMaterialData,
  accountingMaterialMonths,
  accountingMaterialStatusOptions,
  monthlySettlementData,
  roleViews,
} from "@/data/mockData";
import type {
  MonthlySettlementStatus,
  SettlementEligibility,
} from "@/types";
import { formatNumber } from "@/utils/format";

type AccountingTabKey =
  | "monthly-summary"
  | "all-expenses"
  | "employee-settlements"
  | "project-expenses"
  | "account-subjects"
  | "missing-proofs"
  | "rejected-hold";

const tabs: Array<{ key: AccountingTabKey; label: string }> = [
  { key: "monthly-summary", label: "월별 요약" },
  { key: "all-expenses", label: "전체 지출 내역" },
  { key: "employee-settlements", label: "직원별 정산 내역" },
  { key: "project-expenses", label: "프로젝트별 지출 내역" },
  { key: "account-subjects", label: "계정과목별 지출 내역" },
  { key: "missing-proofs", label: "증빙 누락 목록" },
  { key: "rejected-hold", label: "반려/보류 목록" },
];

const monthlySummaryColumns = [
  { key: "month", label: "월" },
  { key: "count", label: "총 지출 건수", align: "right" as const },
  { key: "amount", label: "총 지출 금액", align: "right" as const },
  { key: "proofCompleted", label: "증빙 완료 건수", align: "right" as const },
  { key: "proofMissing", label: "증빙 누락 건수", align: "right" as const },
  { key: "accountingCompleted", label: "회계처리 완료 건수", align: "right" as const },
];

const allExpenseColumns = [
  { key: "usedDate", label: "사용일" },
  { key: "employeeName", label: "직원명" },
  { key: "expenseType", label: "경비 유형" },
  { key: "merchantName", label: "사용처" },
  { key: "amount", label: "금액", align: "right" as const },
  { key: "paymentMethod", label: "결제수단" },
  { key: "settlementEligibility", label: "정산 여부", align: "center" as const },
  { key: "attachmentStatus", label: "증빙", align: "center" as const },
  { key: "approvalStatus", label: "승인 상태", align: "center" as const },
  { key: "accountingStatus", label: "회계처리 상태", align: "center" as const },
];

const employeeSettlementColumns = [
  { key: "employeeName", label: "직원명" },
  { key: "approvedAmount", label: "승인 금액", align: "right" as const },
  { key: "plannedAmount", label: "정산 예정액", align: "right" as const },
  { key: "payoutStatus", label: "지급 상태", align: "center" as const },
];

const projectExpenseColumns = [
  { key: "projectName", label: "프로젝트" },
  { key: "count", label: "건수", align: "right" as const },
  { key: "amount", label: "총액", align: "right" as const },
  { key: "approvedAmount", label: "승인완료 금액", align: "right" as const },
  { key: "missingProofCount", label: "증빙 누락 건수", align: "right" as const },
];

const accountSubjectColumns = [
  { key: "accountSubject", label: "계정과목" },
  { key: "count", label: "건수", align: "right" as const },
  { key: "amount", label: "총액", align: "right" as const },
  { key: "proofRate", label: "증빙 완료율", align: "right" as const },
];

const issueColumns = [
  { key: "usedDate", label: "사용일" },
  { key: "employeeName", label: "직원명" },
  { key: "projectName", label: "프로젝트" },
  { key: "expenseType", label: "경비 유형" },
  { key: "merchantName", label: "사용처" },
  { key: "amount", label: "금액", align: "right" as const },
  { key: "approvalStatus", label: "승인 상태", align: "center" as const },
  { key: "accountingStatus", label: "회계처리 상태", align: "center" as const },
];

function SettlementEligibilityBadge({ value }: { value: SettlementEligibility }) {
  const tone =
    value === "정산 대상"
      ? "border-[color:rgba(22,59,111,0.14)] bg-[var(--primary-soft)] text-[var(--primary)]"
      : "border-slate-200 bg-slate-100 text-slate-600";

  return (
    <span
      className={[
        "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold",
        tone,
      ].join(" ")}
    >
      {value}
    </span>
  );
}

function TabSection({
  title,
  description,
  columns,
  hasRows,
  emptyMessage,
  children,
}: {
  title: string;
  description: string;
  columns: Array<{ key: string; label: string; align?: "left" | "center" | "right" }>;
  hasRows: boolean;
  emptyMessage: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-[1.75rem] border border-slate-200/90 bg-white p-5 shadow-sm">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-slate-950">{title}</h3>
        <p className="mt-1 text-sm text-slate-500">{description}</p>
      </div>

      <DashboardTable columns={columns}>{children}</DashboardTable>

      {!hasRows ? (
        <EmptyState
          title={emptyMessage}
          description="필터를 조정해 다른 회계 자료를 확인해보세요."
        />
      ) : null}
    </section>
  );
}

export default function AccountingMaterialsPage() {
  const [selectedMonth, setSelectedMonth] =
    useState<(typeof accountingMaterialMonths)[number]>("2026년 6월");
  const [selectedProject, setSelectedProject] = useState("전체");
  const [selectedStatus, setSelectedStatus] =
    useState<(typeof accountingMaterialStatusOptions)[number]>("전체");
  const [activeTab, setActiveTab] = useState<AccountingTabKey>("monthly-summary");

  const currentMonthData = useMemo(
    () =>
      accountingMaterialData.find((item) => item.month === selectedMonth) ?? accountingMaterialData[0],
    [selectedMonth],
  );

  const currentSettlementData = useMemo(
    () =>
      monthlySettlementData.find((item) => item.month === selectedMonth) ?? monthlySettlementData[0],
    [selectedMonth],
  );

  const projectOptions = useMemo(
    () => ["전체", ...Array.from(new Set(currentMonthData.expenses.map((expense) => expense.projectName)))],
    [currentMonthData.expenses],
  );

  const filteredExpenses = useMemo(() => {
    return currentMonthData.expenses.filter((expense) => {
      const matchesProject =
        selectedProject === "전체" || expense.projectName === selectedProject;
      const matchesStatus =
        selectedStatus === "전체" || expense.approvalStatus === selectedStatus;

      return matchesProject && matchesStatus;
    });
  }, [currentMonthData.expenses, selectedProject, selectedStatus]);

  const employeeSettlementRows = useMemo(() => {
    const payoutStatusMap = new Map(
      currentSettlementData.employees.map((employee) => [employee.employeeName, employee.payoutStatus]),
    );

    const grouped = new Map<
      string,
      { employeeName: string; approvedAmount: number; plannedAmount: number; payoutStatus: MonthlySettlementStatus }
    >();

    filteredExpenses
      .filter((expense) => expense.settlementEligibility === "정산 대상")
      .forEach((expense) => {
        const current = grouped.get(expense.employeeName) ?? {
          employeeName: expense.employeeName,
          approvedAmount: 0,
          plannedAmount: 0,
          payoutStatus: payoutStatusMap.get(expense.employeeName) ?? "정산대기",
        };

        current.approvedAmount += expense.approvedAmount;
        current.plannedAmount += expense.approvalStatus === "승인완료" ? expense.approvedAmount : 0;

        grouped.set(expense.employeeName, current);
      });

    return Array.from(grouped.values());
  }, [currentSettlementData.employees, filteredExpenses]);

  const projectExpenseRows = useMemo(() => {
    const grouped = new Map<
      string,
      { projectName: string; count: number; amount: number; approvedAmount: number; missingProofCount: number }
    >();

    filteredExpenses.forEach((expense) => {
      const current = grouped.get(expense.projectName) ?? {
        projectName: expense.projectName,
        count: 0,
        amount: 0,
        approvedAmount: 0,
        missingProofCount: 0,
      };

      current.count += 1;
      current.amount += expense.amount;
      current.approvedAmount += expense.approvalStatus === "승인완료" ? expense.approvedAmount : 0;
      current.missingProofCount += expense.attachmentStatus === "미첨부" ? 1 : 0;

      grouped.set(expense.projectName, current);
    });

    return Array.from(grouped.values());
  }, [filteredExpenses]);

  const accountSubjectRows = useMemo(() => {
    const grouped = new Map<
      string,
      { accountSubject: string; count: number; amount: number; proofCompletedCount: number }
    >();

    filteredExpenses.forEach((expense) => {
      const current = grouped.get(expense.accountSubject) ?? {
        accountSubject: expense.accountSubject,
        count: 0,
        amount: 0,
        proofCompletedCount: 0,
      };

      current.count += 1;
      current.amount += expense.amount;
      current.proofCompletedCount += expense.attachmentStatus === "첨부완료" ? 1 : 0;

      grouped.set(expense.accountSubject, current);
    });

    return Array.from(grouped.values()).map((item) => ({
      ...item,
      proofRate: item.count === 0 ? 0 : Math.round((item.proofCompletedCount / item.count) * 100),
    }));
  }, [filteredExpenses]);

  const missingProofRows = useMemo(
    () => filteredExpenses.filter((expense) => expense.attachmentStatus === "미첨부"),
    [filteredExpenses],
  );

  const rejectedHoldRows = useMemo(
    () =>
      filteredExpenses.filter(
        (expense) => expense.approvalStatus === "반려" || expense.approvalStatus === "보류",
      ),
    [filteredExpenses],
  );

  const summaryCards = [
    {
      id: "expense-count",
      title: "총 지출 건수",
      value: <span>{currentMonthData.summary.totalExpenseCount}건</span>,
      description: "선택한 월 기준 전체 지출 건수입니다.",
      icon: <ReceiptText className="h-5 w-5" strokeWidth={1.8} />,
    },
    {
      id: "expense-amount",
      title: "총 지출 금액",
      value: <AmountText value={currentMonthData.summary.totalExpenseAmount} />,
      description: "선택한 월의 전체 지출 금액 합계입니다.",
      icon: <WalletCards className="h-5 w-5" strokeWidth={1.8} />,
    },
    {
      id: "proof-complete",
      title: "증빙 완료 건수",
      value: <span>{currentMonthData.summary.proofCompletedCount}건</span>,
      description: "증빙이 첨부되어 회계 전달 준비가 된 지출 건수입니다.",
      icon: <BadgeCheck className="h-5 w-5" strokeWidth={1.8} />,
    },
    {
      id: "proof-missing",
      title: "증빙 누락 건수",
      value: <span>{currentMonthData.summary.proofMissingCount}건</span>,
      description: "증빙 확인이 더 필요한 누락 지출 건수입니다.",
      icon: <FileWarning className="h-5 w-5" strokeWidth={1.8} />,
    },
    {
      id: "accounting-complete",
      title: "회계처리 완료 건수",
      value: <span>{currentMonthData.summary.accountingCompletedCount}건</span>,
      description: "회계 분류와 전달 기준 정리가 완료된 지출 건수입니다.",
      icon: <Files className="h-5 w-5" strokeWidth={1.8} />,
    },
  ];

  const monthSummaryRows = [
    {
      month: currentMonthData.month,
      count: currentMonthData.summary.totalExpenseCount,
      amount: currentMonthData.summary.totalExpenseAmount,
      proofCompleted: currentMonthData.summary.proofCompletedCount,
      proofMissing: currentMonthData.summary.proofMissingCount,
      accountingCompleted: currentMonthData.summary.accountingCompletedCount,
    },
  ];

  const renderActiveTab = () => {
    if (activeTab === "monthly-summary") {
      return (
        <TabSection
          title="월별 요약"
          description="세무사 및 회계 담당자 전달용으로 월별 핵심 지출 현황을 요약합니다."
          columns={monthlySummaryColumns}
          hasRows={monthSummaryRows.length > 0}
          emptyMessage="요약할 월별 자료가 없습니다."
        >
          {monthSummaryRows.map((row) => (
            <tr key={row.month} className="border-b border-slate-100 last:border-b-0">
              <td className="px-4 py-4 font-medium text-slate-900">{row.month}</td>
              <td className="px-4 py-4 text-right text-slate-700">{formatNumber(row.count)}건</td>
              <td className="px-4 py-4 text-right font-medium text-slate-900">
                <AmountText value={row.amount} />
              </td>
              <td className="px-4 py-4 text-right text-emerald-700">
                {formatNumber(row.proofCompleted)}건
              </td>
              <td className="px-4 py-4 text-right text-rose-700">
                {formatNumber(row.proofMissing)}건
              </td>
              <td className="px-4 py-4 text-right text-[var(--primary)]">
                {formatNumber(row.accountingCompleted)}건
              </td>
            </tr>
          ))}
        </TabSection>
      );
    }

    if (activeTab === "all-expenses") {
      return (
        <TabSection
          title="전체 지출 내역"
          description="선택 월의 전체 지출 자료를 회계 전달 형식으로 모아봅니다."
          columns={allExpenseColumns}
          hasRows={filteredExpenses.length > 0}
          emptyMessage="조건에 맞는 전체 지출 내역이 없습니다."
        >
          {filteredExpenses.map((expense) => (
            <tr
              key={expense.id}
              className={[
                "border-b border-slate-100 last:border-b-0",
                expense.attachmentStatus === "미첨부" ? "bg-amber-50/35" : "",
              ].join(" ")}
            >
              <td className="px-4 py-4 text-slate-500">
                <time dateTime={expense.usedDate}>{expense.usedDate}</time>
              </td>
              <td className="px-4 py-4 font-medium text-slate-900">{expense.employeeName}</td>
              <td className="px-4 py-4 text-slate-700">{expense.expenseType}</td>
              <td className="px-4 py-4 text-slate-600">{expense.merchantName}</td>
              <td className="px-4 py-4 text-right font-medium text-slate-900">
                <AmountText value={expense.amount} />
              </td>
              <td className="px-4 py-4 text-slate-600">{expense.paymentMethod}</td>
              <td className="px-4 py-4 text-center">
                <SettlementEligibilityBadge value={expense.settlementEligibility} />
              </td>
              <td className="px-4 py-4 text-center">
                <StatusBadge status={expense.attachmentStatus} />
              </td>
              <td className="px-4 py-4 text-center">
                <StatusBadge status={expense.approvalStatus} />
              </td>
              <td className="px-4 py-4 text-center">
                <StatusBadge status={expense.accountingStatus} />
              </td>
            </tr>
          ))}
        </TabSection>
      );
    }

    if (activeTab === "employee-settlements") {
      return (
        <TabSection
          title="직원별 정산 내역"
          description="승인완료된 개인카드·현금 사용 건을 중심으로 직원별 정산 예정 흐름을 정리합니다."
          columns={employeeSettlementColumns}
          hasRows={employeeSettlementRows.length > 0}
          emptyMessage="조건에 맞는 직원별 정산 내역이 없습니다."
        >
          {employeeSettlementRows.map((row) => (
            <tr key={row.employeeName} className="border-b border-slate-100 last:border-b-0">
              <td className="px-4 py-4 font-medium text-slate-900">{row.employeeName}</td>
              <td className="px-4 py-4 text-right font-medium text-slate-900">
                <AmountText value={row.approvedAmount} />
              </td>
              <td className="px-4 py-4 text-right text-[var(--primary)]">
                <AmountText value={row.plannedAmount} />
              </td>
              <td className="px-4 py-4 text-center">
                <StatusBadge status={row.payoutStatus} />
              </td>
            </tr>
          ))}
        </TabSection>
      );
    }

    if (activeTab === "project-expenses") {
      return (
        <TabSection
          title="프로젝트별 지출 내역"
          description="프로젝트 단위로 지출 건수와 승인완료 금액, 증빙 이슈를 함께 비교합니다."
          columns={projectExpenseColumns}
          hasRows={projectExpenseRows.length > 0}
          emptyMessage="조건에 맞는 프로젝트별 지출 내역이 없습니다."
        >
          {projectExpenseRows.map((row) => (
            <tr key={row.projectName} className="border-b border-slate-100 last:border-b-0">
              <td className="px-4 py-4 font-medium text-slate-900">{row.projectName}</td>
              <td className="px-4 py-4 text-right text-slate-700">{formatNumber(row.count)}건</td>
              <td className="px-4 py-4 text-right font-medium text-slate-900">
                <AmountText value={row.amount} />
              </td>
              <td className="px-4 py-4 text-right text-[var(--primary)]">
                <AmountText value={row.approvedAmount} />
              </td>
              <td
                className={[
                  "px-4 py-4 text-right font-medium",
                  row.missingProofCount > 0 ? "text-amber-700" : "text-slate-500",
                ].join(" ")}
              >
                {formatNumber(row.missingProofCount)}건
              </td>
            </tr>
          ))}
        </TabSection>
      );
    }

    if (activeTab === "account-subjects") {
      return (
        <TabSection
          title="계정과목별 지출 내역"
          description="회계 처리 관점에서 계정과목별 건수, 총액, 증빙 완료율을 빠르게 확인합니다."
          columns={accountSubjectColumns}
          hasRows={accountSubjectRows.length > 0}
          emptyMessage="조건에 맞는 계정과목별 지출 내역이 없습니다."
        >
          {accountSubjectRows.map((row) => (
            <tr key={row.accountSubject} className="border-b border-slate-100 last:border-b-0">
              <td className="px-4 py-4 font-medium text-slate-900">{row.accountSubject}</td>
              <td className="px-4 py-4 text-right text-slate-700">{formatNumber(row.count)}건</td>
              <td className="px-4 py-4 text-right font-medium text-slate-900">
                <AmountText value={row.amount} />
              </td>
              <td className="px-4 py-4 text-right text-[var(--primary)]">{row.proofRate}%</td>
            </tr>
          ))}
        </TabSection>
      );
    }

    if (activeTab === "missing-proofs") {
      return (
        <TabSection
          title="증빙 누락 목록"
          description="증빙이 빠진 지출을 따로 모아 회계 전달 전 보완이 필요한 항목을 확인합니다."
          columns={issueColumns}
          hasRows={missingProofRows.length > 0}
          emptyMessage="증빙 누락 건이 없습니다."
        >
          {missingProofRows.map((expense) => (
            <tr key={expense.id} className="border-b border-amber-100 bg-amber-50/45 last:border-b-0">
              <td className="px-4 py-4 text-slate-500">
                <time dateTime={expense.usedDate}>{expense.usedDate}</time>
              </td>
              <td className="px-4 py-4 font-medium text-slate-900">{expense.employeeName}</td>
              <td className="px-4 py-4 text-slate-700">{expense.projectName}</td>
              <td className="px-4 py-4 text-slate-700">{expense.expenseType}</td>
              <td className="px-4 py-4 text-slate-600">{expense.merchantName}</td>
              <td className="px-4 py-4 text-right font-medium text-slate-900">
                <AmountText value={expense.amount} />
              </td>
              <td className="px-4 py-4 text-center">
                <StatusBadge status={expense.approvalStatus} />
              </td>
              <td className="px-4 py-4 text-center">
                <StatusBadge status={expense.accountingStatus} />
              </td>
            </tr>
          ))}
        </TabSection>
      );
    }

    return (
      <TabSection
        title="반려/보류 목록"
        description="회계 전달 전 별도 검토가 필요한 반려 또는 보류 건만 모아봅니다."
        columns={issueColumns}
        hasRows={rejectedHoldRows.length > 0}
        emptyMessage="반려 또는 보류 건이 없습니다."
      >
        {rejectedHoldRows.map((expense) => (
          <tr
            key={expense.id}
            className={[
              "border-b last:border-b-0",
              expense.approvalStatus === "반려"
                ? "border-rose-100 bg-rose-50/45"
                : "border-slate-100 bg-slate-50/80",
            ].join(" ")}
          >
            <td className="px-4 py-4 text-slate-500">
              <time dateTime={expense.usedDate}>{expense.usedDate}</time>
            </td>
            <td className="px-4 py-4 font-medium text-slate-900">{expense.employeeName}</td>
            <td className="px-4 py-4 text-slate-700">{expense.projectName}</td>
            <td className="px-4 py-4 text-slate-700">{expense.expenseType}</td>
            <td className="px-4 py-4 text-slate-600">{expense.merchantName}</td>
            <td className="px-4 py-4 text-right font-medium text-slate-900">
              <AmountText value={expense.amount} />
            </td>
            <td className="px-4 py-4 text-center">
              <StatusBadge status={expense.approvalStatus} />
            </td>
            <td className="px-4 py-4 text-center">
              <StatusBadge status={expense.accountingStatus} />
            </td>
          </tr>
        ))}
      </TabSection>
    );
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="회계 자료"
        description="월별 지출 자료를 정리해 세무사와 회계 담당자에게 전달하기 위한 자료 화면입니다."
        roles={roleViews}
        activeRole="관리자 보기"
        eyebrow="회계 전달 자료"
        badgeText="월별 정리 뷰"
      />

      <section className="rounded-[1.75rem] border border-slate-200/90 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0 flex-1">
            <h3 className="text-lg font-semibold text-slate-950">필터 및 전달 액션</h3>
            <p className="mt-1 text-sm text-slate-500">
              상단 카드는 선택 월 기준 전체 요약을 보여주고, 아래 탭 표는 현재 필터가 적용된 mock 자료를 표시합니다.
            </p>

            <div className="mt-5 grid gap-4 xl:grid-cols-[220px_220px_220px]">
              <div>
                <label htmlFor="accounting-month" className="text-sm font-semibold text-slate-900">
                  월 선택
                </label>
                <select
                  id="accounting-month"
                  value={selectedMonth}
                  onChange={(event) => {
                    setSelectedMonth(event.target.value as (typeof accountingMaterialMonths)[number]);
                    setSelectedProject("전체");
                    setSelectedStatus("전체");
                  }}
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-[var(--primary)] focus:ring-4 focus:ring-[color:rgba(22,59,111,0.08)]"
                >
                  {accountingMaterialMonths.map((month) => (
                    <option key={month} value={month}>
                      {month}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="accounting-project" className="text-sm font-semibold text-slate-900">
                  프로젝트 선택
                </label>
                <select
                  id="accounting-project"
                  value={selectedProject}
                  onChange={(event) => setSelectedProject(event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-[var(--primary)] focus:ring-4 focus:ring-[color:rgba(22,59,111,0.08)]"
                >
                  {projectOptions.map((project) => (
                    <option key={project} value={project}>
                      {project}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="accounting-status" className="text-sm font-semibold text-slate-900">
                  지출 상태 선택
                </label>
                <select
                  id="accounting-status"
                  value={selectedStatus}
                  onChange={(event) =>
                    setSelectedStatus(event.target.value as (typeof accountingMaterialStatusOptions)[number])
                  }
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-[var(--primary)] focus:ring-4 focus:ring-[color:rgba(22,59,111,0.08)]"
                >
                  {accountingMaterialStatusOptions.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="flex w-full flex-col gap-3 xl:w-auto xl:min-w-[240px]">
            <button
              type="button"
              onClick={() => window.alert("엑셀 다운로드 기능은 추후 연동 예정입니다.")}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
            >
              <Download className="h-4.5 w-4.5" strokeWidth={1.8} />
              엑셀 다운로드
            </button>
            <button
              type="button"
              onClick={() => window.alert("증빙 파일 다운로드 기능은 추후 연동 예정입니다.")}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
            >
              <FileArchive className="h-4.5 w-4.5" strokeWidth={1.8} />
              증빙 파일 다운로드
            </button>
            <button
              type="button"
              onClick={() => window.alert("회계 마감 처리되었습니다.")}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 shadow-sm transition hover:border-rose-300 hover:bg-rose-100"
            >
              <AlertTriangle className="h-4.5 w-4.5" strokeWidth={1.8} />
              회계 마감 처리
            </button>
          </div>
        </div>
      </section>

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
        <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-950">자료 탭</h3>
            <p className="mt-1 text-sm text-slate-500">
              전달 목적에 맞게 필요한 지출 자료 묶음을 탭별로 나눠서 확인할 수 있습니다.
            </p>
          </div>
          <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">
            현재 {tabs.find((tab) => tab.key === activeTab)?.label}
          </span>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={[
                "whitespace-nowrap rounded-2xl px-4 py-2.5 text-sm font-semibold transition",
                activeTab === tab.key
                  ? "bg-[var(--primary)] text-white shadow-sm"
                  : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900",
              ].join(" ")}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </section>

      {renderActiveTab()}
    </div>
  );
}
