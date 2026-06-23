import { DashboardTable } from "@/components/common/DashboardTable";
import { EmptyState } from "@/components/common/EmptyState";
import { StatusBadge } from "@/components/common/StatusBadge";
import type { RecentExpense } from "@/types";
import { formatKrw } from "@/utils/format";

type RecentExpensesProps = {
  items: RecentExpense[];
  isLoading?: boolean;
};

const columns = [
  { key: "draftNumber", label: "기안번호" },
  { key: "title", label: "제목" },
  { key: "requester", label: "요청자" },
  { key: "amount", label: "금액", align: "right" as const },
  { key: "status", label: "상태", align: "center" as const },
  { key: "requestedAt", label: "요청일", align: "right" as const },
];

export function RecentExpenses({
  items,
  isLoading = false,
}: RecentExpensesProps) {
  return (
    <section className="rounded-[1.75rem] border border-slate-200/90 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-slate-950">최근 지출 기안 목록</h3>
          <p className="mt-1 text-sm text-slate-500">
            최근 등록된 경비 요청을 최신순으로 확인합니다.
          </p>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">
          {isLoading ? "로딩 중" : `최근 ${items.length}건`}
        </span>
      </div>

      <DashboardTable columns={columns}>
        {items.map((item) => (
          <tr key={item.draftNumber} className="border-b border-slate-100 last:border-b-0">
            <td className="px-4 py-4 font-medium text-slate-700">{item.draftNumber}</td>
            <td className="px-4 py-4 text-slate-900">{item.title}</td>
            <td className="px-4 py-4 text-slate-600">{item.requester}</td>
            <td className="px-4 py-4 text-right font-medium text-slate-900">
              {formatKrw(item.amount)}
            </td>
            <td className="px-4 py-4 text-center">
              <StatusBadge status={item.status} />
            </td>
            <td className="px-4 py-4 text-right text-slate-500">
              <time dateTime={item.requestedAt}>{item.requestedAt}</time>
            </td>
          </tr>
        ))}
      </DashboardTable>

      {isLoading ? (
        <EmptyState
          title="최근 지출 기안 목록을 불러오는 중입니다."
          description="Supabase에서 최신 경비 요청을 조회하고 있습니다."
        />
      ) : null}

      {!isLoading && items.length === 0 ? (
        <EmptyState
          title="표시할 최근 기안이 없습니다."
          description="아직 등록된 경비 요청이 없거나 조회 가능한 데이터가 없습니다."
        />
      ) : null}
    </section>
  );
}
