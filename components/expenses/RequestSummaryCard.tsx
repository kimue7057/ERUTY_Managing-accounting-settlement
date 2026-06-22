import { AmountText } from "@/components/common/AmountText";
import type { ExpenseRequestFormData } from "@/types";

type RequestSummaryCardProps = {
  formData: ExpenseRequestFormData;
};

function SummaryValue({ value }: { value: string }) {
  return <span className={value === "미입력" ? "text-slate-400" : "text-slate-900"}>{value}</span>;
}

export function RequestSummaryCard({ formData }: RequestSummaryCardProps) {
  const amountNumber = Number(formData.amount);
  const attachmentCount = Object.values(formData.attachments).reduce(
    (count, files) => count + files.length,
    0,
  );

  return (
    <section className="rounded-[1.75rem] border border-slate-200/90 bg-white p-5 shadow-sm">
      <div>
        <h3 className="text-lg font-semibold text-slate-950">제출 전 요약</h3>
        <p className="mt-1 text-sm text-slate-500">경비 등록 핵심 항목을 다시 한 번 확인해주세요.</p>
      </div>

      <dl className="mt-5 space-y-3">
        <div className="flex items-center justify-between gap-4 rounded-2xl bg-slate-50 px-4 py-3">
          <dt className="text-sm font-medium text-slate-500">경비 유형</dt>
          <dd className="text-sm font-semibold">
            <SummaryValue value={formData.expenseType || "미입력"} />
          </dd>
        </div>
        <div className="flex items-center justify-between gap-4 rounded-2xl bg-slate-50 px-4 py-3">
          <dt className="text-sm font-medium text-slate-500">사용일</dt>
          <dd className="text-sm font-semibold">
            <SummaryValue value={formData.usedDate || "미입력"} />
          </dd>
        </div>
        <div className="flex items-center justify-between gap-4 rounded-2xl bg-slate-50 px-4 py-3">
          <dt className="text-sm font-medium text-slate-500">관련 업무/프로젝트</dt>
          <dd className="text-sm font-semibold">
            <SummaryValue value={formData.relatedProject || "미입력"} />
          </dd>
        </div>
        <div className="flex items-center justify-between gap-4 rounded-2xl bg-slate-50 px-4 py-3">
          <dt className="text-sm font-medium text-slate-500">사용 금액</dt>
          <dd className="text-sm font-semibold text-slate-900">
            {formData.amount ? <AmountText value={amountNumber} /> : <SummaryValue value="미입력" />}
          </dd>
        </div>
        <div className="flex items-center justify-between gap-4 rounded-2xl bg-slate-50 px-4 py-3">
          <dt className="text-sm font-medium text-slate-500">사용처</dt>
          <dd className="text-sm font-semibold">
            <SummaryValue value={formData.merchantName || "미입력"} />
          </dd>
        </div>
        <div className="flex items-center justify-between gap-4 rounded-2xl bg-slate-50 px-4 py-3">
          <dt className="text-sm font-medium text-slate-500">결제 수단</dt>
          <dd className="text-sm font-semibold">
            <SummaryValue value={formData.paymentMethod || "미입력"} />
          </dd>
        </div>
        <div className="flex items-center justify-between gap-4 rounded-2xl bg-slate-50 px-4 py-3">
          <dt className="text-sm font-medium text-slate-500">정산 요청 여부</dt>
          <dd className="text-sm font-semibold">
            <SummaryValue value={formData.settlementRequest || "미입력"} />
          </dd>
        </div>
        <div className="flex items-center justify-between gap-4 rounded-2xl bg-slate-50 px-4 py-3">
          <dt className="text-sm font-medium text-slate-500">증빙 첨부 여부</dt>
          <dd className="text-sm font-semibold text-slate-900">
            {attachmentCount > 0 ? `${attachmentCount}건 첨부` : "미첨부"}
          </dd>
        </div>
      </dl>
    </section>
  );
}
