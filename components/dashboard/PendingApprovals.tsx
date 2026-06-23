import { DashboardTable } from "@/components/common/DashboardTable";
import { EmptyState } from "@/components/common/EmptyState";
import type { PendingApproval } from "@/types";
import { formatKrw } from "@/utils/format";

type PendingApprovalsProps = {
  items: PendingApproval[];
  isLoading?: boolean;
};

const columns = [
  { key: "requester", label: "요청자" },
  { key: "title", label: "제목" },
  { key: "project", label: "프로젝트" },
  { key: "amount", label: "요청 금액", align: "right" as const },
  { key: "urgency", label: "긴급 여부", align: "center" as const },
];

export function PendingApprovals({
  items,
  isLoading = false,
}: PendingApprovalsProps) {
  return (
    <section className="rounded-[1.75rem] border border-slate-200/90 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-slate-950">승인 대기 지출 목록</h3>
          <p className="mt-1 text-sm text-slate-500">
            현재 submitted 상태인 요청을 우선 검토 순서로 확인합니다.
          </p>
        </div>
        <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
          {isLoading ? "로딩 중" : `대기 ${items.length}건`}
        </span>
      </div>

      <DashboardTable columns={columns}>
        {items.map((item) => (
          <tr
            key={`${item.requester}-${item.title}-${item.project}`}
            className="border-b border-slate-100 last:border-b-0"
          >
            <td className="px-4 py-4 font-medium text-slate-700">{item.requester}</td>
            <td className="px-4 py-4 text-slate-900">{item.title}</td>
            <td className="px-4 py-4 text-slate-600">{item.project}</td>
            <td className="px-4 py-4 text-right font-medium text-slate-900">
              {formatKrw(item.requestedAmount)}
            </td>
            <td className="px-4 py-4 text-center">
              <span
                className={[
                  "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold",
                  item.urgency === "긴급"
                    ? "border-rose-200 bg-rose-50 text-rose-700"
                    : "border-slate-200 bg-slate-100 text-slate-600",
                ].join(" ")}
              >
                {item.urgency}
              </span>
            </td>
          </tr>
        ))}
      </DashboardTable>

      {isLoading ? (
        <EmptyState
          title="승인 대기 목록을 불러오는 중입니다."
          description="관리자 검토가 필요한 submitted 요청을 조회하고 있습니다."
        />
      ) : null}

      {!isLoading && items.length === 0 ? (
        <EmptyState
          title="현재 승인 대기 요청이 없습니다."
          description="submitted 상태의 요청이 생기면 이 영역에 자동으로 표시됩니다."
        />
      ) : null}
    </section>
  );
}
