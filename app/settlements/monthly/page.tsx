"use client";

import { useMemo, useState } from "react";
import {
  BadgeCheck,
  Ban,
  PauseCircle,
  SearchCheck,
  Users,
  WalletCards,
  X,
} from "lucide-react";

import { AmountText } from "@/components/common/AmountText";
import { DashboardTable } from "@/components/common/DashboardTable";
import { EmptyState } from "@/components/common/EmptyState";
import { PageHeader } from "@/components/common/PageHeader";
import { StatCard } from "@/components/common/StatCard";
import { StatusBadge } from "@/components/common/StatusBadge";
import {
  monthlySettlementData,
  monthlySettlementMonths,
  monthlySettlementStatusOptions,
  roleViews,
} from "@/data/mockData";

const employeeTableColumns = [
  { key: "employeeName", label: "직원명" },
  { key: "personalExpenseTotal", label: "개인 선지출 합계", align: "right" as const },
  { key: "approvedAmount", label: "승인 금액", align: "right" as const },
  { key: "rejectedAmount", label: "반려 금액", align: "right" as const },
  { key: "missingProofAmount", label: "증빙 누락 금액", align: "right" as const },
  { key: "finalPayoutAmount", label: "최종 지급 예정액", align: "right" as const },
  { key: "payoutStatus", label: "지급 상태", align: "center" as const },
  { key: "detail", label: "상세보기", align: "center" as const },
];

const detailTableColumns = [
  { key: "usedDate", label: "사용일" },
  { key: "expenseType", label: "경비 유형" },
  { key: "merchantName", label: "사용처" },
  { key: "amount", label: "금액", align: "right" as const },
  { key: "approvedAmount", label: "승인 금액", align: "right" as const },
  { key: "attachmentStatus", label: "증빙 여부", align: "center" as const },
  { key: "settlementStatus", label: "정산 상태", align: "center" as const },
];

export default function MonthlySettlementPage() {
  const [selectedMonth, setSelectedMonth] =
    useState<(typeof monthlySettlementMonths)[number]>("2026년 6월");
  const [employeeFilter, setEmployeeFilter] = useState("전체");
  const [statusFilter, setStatusFilter] =
    useState<(typeof monthlySettlementStatusOptions)[number]>("전체");
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");

  const currentMonthData = useMemo(
    () =>
      monthlySettlementData.find((monthData) => monthData.month === selectedMonth) ??
      monthlySettlementData[0],
    [selectedMonth],
  );

  const employeeOptions = useMemo(
    () => ["전체", ...currentMonthData.employees.map((employee) => employee.employeeName)],
    [currentMonthData.employees],
  );

  const filteredEmployees = useMemo(() => {
    return currentMonthData.employees.filter((employee) => {
      const matchesEmployee =
        employeeFilter === "전체" || employee.employeeName === employeeFilter;
      const matchesStatus =
        statusFilter === "전체" || employee.payoutStatus === statusFilter;

      return matchesEmployee && matchesStatus;
    });
  }, [currentMonthData.employees, employeeFilter, statusFilter]);

  const selectedEmployee = useMemo(
    () =>
      currentMonthData.employees.find((employee) => employee.id === selectedEmployeeId) ?? null,
    [currentMonthData.employees, selectedEmployeeId],
  );

  const summaryCards = [
    {
      id: "employee-count",
      title: "정산 대상 직원 수",
      value: <span>{currentMonthData.summary.employeeCount}명</span>,
      description: "이번 정산 월에 개인 선지출 정산 대상에 포함된 직원 수입니다.",
      icon: <Users className="h-5 w-5" strokeWidth={1.8} />,
    },
    {
      id: "total-planned",
      title: "총 정산 예정액",
      value: <AmountText value={currentMonthData.summary.totalPlannedAmount} />,
      description: "승인 기준으로 이번 달 지급 예정으로 집계된 총 정산 금액입니다.",
      icon: <WalletCards className="h-5 w-5" strokeWidth={1.8} />,
    },
    {
      id: "paid-amount",
      title: "지급 완료액",
      value: <AmountText value={currentMonthData.summary.paidAmount} />,
      description: "이미 지급 완료 처리된 월말 정산 금액입니다.",
      icon: <BadgeCheck className="h-5 w-5" strokeWidth={1.8} />,
    },
    {
      id: "hold-amount",
      title: "보류 금액",
      value: <AmountText value={currentMonthData.summary.holdAmount} />,
      description: "증빙 누락 또는 검토 보완이 필요한 정산 보류 금액입니다.",
      icon: <PauseCircle className="h-5 w-5" strokeWidth={1.8} />,
    },
    {
      id: "rejected-amount",
      title: "반려 금액",
      value: <AmountText value={currentMonthData.summary.rejectedAmount} />,
      description: "정산 대상에서 제외되거나 반려 처리된 금액입니다.",
      icon: <Ban className="h-5 w-5" strokeWidth={1.8} />,
    },
  ];

  return (
    <div className="space-y-8">
      <PageHeader
        title="월말 정산"
        description="직원별 월말 정산 예정 금액과 지급 진행 상태를 확인합니다."
        roles={roleViews}
        activeRole="관리자 보기"
        eyebrow="정산 지급 관리"
        badgeText="개인 선지출 정산 흐름"
      />

      <section className="rounded-[1.75rem] border border-slate-200/90 bg-[var(--card-secondary)] p-5 shadow-sm">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-950">정산 대상 포함 기준</h3>
            <p className="mt-1 text-sm text-slate-500">
              승인완료된 개인카드/현금 사용 건만 월말 정산 대상에 포함되며, 법인카드 사용 건은 직원 지급 대상에서 제외됩니다.
            </p>
          </div>

          <div className="grid gap-2 sm:grid-cols-3">
            <div className="rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm">
              승인완료
            </div>
            <div className="rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm">
              개인카드/현금 사용
            </div>
            <div className="rounded-2xl bg-[var(--primary)] px-4 py-3 text-sm font-semibold text-white shadow-sm">
              월말 정산 대상
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-[1.75rem] border border-slate-200/90 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <h3 className="text-lg font-semibold text-slate-950">정산 필터</h3>
              <p className="mt-1 text-sm text-slate-500">
                정산 월, 직원, 상태 기준으로 월말 정산 예정 내역을 빠르게 확인합니다.
              </p>
            </div>
            <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">
              총 {filteredEmployees.length}명 표시
            </span>
          </div>

          <div className="grid gap-4 xl:grid-cols-[220px_220px_220px]">
            <div>
              <label htmlFor="settlement-month" className="text-sm font-semibold text-slate-900">
                정산 월 선택
              </label>
              <select
                id="settlement-month"
                value={selectedMonth}
                onChange={(event) => {
                  setSelectedMonth(event.target.value as (typeof monthlySettlementMonths)[number]);
                  setEmployeeFilter("전체");
                  setStatusFilter("전체");
                  setSelectedEmployeeId("");
                }}
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-[var(--primary)] focus:ring-4 focus:ring-[color:rgba(22,59,111,0.08)]"
              >
                {monthlySettlementMonths.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="settlement-employee" className="text-sm font-semibold text-slate-900">
                직원 선택
              </label>
              <select
                id="settlement-employee"
                value={employeeFilter}
                onChange={(event) => setEmployeeFilter(event.target.value)}
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-[var(--primary)] focus:ring-4 focus:ring-[color:rgba(22,59,111,0.08)]"
              >
                {employeeOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="settlement-status" className="text-sm font-semibold text-slate-900">
                상태 선택
              </label>
              <select
                id="settlement-status"
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(event.target.value as (typeof monthlySettlementStatusOptions)[number])
                }
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-[var(--primary)] focus:ring-4 focus:ring-[color:rgba(22,59,111,0.08)]"
              >
                {monthlySettlementStatusOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
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
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-slate-950">직원별 월말 정산 예정 현황</h3>
          <p className="mt-1 text-sm text-slate-500">
            승인 금액, 증빙 누락 금액, 최종 지급 예정액과 현재 지급 상태를 직원 단위로 확인합니다.
          </p>
        </div>

        <DashboardTable columns={employeeTableColumns}>
          {filteredEmployees.map((employee) => (
            <tr
              key={employee.id}
              className={[
                "border-b border-slate-100 last:border-b-0",
                employee.payoutStatus === "보류" ? "bg-amber-50/40" : "",
              ].join(" ")}
            >
              <td className="px-4 py-4 font-medium text-slate-900">{employee.employeeName}</td>
              <td className="px-4 py-4 text-right text-slate-700">
                <AmountText value={employee.personalExpenseTotal} />
              </td>
              <td className="px-4 py-4 text-right font-medium text-slate-900">
                <AmountText value={employee.approvedAmount} />
              </td>
              <td className="px-4 py-4 text-right text-rose-700">
                <AmountText value={employee.rejectedAmount} />
              </td>
              <td
                className={[
                  "px-4 py-4 text-right font-medium",
                  employee.missingProofAmount > 0 ? "text-amber-700" : "text-slate-500",
                ].join(" ")}
              >
                <AmountText value={employee.missingProofAmount} />
              </td>
              <td className="px-4 py-4 text-right font-semibold text-[var(--primary)]">
                <AmountText value={employee.finalPayoutAmount} />
              </td>
              <td className="px-4 py-4 text-center">
                <StatusBadge status={employee.payoutStatus} />
              </td>
              <td className="px-4 py-4 text-center">
                <button
                  type="button"
                  onClick={() => setSelectedEmployeeId(employee.id)}
                  className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
                >
                  상세보기
                </button>
              </td>
            </tr>
          ))}
        </DashboardTable>

        {filteredEmployees.length === 0 ? (
          <EmptyState
            title="조건에 맞는 정산 대상 직원이 없습니다."
            description="정산 월, 직원, 상태 필터를 조정해 다른 정산 내역을 확인해보세요."
          />
        ) : null}

        <div className="mt-5 rounded-2xl border border-sky-100 bg-sky-50 px-4 py-4 text-sm leading-6 text-sky-800">
          승인완료된 개인카드/현금 사용 건만 월말 정산 대상에 포함됩니다. 법인카드 사용 건은 직원 지급 대상이 아닙니다.
        </div>
      </section>

      {selectedEmployee ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4 py-8">
          <div className="w-full max-w-5xl rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-slate-500">{selectedMonth} 정산 상세</p>
                <div className="mt-2 flex flex-wrap items-center gap-3">
                  <h3 className="text-2xl font-semibold text-slate-950">
                    {selectedEmployee.employeeName}
                  </h3>
                  <StatusBadge status={selectedEmployee.payoutStatus} />
                </div>
                <p className="mt-2 text-sm text-slate-500">
                  승인완료된 개인카드/현금 사용 건 중심으로 월말 정산 대상 경비를 확인합니다.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedEmployeeId("")}
                className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 text-slate-500 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-700"
                aria-label="닫기"
              >
                <X className="h-4.5 w-4.5" strokeWidth={1.9} />
              </button>
            </div>

            <div className="mt-6 grid gap-3 md:grid-cols-5">
              <div className="rounded-2xl bg-slate-50 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                  개인 선지출
                </p>
                <p className="mt-2 text-sm font-semibold text-slate-900">
                  <AmountText value={selectedEmployee.personalExpenseTotal} />
                </p>
              </div>
              <div className="rounded-2xl bg-slate-50 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                  승인 금액
                </p>
                <p className="mt-2 text-sm font-semibold text-slate-900">
                  <AmountText value={selectedEmployee.approvedAmount} />
                </p>
              </div>
              <div className="rounded-2xl bg-slate-50 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                  반려 금액
                </p>
                <p className="mt-2 text-sm font-semibold text-rose-700">
                  <AmountText value={selectedEmployee.rejectedAmount} />
                </p>
              </div>
              <div className="rounded-2xl bg-slate-50 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                  증빙 누락
                </p>
                <p className="mt-2 text-sm font-semibold text-amber-700">
                  <AmountText value={selectedEmployee.missingProofAmount} />
                </p>
              </div>
              <div className="rounded-2xl bg-slate-50 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                  최종 지급 예정액
                </p>
                <p className="mt-2 text-sm font-semibold text-[var(--primary)]">
                  <AmountText value={selectedEmployee.finalPayoutAmount} />
                </p>
              </div>
            </div>

            <div className="mt-6">
              <DashboardTable columns={detailTableColumns}>
                {selectedEmployee.expenses.map((expense) => (
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
                    <td className="px-4 py-4 text-slate-900">{expense.expenseType}</td>
                    <td className="px-4 py-4 text-slate-600">{expense.merchantName}</td>
                    <td className="px-4 py-4 text-right text-slate-700">
                      <AmountText value={expense.amount} />
                    </td>
                    <td className="px-4 py-4 text-right font-medium text-slate-900">
                      <AmountText value={expense.approvedAmount} />
                    </td>
                    <td className="px-4 py-4 text-center">
                      <StatusBadge status={expense.attachmentStatus} />
                    </td>
                    <td className="px-4 py-4 text-center">
                      <StatusBadge status={expense.settlementStatus} />
                    </td>
                  </tr>
                ))}
              </DashboardTable>
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => window.alert("월말 정산이 확정되었습니다.")}
                className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
              >
                정산 확정
              </button>
              <button
                type="button"
                onClick={() => window.alert("지급 완료 처리되었습니다.")}
                className="inline-flex items-center justify-center rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700 shadow-sm transition hover:border-emerald-300 hover:bg-emerald-100"
              >
                지급 완료 처리
              </button>
              <button
                type="button"
                onClick={() => window.alert("엑셀 다운로드 기능은 추후 연동 예정입니다.")}
                className="inline-flex items-center justify-center rounded-2xl bg-[var(--primary)] px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:opacity-95"
              >
                엑셀 다운로드
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <section className="rounded-[1.75rem] border border-slate-200/90 bg-white p-5 shadow-sm">
        <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm leading-6 text-slate-600">
          <SearchCheck className="mt-0.5 h-5 w-5 shrink-0 text-[var(--primary)]" strokeWidth={1.9} />
          <p>
            이번 단계에서는 실제 정산 계산, 지급 처리, DB/API 연동 없이 UI와 mock data만 구현했습니다.
            상세보기 모달의 버튼은 모두 안내용 alert만 표시합니다.
          </p>
        </div>
      </section>
    </div>
  );
}
