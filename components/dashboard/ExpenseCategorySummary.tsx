import { EmptyState } from "@/components/common/EmptyState";
import { ProgressBar } from "@/components/common/ProgressBar";
import type { ExpenseCategory } from "@/types";
import { formatKrw } from "@/utils/format";

type ExpenseCategorySummaryProps = {
  items: ExpenseCategory[];
  isLoading?: boolean;
};

export function ExpenseCategorySummary({
  items,
  isLoading = false,
}: ExpenseCategorySummaryProps) {
  const totalAmount = items.reduce((sum, item) => sum + item.amount, 0);

  return (
    <section className="rounded-[1.75rem] border border-slate-200/90 bg-white p-5 shadow-sm">
      <div className="mb-5 flex items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-slate-950">경비 유형별 사용 현황</h3>
          <p className="mt-1 text-sm text-slate-500">
            이번 달 승인 지출이 어떤 유형에 집중되는지 확인합니다.
          </p>
        </div>
        <span className="rounded-full bg-[var(--primary-soft)] px-3 py-1 text-xs font-semibold text-[var(--primary)]">
          {isLoading ? "로딩 중" : `총 ${formatKrw(totalAmount)}`}
        </span>
      </div>

      <div className="space-y-5">
        {items.map((item) => {
          const share = totalAmount > 0 ? Math.round((item.amount / totalAmount) * 100) : 0;

          return (
            <ProgressBar
              key={item.category}
              label={item.category}
              value={item.amount}
              max={totalAmount || 100}
              rightText={formatKrw(item.amount)}
              description={`전체 승인 지출 중 ${share}% 비중`}
              tone="primary"
            />
          );
        })}
      </div>

      {isLoading ? (
        <EmptyState
          title="경비 유형별 사용 현황을 불러오는 중입니다."
          description="이번 달 승인 지출을 경비 유형 기준으로 집계하고 있습니다."
        />
      ) : null}

      {!isLoading && items.length === 0 ? (
        <EmptyState
          title="표시할 경비 유형 집계가 없습니다."
          description="이번 달 승인 완료된 지출이 생기면 여기에 자동으로 반영됩니다."
        />
      ) : null}
    </section>
  );
}
