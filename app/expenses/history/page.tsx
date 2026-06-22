"use client";

import { useMemo, useState } from "react";
import {
  CalendarDays,
  CircleCheckBig,
  CircleSlash2,
  CreditCard,
  Search,
} from "lucide-react";

import { AmountText } from "@/components/common/AmountText";
import { DashboardTable } from "@/components/common/DashboardTable";
import { EmptyState } from "@/components/common/EmptyState";
import { PageHeader } from "@/components/common/PageHeader";
import { StatCard } from "@/components/common/StatCard";
import { StatusBadge } from "@/components/common/StatusBadge";
import {
  expenseHistoryItems,
  expenseHistoryStatusOptions,
  expenseHistorySummary,
  expenseHistoryTypeOptions,
  roleViews,
} from "@/data/mockData";
import type { ExpenseHistoryItem } from "@/types";

const tableColumns = [
  { key: "requestNumber", label: "요청번호" },
  { key: "title", label: "경비 제목" },
  { key: "expenseType", label: "경비 유형" },
  { key: "usedDate", label: "사용일" },
  { key: "merchantName", label: "사용처" },
  { key: "amount", label: "사용 금액", align: "right" as const },
  { key: "paymentMethod", label: "결제수단" },
  { key: "settlementRequest", label: "정산 요청", align: "center" as const },
  { key: "status", label: "상태", align: "center" as const },
  { key: "attachmentStatus", label: "증빙", align: "center" as const },
  { key: "requestedAt", label: "요청일", align: "right" as const },
  { key: "detail", label: "상세보기", align: "center" as const },
];

export default function ExpenseHistoryPage() {
  const [statusFilter, setStatusFilter] =
    useState<(typeof expenseHistoryStatusOptions)[number]>("전체");
  const [expenseTypeFilter, setExpenseTypeFilter] =
    useState<(typeof expenseHistoryTypeOptions)[number]>("전체");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedItem, setSelectedItem] = useState<ExpenseHistoryItem | null>(null);

  const filteredItems = useMemo(() => {
    const normalizedQuery = searchTerm.trim().toLowerCase();

    return expenseHistoryItems.filter((item) => {
      const matchesStatus = statusFilter === "전체" || item.status === statusFilter;
      const matchesType = expenseTypeFilter === "전체" || item.expenseType === expenseTypeFilter;
      const matchesQuery =
        normalizedQuery.length === 0 ||
        item.title.toLowerCase().includes(normalizedQuery) ||
        item.merchantName.toLowerCase().includes(normalizedQuery);

      return matchesStatus && matchesType && matchesQuery;
    });
  }, [expenseTypeFilter, searchTerm, statusFilter]);

  return (
    <div className="space-y-8">
      <PageHeader
        title="내 지출 내역"
        description="내가 등록한 경비 요청의 승인 상태와 정산 진행 상황을 확인합니다."
        roles={roleViews}
        activeRole="직원 보기"
        eyebrow="경비 조회"
        badgeText="직원 경비 현황"
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {expenseHistorySummary.map((summary, index) => {
          const icons = [
            <CalendarDays key="requested" className="h-5 w-5" strokeWidth={1.8} />,
            <CircleCheckBig key="approved" className="h-5 w-5" strokeWidth={1.8} />,
            <CreditCard key="settlement" className="h-5 w-5" strokeWidth={1.8} />,
            <CircleSlash2 key="hold" className="h-5 w-5" strokeWidth={1.8} />,
          ];

          return (
            <StatCard
              key={summary.id}
              title={summary.title}
              description={summary.description}
              value={<AmountText value={summary.value} />}
              icon={icons[index]}
            />
          );
        })}
      </section>

      <section className="rounded-[1.75rem] border border-slate-200/90 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <h3 className="text-lg font-semibold text-slate-950">필터 및 검색</h3>
              <p className="mt-1 text-sm text-slate-500">
                상태, 경비 유형, 제목 또는 사용처 기준으로 내역을 빠르게 좁혀볼 수 있습니다.
              </p>
            </div>
            <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">
              총 {filteredItems.length}건 표시
            </span>
          </div>

          <div className="grid gap-4 xl:grid-cols-[180px_210px_minmax(0,1fr)_280px]">
            <div>
              <label htmlFor="status-filter" className="text-sm font-semibold text-slate-900">
                상태 필터
              </label>
              <select
                id="status-filter"
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(event.target.value as (typeof expenseHistoryStatusOptions)[number])
                }
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-[var(--primary)] focus:ring-4 focus:ring-[color:rgba(22,59,111,0.08)]"
              >
                {expenseHistoryStatusOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="expense-type-filter" className="text-sm font-semibold text-slate-900">
                경비 유형 필터
              </label>
              <select
                id="expense-type-filter"
                value={expenseTypeFilter}
                onChange={(event) =>
                  setExpenseTypeFilter(event.target.value as (typeof expenseHistoryTypeOptions)[number])
                }
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-[var(--primary)] focus:ring-4 focus:ring-[color:rgba(22,59,111,0.08)]"
              >
                {expenseHistoryTypeOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="expense-search" className="text-sm font-semibold text-slate-900">
                제목/사용처 검색
              </label>
              <div className="relative mt-2">
                <Search
                  className="pointer-events-none absolute left-4 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-slate-400"
                  strokeWidth={1.8}
                />
                <input
                  id="expense-search"
                  type="text"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="예: 택시비, 스타벅스, 쿠팡"
                  className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-[var(--primary)] focus:ring-4 focus:ring-[color:rgba(22,59,111,0.08)]"
                />
              </div>
            </div>

            <div>
              <p className="text-sm font-semibold text-slate-900">기간 선택</p>
              <div className="mt-2 grid grid-cols-2 gap-3">
                <input
                  type="date"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500 shadow-sm outline-none"
                />
                <input
                  type="date"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500 shadow-sm outline-none"
                />
              </div>
              <p className="mt-2 text-xs text-slate-500">
                기간 UI는 표시용이며, 이번 단계에서는 상태/유형/검색 필터만 동작합니다.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-[1.75rem] border border-slate-200/90 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-slate-950">내 경비 요청 목록</h3>
            <p className="mt-1 text-sm text-slate-500">
              내가 등록한 경비 요청의 승인 상태와 증빙 첨부 여부를 한 번에 확인합니다.
            </p>
          </div>
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
                <StatusBadge status={item.status} />
              </td>
              <td className="px-4 py-4 text-center">
                <StatusBadge status={item.attachmentStatus} />
              </td>
              <td className="px-4 py-4 text-right text-slate-500">
                <time dateTime={item.requestedAt}>{item.requestedAt}</time>
              </td>
              <td className="px-4 py-4 text-center">
                <button
                  type="button"
                  onClick={() => setSelectedItem(item)}
                  className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
                >
                  상세보기
                </button>
              </td>
            </tr>
          ))}
        </DashboardTable>

        {filteredItems.length === 0 ? (
          <EmptyState
            title="조건에 맞는 경비 요청이 없습니다."
            description="필터를 조정하거나 검색어를 비워 다른 경비 요청을 확인해보세요."
          />
        ) : null}

        <div className="mt-5 rounded-2xl border border-sky-100 bg-sky-50 px-4 py-4 text-sm leading-6 text-sky-800">
          승인완료된 개인카드/현금 사용 건은 월말 정산 대상에 포함됩니다. 증빙이 없는 경비는 정산이 보류될 수 있습니다.
        </div>
      </section>

      {selectedItem ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4 py-8">
          <div className="w-full max-w-2xl rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-slate-500">{selectedItem.requestNumber}</p>
                <h3 className="mt-2 text-2xl font-semibold text-slate-950">{selectedItem.title}</h3>
                <p className="mt-2 text-sm text-slate-500">
                  상세보기는 mock 모달이며, 실제 상세 페이지 연결은 이번 단계 범위에서 제외했습니다.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedItem(null)}
                className="inline-flex rounded-2xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
              >
                닫기
              </button>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl bg-slate-50 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">경비 유형</p>
                <p className="mt-2 text-sm font-semibold text-slate-900">{selectedItem.expenseType}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">사용일</p>
                <p className="mt-2 text-sm font-semibold text-slate-900">{selectedItem.usedDate}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">사용처</p>
                <p className="mt-2 text-sm font-semibold text-slate-900">{selectedItem.merchantName}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">사용 금액</p>
                <p className="mt-2 text-sm font-semibold text-slate-900">
                  <AmountText value={selectedItem.amount} />
                </p>
              </div>
              <div className="rounded-2xl bg-slate-50 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">결제수단</p>
                <p className="mt-2 text-sm font-semibold text-slate-900">{selectedItem.paymentMethod}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">정산 요청</p>
                <p className="mt-2 text-sm font-semibold text-slate-900">{selectedItem.settlementRequest}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">상태</p>
                <div className="mt-2">
                  <StatusBadge status={selectedItem.status} />
                </div>
              </div>
              <div className="rounded-2xl bg-slate-50 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">증빙 상태</p>
                <div className="mt-2">
                  <StatusBadge status={selectedItem.attachmentStatus} />
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
