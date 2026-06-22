import { ProgressBar } from "@/components/common/ProgressBar";
import type { ProjectBudget } from "@/types";
import { formatKrw } from "@/utils/format";

type ProjectBudgetSummaryProps = {
  items: ProjectBudget[];
};

export function ProjectBudgetSummary({ items }: ProjectBudgetSummaryProps) {
  return (
    <section className="rounded-[1.75rem] border border-slate-200/90 bg-white p-5 shadow-sm">
      <div className="mb-5">
        <h3 className="text-lg font-semibold text-slate-950">프로젝트별 예산 사용률</h3>
        <p className="mt-1 text-sm text-slate-500">프로젝트 단위 예산 집행 수준을 비교합니다.</p>
      </div>

      <div className="space-y-5">
        {items.map((item) => (
          <ProgressBar
            key={item.name}
            label={item.name}
            value={item.usageRate}
            rightText={`${item.usageRate}%`}
            description={`총예산 ${formatKrw(item.totalBudget)} · 사용 ${formatKrw(item.spentBudget)}`}
            tone={item.usageRate >= 80 ? "danger" : item.usageRate >= 70 ? "warning" : "primary"}
          />
        ))}
      </div>
    </section>
  );
}
