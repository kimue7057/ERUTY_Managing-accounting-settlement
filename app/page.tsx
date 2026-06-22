import type { LucideIcon } from "lucide-react";
import {
  BanknoteArrowDown,
  CircleDollarSign,
  ClipboardList,
  CreditCard,
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
  expenseCategories,
  pendingApprovals,
  projectBudgets,
  recentExpenses,
  roleViews,
  summaryStats,
} from "@/data/mockData";
import type { SummaryIconKey } from "@/types";

const iconMap: Record<SummaryIconKey, LucideIcon> = {
  holding: Wallet,
  available: Landmark,
  approved: CircleDollarSign,
  paid: CreditCard,
  settlement: BanknoteArrowDown,
  pending: ClipboardList,
};

export default function Home() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="대시보드"
        description="회사 자금 현황과 지출 흐름을 한눈에 확인합니다."
        roles={roleViews}
        activeRole="관리자 보기"
        eyebrow="운영 대시보드"
        badgeText="자금/승인 흐름 요약"
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        {summaryStats.map((stat) => {
          const Icon = iconMap[stat.iconKey];

          return (
            <StatCard
              key={stat.id}
              title={stat.title}
              description={stat.description}
              value={
                stat.id === "pending-approvals" ? (
                  <span>{stat.value}건</span>
                ) : (
                  <AmountText value={stat.value} />
                )
              }
              icon={<Icon className="h-5 w-5" strokeWidth={1.8} />}
            />
          );
        })}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.45fr_1fr]">
        <div className="space-y-6">
          <RecentExpenses items={recentExpenses} />
          <PendingApprovals items={pendingApprovals} />
        </div>

        <div className="space-y-6">
          <ProjectBudgetSummary items={projectBudgets} />
          <ExpenseCategorySummary items={expenseCategories} />
        </div>
      </section>
    </div>
  );
}
