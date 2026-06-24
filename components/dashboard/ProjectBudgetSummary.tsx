import { EmptyState } from "@/components/common/EmptyState";
import { ProgressBar } from "@/components/common/ProgressBar";
import type { ProjectBudget } from "@/types";
import { formatKrw } from "@/utils/format";
import { getBudgetHealthProgressTone } from "@/utils/projectBudget";

type ProjectBudgetSummaryProps = {
  items: ProjectBudget[];
  isLoading?: boolean;
};

export function ProjectBudgetSummary({
  items,
  isLoading = false,
}: ProjectBudgetSummaryProps) {
  const totalAmount = items.reduce((sum, item) => sum + item.totalBudget, 0);

  return (
    <section className="rounded-[1.75rem] border border-slate-200/90 bg-white p-5 shadow-sm">
      <div className="mb-5 flex items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-slate-950">프로젝트별 사용 현황</h3>
          <p className="mt-1 text-sm text-slate-500">
            Supabase `projects.budget_amount`와 승인 완료 지출 기준으로 사용률을 비교합니다.
          </p>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">
          {isLoading ? "로딩 중" : `총 ${formatKrw(totalAmount)}`}
        </span>
      </div>

      <div className="space-y-5">
        {items.map((item) => (
          <ProgressBar
            key={item.id}
            label={item.name}
            value={item.spentBudget}
            max={item.totalBudget || 100}
            rightText={
              item.budgetConfigured
                ? `${item.usageRate}%`
                : "예산 미설정"
            }
            description={
              item.budgetConfigured
                ? `사용 ${formatKrw(item.spentBudget)} / 잔여 ${formatKrw(item.remainingBudget)}`
                : `사용 ${formatKrw(item.spentBudget)} / 총예산 미설정`
            }
            tone={getBudgetHealthProgressTone(item.status)}
          />
        ))}
      </div>

      {isLoading ? (
        <EmptyState
          title="프로젝트별 사용 현황을 불러오는 중입니다."
          description="프로젝트 총예산과 승인 완료 사용액을 함께 조회하고 있습니다."
        />
      ) : null}

      {!isLoading && items.length === 0 ? (
        <EmptyState
          title="표시할 프로젝트 사용 현황이 없습니다."
          description="프로젝트 예산 또는 승인 완료 지출이 생기면 여기에 실제 데이터가 표시됩니다."
        />
      ) : null}
    </section>
  );
}
