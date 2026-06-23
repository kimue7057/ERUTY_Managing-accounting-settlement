import type {
  AttachmentStatus,
  ExpenseStatus,
  PaymentMethod,
  SettlementRequestOption,
  UrgencyLevel,
} from "@/types";

export type DbPaymentMethod =
  | "personal_card"
  | "corporate_card"
  | "cash"
  | "bank_transfer";

export type DbExpenseStatus =
  | "draft"
  | "submitted"
  | "approved"
  | "rejected"
  | "revision_requested"
  | "settlement_pending"
  | "settled"
  | "on_hold";

export type DbEvidenceStatus = "none" | "attached";

export type DbAttachmentFileType =
  | "receipt"
  | "card_slip"
  | "cash_receipt"
  | "simple_receipt"
  | "transport_receipt"
  | "other";

export type ApprovalDisplayStatus =
  | "승인대기"
  | "승인완료"
  | "수정요청"
  | "반려";

export function getSingleRelation<T>(value: T | T[] | null | undefined): T | null {
  if (!value) {
    return null;
  }

  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value;
}

export function formatSupabaseDate(value: string | null | undefined) {
  if (!value) {
    return "-";
  }

  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return value.slice(0, 10);
  }

  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(parsedDate);
}

export function getRequestSortValue(row: {
  requested_at: string | null | undefined;
  created_at: string | null | undefined;
}) {
  return row.requested_at ?? row.created_at ?? "";
}

export function mapDbPaymentMethod(value: DbPaymentMethod | null | undefined): PaymentMethod {
  switch (value) {
    case "corporate_card":
      return "법인카드";
    case "cash":
      return "현금";
    case "bank_transfer":
      return "계좌이체";
    case "personal_card":
    default:
      return "개인카드";
  }
}

export function mapDbExpenseStatus(value: DbExpenseStatus | null | undefined): ExpenseStatus {
  switch (value) {
    case "approved":
      return "승인완료";
    case "rejected":
      return "반려";
    case "revision_requested":
      return "수정요청";
    case "settlement_pending":
      return "정산대기";
    case "settled":
      return "정산완료";
    case "on_hold":
      return "보류";
    case "draft":
    case "submitted":
    default:
      return "승인대기";
  }
}

export function mapDbExpenseStatusToApproval(
  value: DbExpenseStatus | null | undefined,
): ApprovalDisplayStatus {
  switch (value) {
    case "approved":
      return "승인완료";
    case "rejected":
      return "반려";
    case "revision_requested":
      return "수정요청";
    case "draft":
    case "submitted":
    default:
      return "승인대기";
  }
}

export function mapDbEvidenceStatus(
  value: DbEvidenceStatus | null | undefined,
): AttachmentStatus {
  return value === "attached" ? "첨부완료" : "미첨부";
}

export function mapSettlementRequested(
  value: boolean | null | undefined,
): SettlementRequestOption {
  return value ? "정산 요청" : "정산 요청 안 함";
}

export function inferUrgencyLevel(
  title: string | null | undefined,
  purpose: string | null | undefined,
): UrgencyLevel {
  const combinedText = `${title ?? ""} ${purpose ?? ""}`;
  return /긴급/i.test(combinedText) ? "긴급" : "일반";
}

export function mapAttachmentFileType(value: DbAttachmentFileType): string {
  switch (value) {
    case "receipt":
      return "영수증";
    case "card_slip":
      return "카드전표";
    case "cash_receipt":
      return "현금영수증";
    case "simple_receipt":
      return "간이영수증";
    case "transport_receipt":
      return "교통비 증빙";
    case "other":
    default:
      return "기타";
  }
}

export function normalizeText(value: string | null | undefined, fallback = "-") {
  const trimmedValue = value?.trim();
  return trimmedValue ? trimmedValue : fallback;
}

export function getMonthRange(dateValue: string) {
  const sourceDate = new Date(dateValue);

  if (Number.isNaN(sourceDate.getTime())) {
    const monthKey = dateValue.slice(0, 7);
    return {
      start: `${monthKey}-01`,
      end: `${monthKey}-31`,
    };
  }

  const year = sourceDate.getUTCFullYear();
  const month = sourceDate.getUTCMonth();
  const monthStart = new Date(Date.UTC(year, month, 1));
  const monthEnd = new Date(Date.UTC(year, month + 1, 0));

  return {
    start: monthStart.toISOString().slice(0, 10),
    end: monthEnd.toISOString().slice(0, 10),
  };
}

export function isSettlementTargetPaymentMethod(paymentMethod: PaymentMethod) {
  return paymentMethod === "개인카드" || paymentMethod === "현금";
}
