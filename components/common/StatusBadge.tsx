import type {
  AccountingProcessingStatus,
  AttachmentStatus,
  ExpenseStatus,
  MonthlySettlementStatus,
  ProjectManagementStatus,
  UserManagementStatus,
} from "@/types";

export type StatusBadgeValue =
  | ExpenseStatus
  | AttachmentStatus
  | MonthlySettlementStatus
  | AccountingProcessingStatus
  | UserManagementStatus
  | ProjectManagementStatus
  | "증빙미첨부";

type StatusBadgeProps = {
  status: StatusBadgeValue;
  className?: string;
};

const statusClassMap: Record<StatusBadgeValue, string> = {
  승인대기: "border-amber-200 bg-amber-50 text-amber-700",
  승인완료: "border-emerald-200 bg-emerald-50 text-emerald-700",
  수정요청: "border-orange-200 bg-orange-50 text-orange-700",
  반려: "border-rose-200 bg-rose-50 text-rose-700",
  보류: "border-slate-300 bg-slate-100 text-slate-600",
  정산대기: "border-sky-200 bg-sky-50 text-sky-700",
  지급대기: "border-[color:rgba(22,59,111,0.14)] bg-[var(--primary-soft)] text-[var(--primary)]",
  정산완료: "border-emerald-200 bg-emerald-50 text-emerald-700",
  지급완료: "border-emerald-200 bg-emerald-50 text-emerald-700",
  첨부완료: "border-emerald-200 bg-emerald-50 text-emerald-700",
  확인완료: "border-sky-200 bg-sky-50 text-sky-700",
  미첨부: "border-rose-200 bg-rose-50 text-rose-700",
  증빙미첨부: "border-rose-200 bg-rose-50 text-rose-700",
  처리완료: "border-emerald-200 bg-emerald-50 text-emerald-700",
  처리대기: "border-sky-200 bg-sky-50 text-sky-700",
  활성: "border-emerald-200 bg-emerald-50 text-emerald-700",
  비활성: "border-slate-300 bg-slate-100 text-slate-600",
  진행중: "border-emerald-200 bg-emerald-50 text-emerald-700",
  준비중: "border-amber-200 bg-amber-50 text-amber-700",
  종료: "border-slate-300 bg-slate-100 text-slate-600",
};

export function StatusBadge({ status, className = "" }: StatusBadgeProps) {
  return (
    <span
      className={[
        "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold",
        statusClassMap[status],
        className,
      ].join(" ")}
    >
      {status}
    </span>
  );
}
