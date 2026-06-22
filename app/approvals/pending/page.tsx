"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  AlertTriangle,
  BadgeCheck,
  FileWarning,
  Search,
  WalletCards,
} from "lucide-react";

import { AmountText } from "@/components/common/AmountText";
import { DashboardTable } from "@/components/common/DashboardTable";
import { EmptyState } from "@/components/common/EmptyState";
import { PageHeader } from "@/components/common/PageHeader";
import { StatCard } from "@/components/common/StatCard";
import { StatusBadge } from "@/components/common/StatusBadge";
import {
  approvalQueueStatusOptions,
  approvalQueueTypeOptions,
  roleViews,
} from "@/data/mockData";
import type { ApprovalQueueItem } from "@/types";
import { useApprovalQueueItems } from "@/stores/approvalQueueStore";

const tableColumns = [
  { key: "requestNumber", label: "요청번호" },
  { key: "requestedAt", label: "요청일" },
  { key: "employeeName", label: "직원명" },
  { key: "title", label: "경비 제목" },
  { key: "expenseType", label: "경비 유형" },
  { key: "usedDate", label: "사용일" },
  { key: "merchantName", label: "사용처" },
  { key: "amount", label: "사용 금액", align: "right" as const },
  { key: "paymentMethod", label: "결제수단" },
  { key: "settlementRequest", label: "정산 요청", align: "center" as const },
  { key: "attachmentStatus", label: "증빙", align: "center" as const },
  { key: "urgency", label: "긴급 여부", align: "center" as const },
  { key: "status", label: "상태", align: "center" as const },
  { key: "review", label: "검토", align: "center" as const },
];

function UrgencyBadge({ urgency }: { urgency: ApprovalQueueItem["urgency"] }) {
  const classes =
    urgency === "긴급"
      ? "border-amber-200 bg-amber-50 text-amber-700"
      : "border-slate-200 bg-slate-100 text-slate-600";

  return (
    <span
      className={[
        "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold",
        classes,
      ].join(" ")}
    >
      {urgency}
    </span>
  );
}

export default function ApprovalPendingPage() {
  const items = useApprovalQueueItems();
  const [statusFilter, setStatusFilter] =
    useState<(typeof approvalQueueStatusOptions)[number]>("전체");
  const [expenseTypeFilter, setExpenseTypeFilter] =
    useState<(typeof approvalQueueTypeOptions)[number]>("전체");
  const [employeeQuery, setEmployeeQuery] = useState("");
  const [titleMerchantQuery, setTitleMerchantQuery] = useState("");

  const filteredItems = useMemo(() => {
    const normalizedEmployeeQuery = employeeQuery.trim().toLowerCase();
    const normalizedTitleMerchantQuery = titleMerchantQuery.trim().toLowerCase();

    return items.filter((item) => {
      const matchesStatus = statusFilter === "전체" || item.status === statusFilter;
      const matchesType = expenseTypeFilter === "전체" || item.expenseType === expenseTypeFilter;
      const matchesEmployee =
        normalizedEmployeeQuery.length === 0 ||
        item.employeeName.toLowerCase().includes(normalizedEmployeeQuery);
      const matchesTitleMerchant =
        normalizedTitleMerchantQuery.length === 0 ||
        item.title.toLowerCase().includes(normalizedTitleMerchantQuery) ||
        item.merchantName.toLowerCase().includes(normalizedTitleMerchantQuery);

      return matchesStatus && matchesType && matchesEmployee && matchesTitleMerchant;
    });
  }, [employeeQuery, expenseTypeFilter, items, statusFilter, titleMerchantQuery]);

  const summary = useMemo(() => {
    const pendingItems = items.filter((item) => item.status === "승인대기");
    const missingProofCount = items.filter((item) => item.attachmentStatus === "미첨부").length;
    const urgentCount = items.filter((item) => item.urgency === "긴급").length;

    return {
      pendingCount: pendingItems.length,
      pendingAmount: pendingItems.reduce((sum, item) => sum + item.amount, 0),
      missingProofCount,
      urgentCount,
    };
  }, [items]);

  const summaryCards = [
    {
      id: "pending-count",
      title: "승인 대기 건수",
      value: <span>{summary.pendingCount}건</span>,
      description: "현재 검토가 필요한 경비 요청 건수",
      icon: <BadgeCheck className="h-5 w-5" strokeWidth={1.8} />,
    },
    {
      id: "pending-amount",
      title: "승인 대기 총액",
      value: <AmountText value={summary.pendingAmount} />,
      description: "승인대기 상태 요청의 총 금액",
      icon: <WalletCards className="h-5 w-5" strokeWidth={1.8} />,
    },
    {
      id: "missing-proof",
      title: "증빙 미첨부 건수",
      value: <span>{summary.missingProofCount}건</span>,
      description: "추가 증빙 확인이 필요한 요청",
      icon: <FileWarning className="h-5 w-5" strokeWidth={1.8} />,
    },
    {
      id: "urgent-count",
      title: "긴급 요청 건수",
      value: <span>{summary.urgentCount}건</span>,
      description: "우선 검토가 필요한 긴급 요청",
      icon: <AlertTriangle className="h-5 w-5" strokeWidth={1.8} />,
    },
  ];

  return (
    <div className="space-y-8">
      <PageHeader
        title="승인 대기함"
        description="직원들이 제출한 경비 요청을 검토하고 승인, 반려, 수정요청 처리합니다."
        roles={roleViews}
        activeRole="관리자 보기"
        eyebrow="관리자 승인"
        badgeText="검토 대기 요청"
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
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
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <h3 className="text-lg font-semibold text-slate-950">필터 및 검색</h3>
              <p className="mt-1 text-sm text-slate-500">
                상태, 경비 유형, 직원명, 사용처/제목 기준으로 검토 대상을 빠르게 좁혀볼 수 있습니다.
              </p>
            </div>
            <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">
              총 {filteredItems.length}건 표시
            </span>
          </div>

          <div className="grid gap-4 xl:grid-cols-[180px_210px_minmax(0,0.8fr)_minmax(0,1fr)]">
            <div>
              <label htmlFor="approval-status-filter" className="text-sm font-semibold text-slate-900">
                상태
              </label>
              <select
                id="approval-status-filter"
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(event.target.value as (typeof approvalQueueStatusOptions)[number])
                }
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-[var(--primary)] focus:ring-4 focus:ring-[color:rgba(22,59,111,0.08)]"
              >
                {approvalQueueStatusOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="approval-expense-type-filter" className="text-sm font-semibold text-slate-900">
                경비 유형
              </label>
              <select
                id="approval-expense-type-filter"
                value={expenseTypeFilter}
                onChange={(event) =>
                  setExpenseTypeFilter(event.target.value as (typeof approvalQueueTypeOptions)[number])
                }
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-[var(--primary)] focus:ring-4 focus:ring-[color:rgba(22,59,111,0.08)]"
              >
                {approvalQueueTypeOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="employee-search" className="text-sm font-semibold text-slate-900">
                직원명 검색
              </label>
              <div className="relative mt-2">
                <Search
                  className="pointer-events-none absolute left-4 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-slate-400"
                  strokeWidth={1.8}
                />
                <input
                  id="employee-search"
                  type="text"
                  value={employeeQuery}
                  onChange={(event) => setEmployeeQuery(event.target.value)}
                  placeholder="예: 공하연, 김태우"
                  className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-[var(--primary)] focus:ring-4 focus:ring-[color:rgba(22,59,111,0.08)]"
                />
              </div>
            </div>

            <div>
              <label htmlFor="title-merchant-search" className="text-sm font-semibold text-slate-900">
                사용처/제목 검색
              </label>
              <div className="relative mt-2">
                <Search
                  className="pointer-events-none absolute left-4 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-slate-400"
                  strokeWidth={1.8}
                />
                <input
                  id="title-merchant-search"
                  type="text"
                  value={titleMerchantQuery}
                  onChange={(event) => setTitleMerchantQuery(event.target.value)}
                  placeholder="예: 스타벅스, 식대, AWS"
                  className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-[var(--primary)] focus:ring-4 focus:ring-[color:rgba(22,59,111,0.08)]"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-[1.75rem] border border-slate-200/90 bg-white p-5 shadow-sm">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-slate-950">관리자 검토 목록</h3>
          <p className="mt-1 text-sm text-slate-500">
            증빙, 긴급 여부, 정산 요청 여부를 함께 비교하면서 승인 판단을 진행할 수 있습니다.
          </p>
        </div>

        <DashboardTable columns={tableColumns}>
          {filteredItems.map((item) => (
            <tr
              key={item.requestNumber}
              className={[
                "border-b border-slate-100 last:border-b-0",
                item.attachmentStatus === "미첨부" ? "bg-rose-50/40" : "",
              ].join(" ")}
            >
              <td className="px-4 py-4 font-medium text-slate-700">{item.requestNumber}</td>
              <td className="px-4 py-4 text-slate-500">
                <time dateTime={item.requestedAt}>{item.requestedAt}</time>
              </td>
              <td className="px-4 py-4 font-medium text-slate-900">{item.employeeName}</td>
              <td className="px-4 py-4 text-slate-900">{item.title}</td>
              <td className="px-4 py-4 text-slate-600">{item.expenseType}</td>
              <td className="px-4 py-4 text-slate-500">
                <time dateTime={item.usedDate}>{item.usedDate}</time>
              </td>
              <td className="px-4 py-4 text-slate-600">{item.merchantName}</td>
              <td className="px-4 py-4 text-right font-medium text-slate-900">
                <AmountText value={item.amount} />
              </td>
              <td className="px-4 py-4 text-slate-600">{item.paymentMethod}</td>
              <td className="px-4 py-4 text-center text-slate-600">{item.settlementRequest}</td>
              <td className="px-4 py-4 text-center">
                <StatusBadge status={item.attachmentStatus} />
              </td>
              <td className="px-4 py-4 text-center">
                <UrgencyBadge urgency={item.urgency} />
              </td>
              <td className="px-4 py-4 text-center">
                <StatusBadge status={item.status} />
              </td>
              <td className="px-4 py-4 text-center">
                <Link
                  href={`/approvals/pending/${item.requestNumber}`}
                  className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
                >
                  검토
                </Link>
              </td>
            </tr>
          ))}
        </DashboardTable>

        {filteredItems.length === 0 ? (
          <EmptyState
            title="조건에 맞는 승인 요청이 없습니다."
            description="상태, 경비 유형, 검색어를 조정해 다른 승인 요청을 확인해보세요."
          />
        ) : null}
      </section>
    </div>
  );
}
