import { FileCheck2, NotebookTabs, ShieldAlert } from "lucide-react";

import { RequestSummaryCard } from "@/components/expenses/RequestSummaryCard";
import type { ExpenseRequestFormData } from "@/types";

type ExpenseGuidePanelProps = {
  formData: ExpenseRequestFormData;
};

const guideCards = [
  {
    title: "경비 등록 가이드",
    icon: NotebookTabs,
    accentClassName: "bg-slate-50 text-slate-700",
    items: [
      "사용일과 사용처를 정확히 입력해주세요.",
      "사용 목적은 업무 관련성이 드러나게 작성해주세요.",
      "식대/회의비는 참석자를 함께 입력해주세요.",
      "개인카드/현금 사용 건은 정산 요청 여부를 확인해주세요.",
    ],
  },
  {
    title: "승인 기준",
    icon: ShieldAlert,
    accentClassName: "bg-amber-50 text-amber-700",
    items: [
      "업무 관련성이 명확해야 승인됩니다.",
      "사용 금액이 과도하거나 목적이 불분명하면 반려될 수 있습니다.",
      "식대/회의비는 참석자와 미팅 목적이 필요합니다.",
      "증빙이 부족하면 정산이 보류될 수 있습니다.",
    ],
  },
  {
    title: "증빙 기준",
    icon: FileCheck2,
    accentClassName: "bg-sky-50 text-sky-700",
    items: [
      "영수증 또는 카드전표 첨부를 권장합니다.",
      "현금 사용은 현금영수증 또는 간이영수증을 첨부해주세요.",
      "교통비는 택시 영수증, KTX 영수증 등 증빙을 첨부해주세요.",
      "증빙이 없는 지출은 승인 후에도 지급이 보류될 수 있습니다.",
    ],
  },
];

export function ExpenseGuidePanel({ formData }: ExpenseGuidePanelProps) {
  return (
    <aside className="space-y-5 xl:sticky xl:top-6 xl:self-start">
      {guideCards.map((card) => {
        const Icon = card.icon;

        return (
          <section
            key={card.title}
            className="rounded-[1.75rem] border border-slate-200/90 bg-white p-5 shadow-sm"
          >
            <div className="flex items-center gap-3">
              <div
                className={[
                  "flex h-11 w-11 items-center justify-center rounded-2xl",
                  card.accentClassName,
                ].join(" ")}
              >
                <Icon className="h-5 w-5" strokeWidth={1.9} />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-950">{card.title}</h3>
                <p className="mt-1 text-sm text-slate-500">실무 기준으로 빠르게 확인해주세요.</p>
              </div>
            </div>

            <ul className="mt-4 space-y-3">
              {card.items.map((item) => (
                <li key={item} className="flex gap-3 text-sm leading-6 text-slate-600">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-300" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </section>
        );
      })}

      <RequestSummaryCard formData={formData} />
    </aside>
  );
}
