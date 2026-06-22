"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  BadgeCheck,
  FolderKanban,
  Landmark,
  WalletCards,
} from "lucide-react";

import { AmountText } from "@/components/common/AmountText";
import { DashboardTable } from "@/components/common/DashboardTable";
import { PageHeader } from "@/components/common/PageHeader";
import { ProgressBar } from "@/components/common/ProgressBar";
import { StatCard } from "@/components/common/StatCard";
import {
  projectBudgetDetails,
  projectBudgetSummaryItems,
  roleViews,
} from "@/data/mockData";
import type { BudgetHealthStatus } from "@/types";
import { formatKrw } from "@/utils/format";

const tableColumns = [
  { key: "category", label: "예산 항목" },
  { key: "allocatedBudget", label: "배정 예산", align: "right" as const },
  { key: "spentAmount", label: "사용 금액", align: "right" as const },
  { key: "pendingAmount", label: "승인 예정 금액", align: "right" as const },
  { key: "remainingBudget", label: "잔여 예산", align: "right" as const },
  { key: "usageRate", label: "사용률", align: "right" as const },
  { key: "status", label: "상태", align: "center" as const },
];

const budgetStatusToneMap: Record<
  BudgetHealthStatus,
  {
    badge: string;
    text: string;
    bar: string;
    progressTone: "success" | "warning" | "risk" | "danger";
  }
> = {
  정상: {
    badge: "border-emerald-200 bg-emerald-50 text-emerald-700",
    text: "text-emerald-700",
    bar: "bg-emerald-500",
    progressTone: "success",
  },
  주의: {
    badge: "border-amber-200 bg-amber-50 text-amber-700",
    text: "text-amber-700",
    bar: "bg-amber-500",
    progressTone: "warning",
  },
  초과위험: {
    badge: "border-orange-200 bg-orange-50 text-orange-700",
    text: "text-orange-700",
    bar: "bg-orange-500",
    progressTone: "risk",
  },
  초과: {
    badge: "border-rose-200 bg-rose-50 text-rose-700",
    text: "text-rose-700",
    bar: "bg-rose-500",
    progressTone: "danger",
  },
};

function BudgetStatusBadge({ status }: { status: BudgetHealthStatus }) {
  return (
    <span
      className={[
        "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold",
        budgetStatusToneMap[status].badge,
      ].join(" ")}
    >
      {status}
    </span>
  );
}

function UsageMeter({
  usageRate,
  status,
}: {
  usageRate: number;
  status: BudgetHealthStatus;
}) {
  return (
    <div className="ml-auto flex w-40 items-center gap-3">
      <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-100">
        <div
          className={["h-full rounded-full", budgetStatusToneMap[status].bar].join(" ")}
          style={{ width: `${Math.min(usageRate, 100)}%` }}
        />
      </div>
      <span className={["w-10 text-right text-xs font-semibold", budgetStatusToneMap[status].text].join(" ")}>
        {usageRate}%
      </span>
    </div>
  );
}

export default function ProjectBudgetPage() {
  const [selectedProjectId, setSelectedProjectId] = useState(projectBudgetDetails[0]?.id ?? "");

  const selectedProject = useMemo(
    () =>
      projectBudgetDetails.find((project) => project.id === selectedProjectId) ??
      projectBudgetDetails[0],
    [selectedProjectId],
  );

  const summaryIcons = [
    <FolderKanban key="total-budget" className="h-5 w-5" strokeWidth={1.8} />,
    <WalletCards key="spent-budget" className="h-5 w-5" strokeWidth={1.8} />,
    <BadgeCheck key="pending-budget" className="h-5 w-5" strokeWidth={1.8} />,
    <Landmark key="remaining-budget" className="h-5 w-5" strokeWidth={1.8} />,
  ];

  return (
    <div className="space-y-8">
      <PageHeader
        title="프로젝트 예산"
        description="프로젝트별 총예산, 사용액, 승인 예정액, 잔여 예산을 한 화면에서 확인합니다."
        roles={roleViews}
        activeRole="관리자 보기"
        eyebrow="예산 운영"
        badgeText="프로젝트 집행 현황"
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {projectBudgetSummaryItems.map((summary, index) => (
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
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-950">사용률 기준 안내</h3>
            <p className="mt-1 text-sm text-slate-500">
              프로젝트 카드와 예산 항목 표의 상태는 사용률 기준으로 구분되며, 프로젝트 카드를 클릭하면 하단 상세 내역이 바뀝니다.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <BudgetStatusBadge status="정상" />
            <BudgetStatusBadge status="주의" />
            <BudgetStatusBadge status="초과위험" />
            <BudgetStatusBadge status="초과" />
          </div>
        </div>
      </section>

      <section className="rounded-[1.75rem] border border-slate-200/90 bg-white p-5 shadow-sm">
        <div className="mb-5">
          <h3 className="text-lg font-semibold text-slate-950">프로젝트별 예산 현황</h3>
          <p className="mt-1 text-sm text-slate-500">
            총예산, 사용액, 승인 예정액, 잔여 예산을 프로젝트 단위로 비교하고 현재 예산 리스크를 빠르게 확인합니다.
          </p>
        </div>

        <div className="grid gap-4 xl:grid-cols-2 2xl:grid-cols-4">
          {projectBudgetDetails.map((project) => (
            <button
              key={project.id}
              type="button"
              onClick={() => setSelectedProjectId(project.id)}
              aria-pressed={selectedProject?.id === project.id}
              className={[
                "rounded-[1.5rem] border bg-slate-50/70 p-5 text-left shadow-sm transition",
                selectedProject?.id === project.id
                  ? "border-[var(--primary)] bg-white ring-4 ring-[color:rgba(22,59,111,0.08)]"
                  : "border-slate-200 hover:border-slate-300 hover:bg-white",
              ].join(" ")}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                    Project Budget
                  </p>
                  <h4 className="mt-2 text-lg font-semibold text-slate-950">{project.name}</h4>
                </div>
                <BudgetStatusBadge status={project.status} />
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl bg-white px-4 py-3 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                    총예산
                  </p>
                  <p className="mt-2 text-sm font-semibold text-slate-950">
                    <AmountText value={project.totalBudget} />
                  </p>
                </div>
                <div className="rounded-2xl bg-white px-4 py-3 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                    사용액
                  </p>
                  <p className="mt-2 text-sm font-semibold text-slate-950">
                    <AmountText value={project.spentAmount} />
                  </p>
                </div>
                <div className="rounded-2xl bg-white px-4 py-3 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                    승인 예정액
                  </p>
                  <p className="mt-2 text-sm font-semibold text-[var(--primary)]">
                    <AmountText value={project.pendingAmount} />
                  </p>
                </div>
                <div className="rounded-2xl bg-white px-4 py-3 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                    잔여 예산
                  </p>
                  <p className="mt-2 text-sm font-semibold text-slate-950">
                    <AmountText value={project.remainingBudget} />
                  </p>
                </div>
              </div>

              <div className="mt-5">
                <ProgressBar
                  label="예산 사용률"
                  value={project.usageRate}
                  rightText={`${project.usageRate}%`}
                  description={`사용 ${project.usageRate}% · 승인 예정 ${formatKrw(project.pendingAmount)}`}
                  tone={budgetStatusToneMap[project.status].progressTone}
                />
              </div>
            </button>
          ))}
        </div>
      </section>

      {selectedProject ? (
        <section className="rounded-[1.75rem] border border-slate-200/90 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h3 className="text-lg font-semibold text-slate-950">
                  {selectedProject.name} 예산 항목 상세
                </h3>
                <BudgetStatusBadge status={selectedProject.status} />
              </div>
              <p className="mt-2 text-sm text-slate-500">
                선택한 프로젝트의 예산 항목별 배정 금액, 현재 사용액, 승인 예정액, 잔여 예산을 확인합니다.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-600">
              현재 선택 프로젝트: <span className="font-semibold text-slate-900">{selectedProject.name}</span>
            </div>
          </div>

          <div className="mt-5 grid gap-3 lg:grid-cols-5">
            <div className="rounded-2xl bg-slate-50 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                총예산
              </p>
              <p className="mt-2 text-sm font-semibold text-slate-950">
                <AmountText value={selectedProject.totalBudget} />
              </p>
            </div>
            <div className="rounded-2xl bg-slate-50 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                사용액
              </p>
              <p className="mt-2 text-sm font-semibold text-slate-950">
                <AmountText value={selectedProject.spentAmount} />
              </p>
            </div>
            <div className="rounded-2xl bg-slate-50 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                승인 예정액
              </p>
              <p className="mt-2 text-sm font-semibold text-[var(--primary)]">
                <AmountText value={selectedProject.pendingAmount} />
              </p>
            </div>
            <div className="rounded-2xl bg-slate-50 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                잔여 예산
              </p>
              <p className="mt-2 text-sm font-semibold text-slate-950">
                <AmountText value={selectedProject.remainingBudget} />
              </p>
            </div>
            <div className="rounded-2xl bg-slate-50 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                사용률
              </p>
              <p className="mt-2 text-sm font-semibold text-slate-950">
                {selectedProject.usageRate}%
              </p>
            </div>
          </div>

          <div className="mt-6">
            <DashboardTable columns={tableColumns}>
              {selectedProject.budgetItems.map((item) => (
                <tr key={item.category} className="border-b border-slate-100 last:border-b-0">
                  <td className="px-4 py-4 font-medium text-slate-900">{item.category}</td>
                  <td className="px-4 py-4 text-right font-medium text-slate-900">
                    <AmountText value={item.allocatedBudget} />
                  </td>
                  <td className="px-4 py-4 text-right text-slate-700">
                    <AmountText value={item.spentAmount} />
                  </td>
                  <td className="px-4 py-4 text-right text-[var(--primary)]">
                    <AmountText value={item.pendingAmount} />
                  </td>
                  <td
                    className={[
                      "px-4 py-4 text-right font-medium",
                      item.remainingBudget < 0 ? "text-rose-700" : "text-slate-900",
                    ].join(" ")}
                  >
                    <AmountText value={item.remainingBudget} />
                  </td>
                  <td className="px-4 py-4 text-right">
                    <UsageMeter usageRate={item.usageRate} status={item.status} />
                  </td>
                  <td className="px-4 py-4 text-center">
                    <BudgetStatusBadge status={item.status} />
                  </td>
                </tr>
              ))}
            </DashboardTable>
          </div>

          <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm leading-6 text-slate-600">
            <span className="font-semibold text-slate-900">참고:</span> 사용률은 현재 사용액 기준으로 표시되며,
            승인 예정액은 별도 컬럼으로 함께 보여 예산 초과 가능성을 미리 판단할 수 있도록 구성했습니다.
          </div>
        </section>
      ) : null}

      <section className="rounded-[1.75rem] border border-slate-200/90 bg-white p-5 shadow-sm">
        <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm leading-6 text-amber-800">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" strokeWidth={1.9} />
          <p>
            실제 예산 계산, DB 저장, API 연동 없이 mock data와 화면 전환만 구현했습니다. 프로젝트 카드를
            클릭하면 하단 예산 항목별 표가 즉시 전환됩니다.
          </p>
        </div>
      </section>
    </div>
  );
}
