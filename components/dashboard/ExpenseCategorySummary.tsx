import { ProgressBar } from "@/components/common/ProgressBar";
import type { ExpenseCategory } from "@/types";
import { formatKrw } from "@/utils/format";

type ExpenseCategorySummaryProps = {
  items: ExpenseCategory[];
};

export function ExpenseCategorySummary({ items }: ExpenseCategorySummaryProps) {
  const totalAmount = items.reduce((sum, item) => sum + item.amount, 0);

  return (
    <section className="rounded-[1.75rem] border border-slate-200/90 bg-white p-5 shadow-sm">
      <div className="mb-5 flex items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-slate-950">지출 항목별 사용 현황</h3>
          <p className="mt-1 text-sm text-slate-500">
            이번 달 지출이 어떤 항목에 집중되는지 보여줍니다.
          </p>
        </div>
        <span className="rounded-full bg-[var(--primary-soft)] px-3 py-1 text-xs font-semibold text-[var(--primary)]">
          총 {formatKrw(totalAmount)}
        </span>
      </div>

      <div className="space-y-5">
        {items.map((item) => {
          const share = Math.round((item.amount / totalAmount) * 100);

          return (
            <ProgressBar
              key={item.category}
              label={item.category}
              value={item.amount}
              max={totalAmount}
              rightText={formatKrw(item.amount)}
              description={`전체 지출 중 ${share}% 비중`}
              tone="primary"
            />
          );
        })}
      </div>
    </section>
  );
}
