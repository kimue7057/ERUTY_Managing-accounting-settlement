import { EmptyState } from "@/components/common/EmptyState";
import { ProgressBar } from "@/components/common/ProgressBar";
import type { ProjectBudget } from "@/types";
import { formatKrw } from "@/utils/format";

type ProjectBudgetSummaryProps = {
  items: ProjectBudget[];
  isLoading?: boolean;
};

export function ProjectBudgetSummary({
  items,
  isLoading = false,
}: ProjectBudgetSummaryProps) {
  const totalAmount = items[0]?.totalBudget ?? 0;

  return (
    <section className="rounded-[1.75rem] border border-slate-200/90 bg-white p-5 shadow-sm">
      <div className="mb-5 flex items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-slate-950">프로젝트별 사용 현황</h3>
          <p className="mt-1 text-sm text-slate-500">
            이번 달 승인 지출을 프로젝트 기준으로 나눠서 비교합니다.
          </p>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">
          {isLoading ? "로딩 중" : `총 ${formatKrw(totalAmount)}`}
        </span>
      </div>

      <div className="space-y-5">
        {items.map((item) => (
          <ProgressBar
            key={item.name}
            label={item.name}
            value={item.usageRate}
            rightText={formatKrw(item.spentBudget)}
            description={`이번 달 승인 지출 중 ${item.usageRate}% 비중`}
            tone={item.usageRate >= 60 ? "warning" : "primary"}
          />
        ))}
      </div>

      {isLoading ? (
        <EmptyState
          title="프로젝트별 사용 현황을 불러오는 중입니다."
          description="이번 달 승인 지출을 프로젝트 기준으로 집계하고 있습니다."
        />
      ) : null}

      {!isLoading && items.length === 0 ? (
        <EmptyState
          title="표시할 프로젝트 사용 현황이 없습니다."
          description="이번 달 승인 완료된 프로젝트 지출이 생기면 여기에 집계됩니다."
        />
      ) : null}
    </section>
  );
}
