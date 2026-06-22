import type { LucideIcon } from "lucide-react";
import { CreditCard, Landmark, Receipt, Wallet } from "lucide-react";

import type { PaymentMethod } from "@/types";

type PaymentMethodNoticeProps = {
  paymentMethod: PaymentMethod | "";
};

const noticeMap: Record<
  PaymentMethod,
  {
    title: string;
    description: string;
    icon: LucideIcon;
    classes: string;
  }
> = {
  개인카드: {
    title: "개인카드 정산 안내",
    description: "개인카드 또는 현금으로 사용한 경비는 승인 후 월말 정산 대상에 포함됩니다.",
    icon: CreditCard,
    classes: "border-sky-200 bg-sky-50 text-sky-700",
  },
  법인카드: {
    title: "법인카드 처리 안내",
    description:
      "법인카드 사용 건은 직원에게 별도 지급되지 않으며, 회사 회계 지출 자료에만 반영됩니다.",
    icon: Wallet,
    classes: "border-emerald-200 bg-emerald-50 text-emerald-700",
  },
  계좌이체: {
    title: "계좌이체 검토 안내",
    description: "계좌이체 사용 건은 회계 담당자 검토 후 지급 여부가 결정됩니다.",
    icon: Landmark,
    classes: "border-indigo-200 bg-indigo-50 text-indigo-700",
  },
  현금: {
    title: "현금 사용 정산 안내",
    description: "개인카드 또는 현금으로 사용한 경비는 승인 후 월말 정산 대상에 포함됩니다.",
    icon: Receipt,
    classes: "border-amber-200 bg-amber-50 text-amber-700",
  },
};

export function PaymentMethodNotice({ paymentMethod }: PaymentMethodNoticeProps) {
  if (!paymentMethod) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
        결제 수단을 선택하면 월말 정산 또는 회계 처리 기준을 안내합니다.
      </div>
    );
  }

  const notice = noticeMap[paymentMethod];
  const Icon = notice.icon;

  return (
    <div className={["rounded-2xl border px-4 py-3", notice.classes].join(" ")}>
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-white/70">
          <Icon className="h-4.5 w-4.5" strokeWidth={1.9} />
        </div>
        <div>
          <p className="text-sm font-semibold">{notice.title}</p>
          <p className="mt-1 text-sm leading-6">{notice.description}</p>
        </div>
      </div>
    </div>
  );
}
