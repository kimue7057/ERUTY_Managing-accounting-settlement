"use client";

import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import {
  ArrowDownLeft,
  ArrowRightLeft,
  ArrowUpRight,
  BadgeCheck,
  Building2,
  CreditCard,
  Landmark,
  Search,
  WalletCards,
} from "lucide-react";

import { AmountText } from "@/components/common/AmountText";
import { DashboardTable } from "@/components/common/DashboardTable";
import { EmptyState } from "@/components/common/EmptyState";
import { PageHeader } from "@/components/common/PageHeader";
import { StatCard } from "@/components/common/StatCard";
import {
  fundAccountFilterOptions,
  fundAccounts,
  fundSummaryItems,
  fundTransactionTypeOptions,
  fundTransactions,
  roleViews,
} from "@/data/mockData";
import type { FundTransactionType } from "@/types";

const tableColumns = [
  { key: "transactionDate", label: "거래일" },
  { key: "accountName", label: "계좌" },
  { key: "type", label: "구분", align: "center" as const },
  { key: "description", label: "내용" },
  { key: "amount", label: "금액", align: "right" as const },
  { key: "balanceAfter", label: "거래 후 잔액", align: "right" as const },
  { key: "linkedRequestNumber", label: "연결 요청번호", align: "center" as const },
];

const transactionToneMap: Record<
  FundTransactionType,
  {
    badge: string;
    amount: string;
    icon: ReactNode;
  }
> = {
  입금: {
    badge: "border-sky-200 bg-sky-50 text-sky-700",
    amount: "text-sky-700",
    icon: <ArrowDownLeft className="h-4 w-4" strokeWidth={1.8} />,
  },
  출금: {
    badge: "border-rose-200 bg-rose-50 text-rose-700",
    amount: "text-rose-700",
    icon: <ArrowUpRight className="h-4 w-4" strokeWidth={1.8} />,
  },
  이체: {
    badge: "border-slate-200 bg-slate-100 text-slate-700",
    amount: "text-slate-700",
    icon: <ArrowRightLeft className="h-4 w-4" strokeWidth={1.8} />,
  },
  조정: {
    badge: "border-amber-200 bg-amber-50 text-amber-700",
    amount: "text-amber-700",
    icon: <Building2 className="h-4 w-4" strokeWidth={1.8} />,
  },
};

function TransactionTypeBadge({ type }: { type: FundTransactionType }) {
  const tone = transactionToneMap[type];

  return (
    <span
      className={[
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold",
        tone.badge,
      ].join(" ")}
    >
      {tone.icon}
      {type}
    </span>
  );
}

export default function FundsPage() {
  const [accountFilter, setAccountFilter] =
    useState<(typeof fundAccountFilterOptions)[number]>("전체");
  const [typeFilter, setTypeFilter] =
    useState<(typeof fundTransactionTypeOptions)[number]>("전체");
  const [searchTerm, setSearchTerm] = useState("");

  const filteredTransactions = useMemo(() => {
    const normalizedQuery = searchTerm.trim().toLowerCase();

    return fundTransactions.filter((transaction) => {
      const matchesAccount =
        accountFilter === "전체" || transaction.accountName === accountFilter;
      const matchesType = typeFilter === "전체" || transaction.type === typeFilter;
      const matchesQuery =
        normalizedQuery.length === 0 ||
        transaction.accountName.toLowerCase().includes(normalizedQuery) ||
        transaction.description.toLowerCase().includes(normalizedQuery) ||
        (transaction.linkedRequestNumber?.toLowerCase().includes(normalizedQuery) ?? false);

      return matchesAccount && matchesType && matchesQuery;
    });
  }, [accountFilter, searchTerm, typeFilter]);

  const summaryIcons = [
    <WalletCards key="total-balance" className="h-5 w-5" strokeWidth={1.8} />,
    <BadgeCheck key="approved-unpaid" className="h-5 w-5" strokeWidth={1.8} />,
    <CreditCard key="settlement-due" className="h-5 w-5" strokeWidth={1.8} />,
    <Building2 key="fixed-cost" className="h-5 w-5" strokeWidth={1.8} />,
    <Landmark key="available-cash" className="h-5 w-5" strokeWidth={1.8} />,
  ];

  return (
    <div className="space-y-8">
      <PageHeader
        title="회사 자금 현황"
        description="회사 전체 자금 상태와 예정 지출 반영 후 실제 가용 금액을 확인합니다."
        roles={roleViews}
        activeRole="대표 보기"
        eyebrow="자금 모니터링"
        badgeText="대표/회계관리자 뷰"
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {fundSummaryItems.map((summary, index) => (
          <StatCard
            key={summary.id}
            title={summary.title}
            description={summary.description}
            value={<AmountText value={summary.value} />}
            icon={summaryIcons[index]}
          />
        ))}
      </section>

      <section className="rounded-[1.75rem] border border-slate-200/90 bg-[var(--card-secondary)] p-5 shadow-sm">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-950">가용 자금 계산 기준</h3>
            <p className="mt-1 text-sm text-slate-500">
              실질 가용 자금은 전체 계좌 잔액에서 승인 후 미지급 금액, 직원 정산 예정액, 고정비 예정액을 차감한 값입니다.
            </p>
          </div>
          <div className="rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-[var(--primary)] shadow-sm">
            52,400,000원 - 7,000,000원 - 820,000원 - 2,780,000원 = 41,800,000원
          </div>
        </div>
      </section>

      <section className="rounded-[1.75rem] border border-slate-200/90 bg-white p-5 shadow-sm">
        <div className="mb-5">
          <h3 className="text-lg font-semibold text-slate-950">계좌별 자금 현황</h3>
          <p className="mt-1 text-sm text-slate-500">
            계좌별 잔액과 이번 달 입출금 규모를 함께 보며 어느 계좌에서 자금이 움직였는지 빠르게 확인합니다.
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-4">
          {fundAccounts.map((account) => (
            <article
              key={account.id}
              className="rounded-[1.5rem] border border-slate-200 bg-slate-50/70 p-5 shadow-sm"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-500">
                    {account.bankName}
                  </span>
                  <h4 className="mt-3 text-lg font-semibold text-slate-950">
                    {account.accountName}
                  </h4>
                  <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
                    <AmountText value={account.balance} />
                  </p>
                </div>

                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-[var(--primary)] shadow-sm">
                  <Landmark className="h-5 w-5" strokeWidth={1.8} />
                </div>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl bg-white px-4 py-3 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                    이번 달 입금
                  </p>
                  <p className="mt-2 text-sm font-semibold text-sky-700">
                    <AmountText value={account.monthlyDeposit} />
                  </p>
                </div>
                <div className="rounded-2xl bg-white px-4 py-3 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                    이번 달 출금
                  </p>
                  <p className="mt-2 text-sm font-semibold text-rose-700">
                    <AmountText value={account.monthlyWithdrawal} />
                  </p>
                </div>
                <div className="rounded-2xl bg-white px-4 py-3 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                    최근 거래일
                  </p>
                  <p className="mt-2 text-sm font-semibold text-slate-900">
                    {account.recentTransactionDate}
                  </p>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="rounded-[1.75rem] border border-slate-200/90 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <h3 className="text-lg font-semibold text-slate-950">자금 출납 내역 필터</h3>
              <p className="mt-1 text-sm text-slate-500">
                계좌, 거래 구분, 검색어로 필요한 출납 내역만 빠르게 좁혀볼 수 있습니다.
              </p>
            </div>
            <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">
              총 {filteredTransactions.length}건 표시
            </span>
          </div>

          <div className="grid gap-4 xl:grid-cols-[220px_220px_minmax(0,1fr)]">
            <div>
              <label htmlFor="fund-account-filter" className="text-sm font-semibold text-slate-900">
                계좌별 필터
              </label>
              <select
                id="fund-account-filter"
                value={accountFilter}
                onChange={(event) =>
                  setAccountFilter(event.target.value as (typeof fundAccountFilterOptions)[number])
                }
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-[var(--primary)] focus:ring-4 focus:ring-[color:rgba(22,59,111,0.08)]"
              >
                {fundAccountFilterOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="fund-type-filter" className="text-sm font-semibold text-slate-900">
                입금/출금 구분 필터
              </label>
              <select
                id="fund-type-filter"
                value={typeFilter}
                onChange={(event) =>
                  setTypeFilter(event.target.value as (typeof fundTransactionTypeOptions)[number])
                }
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-[var(--primary)] focus:ring-4 focus:ring-[color:rgba(22,59,111,0.08)]"
              >
                {fundTransactionTypeOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="fund-search" className="text-sm font-semibold text-slate-900">
                검색창
              </label>
              <div className="relative mt-2">
                <Search
                  className="pointer-events-none absolute left-4 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-slate-400"
                  strokeWidth={1.8}
                />
                <input
                  id="fund-search"
                  type="text"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="내용, 계좌명, 요청번호 검색"
                  className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-[var(--primary)] focus:ring-4 focus:ring-[color:rgba(22,59,111,0.08)]"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-[1.75rem] border border-slate-200/90 bg-white p-5 shadow-sm">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-slate-950">자금 출납 내역</h3>
          <p className="mt-1 text-sm text-slate-500">
            실제 은행 연동 없이 목업 데이터로 구성한 거래 내역이며, 자금 흐름과 연결 요청번호를 함께 확인할 수 있습니다.
          </p>
        </div>

        <DashboardTable columns={tableColumns}>
          {filteredTransactions.map((transaction) => (
            <tr key={transaction.id} className="border-b border-slate-100 last:border-b-0">
              <td className="px-4 py-4 text-slate-500">
                <time dateTime={transaction.transactionDate}>{transaction.transactionDate}</time>
              </td>
              <td className="px-4 py-4 font-medium text-slate-900">{transaction.accountName}</td>
              <td className="px-4 py-4 text-center">
                <TransactionTypeBadge type={transaction.type} />
              </td>
              <td className="px-4 py-4 text-slate-600">{transaction.description}</td>
              <td className="px-4 py-4 text-right font-semibold">
                <AmountText
                  value={transaction.amount}
                  className={transactionToneMap[transaction.type].amount}
                />
              </td>
              <td className="px-4 py-4 text-right font-medium text-slate-900">
                <AmountText value={transaction.balanceAfter} />
              </td>
              <td className="px-4 py-4 text-center">
                {transaction.linkedRequestNumber ? (
                  <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                    {transaction.linkedRequestNumber}
                  </span>
                ) : (
                  <span className="text-slate-300">-</span>
                )}
              </td>
            </tr>
          ))}
        </DashboardTable>

        {filteredTransactions.length === 0 ? (
          <EmptyState
            title="조건에 맞는 출납 내역이 없습니다."
            description="필터를 조정하거나 검색어를 변경해 다른 자금 흐름을 확인해보세요."
          />
        ) : null}
      </section>
    </div>
  );
}
