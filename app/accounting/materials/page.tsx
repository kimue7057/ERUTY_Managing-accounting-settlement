"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import {
  BadgeCheck,
  Ban,
  FileWarning,
  Files,
  ReceiptText,
  WalletCards,
} from "lucide-react";

import { AmountText } from "@/components/common/AmountText";
import { DashboardTable } from "@/components/common/DashboardTable";
import { EmptyState } from "@/components/common/EmptyState";
import { PageHeader } from "@/components/common/PageHeader";
import { StatCard } from "@/components/common/StatCard";
import { StatusBadge } from "@/components/common/StatusBadge";
import {
  getSupabaseBrowserClient,
  isSupabaseConfigured,
} from "@/lib/supabase/client";
import type { AttachmentStatus, ExpenseStatus, RoleView } from "@/types";
import {
  formatSupabaseDate,
  getSingleRelation,
  mapDbEvidenceStatus,
  mapDbExpenseStatus,
  mapDbPaymentMethod,
  mapSettlementRequested,
  type DbEvidenceStatus,
  type DbExpenseStatus,
  type DbPaymentMethod,
} from "@/utils/expenseRequests";
import { createCsvContent, downloadCsvFile, type CsvColumn } from "@/utils/csv";
import { getUserFacingSupabaseMessage } from "@/utils/userFacingError";

type AccountingTabKey =
  | "all-expenses"
  | "employee-settlements"
  | "project-expenses"
  | "category-expenses"
  | "missing-proofs"
  | "rejected-revisions";

type RelationValue<T> = T | T[] | null;

type RequesterRelation = {
  id: string;
  name: string;
  department: string | null;
};

type ProjectRelation = {
  id: string;
  name: string;
};

type CategoryRelation = {
  id: string;
  name: string;
};

type ExpenseRequestRow = {
  id: string;
  request_no: string;
  title: string;
  purpose: string | null;
  memo: string | null;
  reject_reason: string | null;
  amount: number;
  expense_date: string;
  requested_at: string | null;
  approved_at: string | null;
  vendor: string;
  status: DbExpenseStatus;
  settlement_requested: boolean;
  payment_method: DbPaymentMethod;
  evidence_status: DbEvidenceStatus;
  requester: RelationValue<RequesterRelation>;
  project: RelationValue<ProjectRelation>;
  category: RelationValue<CategoryRelation>;
};

type ExpenseAttachmentRequestRow = {
  expense_request_id: string;
};

type SettlementRecordStatus = "confirmed" | "paid" | "on_hold";
type SettlementItemStatus = "confirmed" | "pending_evidence" | "rejected";
type SettlementStatusBadgeValue = "정산대기" | "정산확정" | "지급완료" | "보류";

type SettlementRecordEmployeeRelation = {
  id: string;
  name: string;
  department: string | null;
};

type MonthlySettlementRecordRow = {
  id: string;
  settlement_month: string;
  employee_id: string;
  approved_amount: number;
  rejected_amount: number;
  pending_evidence_amount: number;
  final_payment_amount: number;
  status: SettlementRecordStatus;
  confirmed_at: string | null;
  paid_at: string | null;
  employee: RelationValue<SettlementRecordEmployeeRelation>;
};

type SettlementRelation = {
  id: string;
  employee_id: string;
  status: SettlementRecordStatus;
};

type SettlementItemRow = {
  id: string;
  settlement_id: string;
  expense_request_id: string;
  amount: number;
  status: SettlementItemStatus;
  settlement: RelationValue<SettlementRelation>;
};

type SettlementLookup = {
  settlementId: string;
  employeeId: string | null;
  amount: number;
  itemStatus: SettlementItemStatus;
  settlementStatus: SettlementRecordStatus;
};

type AccountingExpenseRow = {
  id: string;
  requestNumber: string;
  title: string;
  employeeId: string;
  employeeName: string;
  department: string;
  projectId: string | null;
  projectName: string;
  categoryName: string;
  usedDate: string;
  requestedDate: string;
  approvedDate: string;
  vendor: string;
  purpose: string;
  memo: string;
  amount: number;
  approvedAmount: number;
  paymentMethod: string;
  settlementRequestedLabel: string;
  attachmentStatus: AttachmentStatus;
  approvalStatus: ExpenseStatus;
  settlementEligible: boolean;
  settlementStatus: SettlementStatusBadgeValue | null;
  settlementStatusLabel: string;
  settlementConfirmedAmount: number;
  settlementPaidAmount: number;
  rawStatus: DbExpenseStatus;
};

type SummaryCards = {
  totalExpenseCount: number;
  totalExpenseAmount: number;
  approvedAmount: number;
  confirmedSettlementAmount: number;
  paidSettlementAmount: number;
  missingProofCount: number;
  rejectedRevisionCount: number;
};

type EmployeeSettlementRow = {
  employeeId: string;
  employeeName: string;
  department: string;
  approvedAmount: number;
  pendingEvidenceAmount: number;
  confirmedAmount: number;
  paidAmount: number;
  payoutStatus: SettlementStatusBadgeValue;
};

type ProjectSummaryRow = {
  key: string;
  name: string;
  count: number;
  amount: number;
  approvedAmount: number;
  confirmedAmount: number;
  paidAmount: number;
  missingProofCount: number;
};

type CategorySummaryRow = {
  key: string;
  name: string;
  count: number;
  amount: number;
  approvedAmount: number;
  confirmedAmount: number;
  paidAmount: number;
  missingProofCount: number;
};

type ExportFeedbackState = {
  type: "success" | "error" | "info";
  message: string;
};

const roleViews: RoleView[] = ["직원 보기", "관리자 보기", "대표 보기"];

const tabs: Array<{ key: AccountingTabKey; label: string }> = [
  { key: "all-expenses", label: "전체 지출 내역" },
  { key: "employee-settlements", label: "직원별 정산 내역" },
  { key: "project-expenses", label: "프로젝트별 지출" },
  { key: "category-expenses", label: "경비 유형별 지출" },
  { key: "missing-proofs", label: "증빙 누락 목록" },
  { key: "rejected-revisions", label: "반려/수정요청 목록" },
];

const allExpenseColumns = [
  { key: "usedDate", label: "사용일" },
  { key: "requestedDate", label: "요청일" },
  { key: "employeeName", label: "직원명" },
  { key: "projectName", label: "프로젝트" },
  { key: "categoryName", label: "경비 유형" },
  { key: "vendor", label: "사용처" },
  { key: "amount", label: "사용 금액", align: "right" as const },
  { key: "approvedAmount", label: "승인 금액", align: "right" as const },
  { key: "attachmentStatus", label: "증빙 상태", align: "center" as const },
  { key: "approvalStatus", label: "승인 상태", align: "center" as const },
  { key: "settlementStatus", label: "정산 상태", align: "center" as const },
];

const employeeSettlementColumns = [
  { key: "employeeName", label: "직원명" },
  { key: "department", label: "부서" },
  { key: "approvedAmount", label: "승인 금액", align: "right" as const },
  { key: "pendingEvidenceAmount", label: "증빙 보류 금액", align: "right" as const },
  { key: "confirmedAmount", label: "정산 확정 금액", align: "right" as const },
  { key: "paidAmount", label: "지급 완료 금액", align: "right" as const },
  { key: "payoutStatus", label: "지급 상태", align: "center" as const },
];

const projectColumns = [
  { key: "name", label: "프로젝트" },
  { key: "count", label: "건수", align: "right" as const },
  { key: "amount", label: "총 지출 금액", align: "right" as const },
  { key: "approvedAmount", label: "승인 완료 금액", align: "right" as const },
  { key: "confirmedAmount", label: "정산 확정 금액", align: "right" as const },
  { key: "paidAmount", label: "지급 완료 금액", align: "right" as const },
  { key: "missingProofCount", label: "증빙 누락 건수", align: "right" as const },
];

const categoryColumns = [
  { key: "name", label: "경비 유형" },
  { key: "count", label: "건수", align: "right" as const },
  { key: "amount", label: "총 지출 금액", align: "right" as const },
  { key: "approvedAmount", label: "승인 완료 금액", align: "right" as const },
  { key: "confirmedAmount", label: "정산 확정 금액", align: "right" as const },
  { key: "paidAmount", label: "지급 완료 금액", align: "right" as const },
  { key: "missingProofCount", label: "증빙 누락 건수", align: "right" as const },
];

const allExpenseCsvColumns: CsvColumn<AccountingExpenseRow>[] = [
  { key: "requestNumber", header: "요청번호" },
  { key: "usedDate", header: "사용일" },
  { key: "requestedDate", header: "요청일" },
  { key: "approvedDate", header: "승인일" },
  { key: "employeeName", header: "직원명" },
  { key: "department", header: "부서" },
  { key: "projectName", header: "프로젝트명" },
  { key: "categoryName", header: "경비유형" },
  { key: "vendor", header: "사용처" },
  { key: "purpose", header: "사용목적" },
  { key: "paymentMethod", header: "결제수단" },
  { key: "settlementRequestedLabel", header: "정산요청여부" },
  { key: "amount", header: "금액" },
  { key: "approvalStatus", header: "상태" },
  { key: "attachmentStatus", header: "증빙상태" },
  { key: "settlementStatusLabel", header: "정산상태" },
  { key: "memo", header: "메모" },
];

const employeeSettlementCsvColumns: CsvColumn<EmployeeSettlementRow>[] = [
  { key: "employeeName", header: "직원명" },
  { key: "department", header: "부서" },
  { key: "approvedAmount", header: "승인금액" },
  { key: "pendingEvidenceAmount", header: "증빙보류금액" },
  { key: "confirmedAmount", header: "정산확정금액" },
  { key: "paidAmount", header: "지급완료금액" },
  { key: "payoutStatus", header: "지급상태" },
];

const projectCsvColumns: CsvColumn<ProjectSummaryRow>[] = [
  { key: "name", header: "프로젝트명" },
  { key: "count", header: "지출건수" },
  { key: "amount", header: "총지출금액" },
  { key: "approvedAmount", header: "승인완료금액" },
  { key: "confirmedAmount", header: "정산확정금액" },
  { key: "paidAmount", header: "지급완료금액" },
  { key: "missingProofCount", header: "증빙누락건수" },
];

const categoryCsvColumns: CsvColumn<CategorySummaryRow>[] = [
  { key: "name", header: "경비유형" },
  { key: "count", header: "지출건수" },
  { key: "amount", header: "총지출금액" },
  { key: "approvedAmount", header: "승인완료금액" },
  { key: "confirmedAmount", header: "정산확정금액" },
  { key: "paidAmount", header: "지급완료금액" },
  { key: "missingProofCount", header: "증빙누락건수" },
];

const issueCsvColumns: CsvColumn<AccountingExpenseRow>[] = [
  { key: "requestNumber", header: "요청번호" },
  { key: "usedDate", header: "사용일" },
  { key: "requestedDate", header: "요청일" },
  { key: "employeeName", header: "직원명" },
  { key: "projectName", header: "프로젝트명" },
  { key: "categoryName", header: "경비유형" },
  { key: "vendor", header: "사용처" },
  { key: "amount", header: "금액" },
  { key: "approvalStatus", header: "승인상태" },
  { key: "attachmentStatus", header: "증빙상태" },
  { key: "settlementStatusLabel", header: "정산상태" },
  { key: "memo", header: "메모" },
];

function getAccountingCsvFileName(month: string, suffix: string) {
  return `eruty-accounting-${month}-${suffix}.csv`;
}

const issueColumns = [
  { key: "requestNumber", label: "요청번호" },
  { key: "usedDate", label: "사용일" },
  { key: "employeeName", label: "직원명" },
  { key: "projectName", label: "프로젝트" },
  { key: "categoryName", label: "경비 유형" },
  { key: "vendor", label: "사용처" },
  { key: "amount", label: "금액", align: "right" as const },
  { key: "attachmentStatus", label: "증빙 상태", align: "center" as const },
  { key: "approvalStatus", label: "승인 상태", align: "center" as const },
  { key: "settlementStatus", label: "정산 상태", align: "center" as const },
];

type MonthOption = {
  value: string;
  label: string;
};

function createRecentMonthOptions(count = 12): MonthOption[] {
  const now = new Date();

  return Array.from({ length: count }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - index, 1);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");

    return {
      value: `${year}-${month}`,
      label: `${year}년 ${date.getMonth() + 1}월`,
    };
  });
}

function getMonthRange(monthValue: string) {
  const [yearText, monthText] = monthValue.split("-");
  const year = Number(yearText);
  const monthIndex = Number(monthText) - 1;
  const monthStart = new Date(Date.UTC(year, monthIndex, 1));
  const monthEnd = new Date(Date.UTC(year, monthIndex + 1, 0));

  return {
    start: monthStart.toISOString().slice(0, 10),
    end: monthEnd.toISOString().slice(0, 10),
  };
}

function isSettlementSchemaMissing(error: unknown) {
  if (!(typeof error === "object" && error !== null && "message" in error)) {
    return false;
  }

  const message =
    typeof error.message === "string" ? error.message.toLowerCase().trim() : "";

  return (
    /(monthly_settlements|settlement_items)/i.test(message) &&
    /(does not exist|schema cache|could not find)/i.test(message)
  );
}

function isSettlementEligible(row: ExpenseRequestRow) {
  return (
    row.settlement_requested &&
    (row.payment_method === "personal_card" || row.payment_method === "cash")
  );
}

function getAttachmentStatus(
  evidenceStatus: DbEvidenceStatus,
  attachmentCount: number,
): AttachmentStatus {
  const mappedStatus = mapDbEvidenceStatus(evidenceStatus);

  if (attachmentCount > 0 && mappedStatus === "미첨부") {
    return "첨부완료";
  }

  return mappedStatus;
}

function getSettlementLookupMap(rows: SettlementItemRow[]) {
  return rows.reduce<Record<string, SettlementLookup>>((result, row) => {
    const settlement = getSingleRelation(row.settlement);

    if (!settlement) {
      return result;
    }

    result[row.expense_request_id] = {
      settlementId: row.settlement_id,
      employeeId: settlement.employee_id,
      amount: row.amount,
      itemStatus: row.status,
      settlementStatus: settlement.status,
    };

    return result;
  }, {});
}

function resolveSettlementStatus(
  row: ExpenseRequestRow,
  attachmentStatus: AttachmentStatus,
  settlementLookup: SettlementLookup | undefined,
): {
  badgeStatus: SettlementStatusBadgeValue | null;
  label: string;
  confirmedAmount: number;
  paidAmount: number;
} {
  const settlementEligible = isSettlementEligible(row);

  if (!settlementEligible) {
    return {
      badgeStatus: null,
      label: "정산 대상 아님",
      confirmedAmount: 0,
      paidAmount: 0,
    };
  }

  if (settlementLookup) {
    if (settlementLookup.itemStatus === "confirmed" && settlementLookup.settlementStatus === "paid") {
      return {
        badgeStatus: "지급완료",
        label: "지급완료",
        confirmedAmount: 0,
        paidAmount: settlementLookup.amount,
      };
    }

    if (
      settlementLookup.itemStatus === "confirmed" &&
      settlementLookup.settlementStatus === "confirmed"
    ) {
      return {
        badgeStatus: "정산확정",
        label: "정산확정",
        confirmedAmount: settlementLookup.amount,
        paidAmount: 0,
      };
    }

    return {
      badgeStatus: "보류",
      label: "보류",
      confirmedAmount: 0,
      paidAmount: 0,
    };
  }

  if (row.status === "rejected" || row.status === "revision_requested") {
    return {
      badgeStatus: "보류",
      label: "보류",
      confirmedAmount: 0,
      paidAmount: 0,
    };
  }

  if (row.status !== "approved") {
    return {
      badgeStatus: null,
      label: "승인 대기",
      confirmedAmount: 0,
      paidAmount: 0,
    };
  }

  if (attachmentStatus === "미첨부") {
    return {
      badgeStatus: "보류",
      label: "보류",
      confirmedAmount: 0,
      paidAmount: 0,
    };
  }

  return {
    badgeStatus: "정산대기",
    label: "정산대기",
    confirmedAmount: 0,
    paidAmount: 0,
  };
}

function mapExpenseRow(
  row: ExpenseRequestRow,
  attachmentCount: number,
  settlementLookup: SettlementLookup | undefined,
): AccountingExpenseRow {
  const requester = getSingleRelation(row.requester);
  const project = getSingleRelation(row.project);
  const category = getSingleRelation(row.category);
  const attachmentStatus = getAttachmentStatus(row.evidence_status, attachmentCount);
  const settlementInfo = resolveSettlementStatus(row, attachmentStatus, settlementLookup);

  return {
    id: row.id,
    requestNumber: row.request_no,
    title: row.title,
    employeeId: requester?.id ?? `unknown-${row.id}`,
    employeeName: requester?.name ?? "미확인 직원",
    department: requester?.department ?? "-",
    projectId: project?.id ?? null,
    projectName: project?.name ?? "미지정 프로젝트",
    categoryName: category?.name ?? "기타",
    usedDate: formatSupabaseDate(row.expense_date),
    requestedDate: formatSupabaseDate(row.requested_at),
    approvedDate: formatSupabaseDate(row.approved_at),
    vendor: row.vendor,
    purpose: row.purpose?.trim() ? row.purpose : "-",
    memo: [row.memo?.trim() ?? "", row.reject_reason?.trim() ?? ""]
      .filter((value) => value.length > 0)
      .join(" / "),
    amount: row.amount,
    approvedAmount: row.status === "approved" ? row.amount : 0,
    paymentMethod: mapDbPaymentMethod(row.payment_method),
    settlementRequestedLabel: mapSettlementRequested(row.settlement_requested),
    attachmentStatus,
    approvalStatus: mapDbExpenseStatus(row.status),
    settlementEligible: isSettlementEligible(row),
    settlementStatus: settlementInfo.badgeStatus,
    settlementStatusLabel: settlementInfo.label,
    settlementConfirmedAmount: settlementInfo.confirmedAmount,
    settlementPaidAmount: settlementInfo.paidAmount,
    rawStatus: row.status,
  };
}

function getPayoutStatus(row: EmployeeSettlementRow): SettlementStatusBadgeValue {
  if (row.paidAmount > 0) {
    return "지급완료";
  }

  if (row.confirmedAmount > 0) {
    return "정산확정";
  }

  if (row.pendingEvidenceAmount > 0) {
    return "보류";
  }

  if (row.approvedAmount > 0) {
    return "정산대기";
  }

  return "보류";
}

function SettlementStatusCell({
  status,
  label,
}: {
  status: SettlementStatusBadgeValue | null;
  label: string;
}) {
  if (!status) {
    return <span className="text-sm text-slate-500">{label}</span>;
  }

  return <StatusBadge status={status} />;
}

function TabSection({
  title,
  description,
  columns,
  hasRows,
  emptyMessage,
  isLoading,
  loadingMessage,
  children,
}: {
  title: string;
  description: string;
  columns: Array<{ key: string; label: string; align?: "left" | "center" | "right" }>;
  hasRows: boolean;
  emptyMessage: string;
  isLoading: boolean;
  loadingMessage: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-[1.75rem] border border-slate-200/90 bg-white p-5 shadow-sm">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-slate-950">{title}</h3>
        <p className="mt-1 text-sm text-slate-500">{description}</p>
      </div>

      <DashboardTable columns={columns}>{children}</DashboardTable>

      {isLoading ? (
        <EmptyState
          title={loadingMessage}
          description="Supabase에서 선택한 월의 회계 자료를 집계하고 있습니다."
        />
      ) : null}

      {!isLoading && !hasRows ? (
        <EmptyState
          title={emptyMessage}
          description="선택한 월에 해당하는 실제 데이터가 없으면 빈 상태로 표시합니다."
        />
      ) : null}
    </section>
  );
}

export default function AccountingMaterialsPage() {
  const monthOptions = useMemo(() => createRecentMonthOptions(), []);
  const [selectedMonth, setSelectedMonth] = useState(monthOptions[0]?.value ?? "");
  const [activeTab, setActiveTab] = useState<AccountingTabKey>("all-expenses");
  const [rawExpenseRows, setRawExpenseRows] = useState<ExpenseRequestRow[]>([]);
  const [attachmentCountByRequestId, setAttachmentCountByRequestId] = useState<
    Record<string, number>
  >({});
  const [settlementRecords, setSettlementRecords] = useState<MonthlySettlementRecordRow[]>([]);
  const [settlementItems, setSettlementItems] = useState<SettlementItemRow[]>([]);
  const [schemaNotice, setSchemaNotice] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [exportFeedback, setExportFeedback] = useState<ExportFeedbackState | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadAccountingRows() {
      setIsLoading(true);
      setLoadError(null);
      setSchemaNotice(null);
      setExportFeedback(null);

      if (!isSupabaseConfigured) {
        if (!isMounted) {
          return;
        }

        setLoadError(
          "Supabase 환경변수가 설정되지 않았습니다. NEXT_PUBLIC_SUPABASE_URL과 NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY를 확인해주세요.",
        );
        setRawExpenseRows([]);
        setAttachmentCountByRequestId({});
        setSettlementRecords([]);
        setSettlementItems([]);
        setIsLoading(false);
        return;
      }

      try {
        const supabase = getSupabaseBrowserClient();
        const monthRange = getMonthRange(selectedMonth);

        const { data, error } = await supabase
          .from("expense_requests")
          .select(
            `
              id,
              request_no,
              title,
              purpose,
              memo,
              reject_reason,
              amount,
              expense_date,
              requested_at,
              approved_at,
              vendor,
              status,
              settlement_requested,
              payment_method,
              evidence_status,
              requester:profiles!expense_requests_user_id_fkey (
                id,
                name,
                department
              ),
              project:projects!expense_requests_project_id_fkey (
                id,
                name
              ),
              category:expense_categories!expense_requests_category_id_fkey (
                id,
                name
              )
            `,
          )
          .gte("expense_date", monthRange.start)
          .lte("expense_date", monthRange.end)
          .neq("status", "draft")
          .order("expense_date", { ascending: false })
          .order("requested_at", { ascending: false });

        if (error) {
          throw error;
        }

        if (!isMounted) {
          return;
        }

        const expenseRows = (data ?? []) as ExpenseRequestRow[];
        const requestIds = expenseRows.map((row) => row.id);
        let nextAttachmentCountByRequestId: Record<string, number> = {};

        if (requestIds.length > 0) {
          const { data: attachmentRows, error: attachmentError } = await supabase
            .from("expense_attachments")
            .select("expense_request_id")
            .in("expense_request_id", requestIds);

          if (attachmentError) {
            throw attachmentError;
          }

          nextAttachmentCountByRequestId = (
            (attachmentRows ?? []) as ExpenseAttachmentRequestRow[]
          ).reduce<Record<string, number>>((result, attachment) => {
            result[attachment.expense_request_id] =
              (result[attachment.expense_request_id] ?? 0) + 1;
            return result;
          }, {});
        }

        let nextSettlementRecords: MonthlySettlementRecordRow[] = [];
        let nextSettlementItems: SettlementItemRow[] = [];

        const { data: settlementData, error: settlementError } = await supabase
          .from("monthly_settlements")
          .select(
            `
              id,
              settlement_month,
              employee_id,
              approved_amount,
              rejected_amount,
              pending_evidence_amount,
              final_payment_amount,
              status,
              confirmed_at,
              paid_at,
              employee:profiles!monthly_settlements_employee_id_fkey (
                id,
                name,
                department
              )
            `,
          )
          .eq("settlement_month", selectedMonth);

        if (settlementError) {
          if (isSettlementSchemaMissing(settlementError)) {
            setSchemaNotice(
              "정산 확정 테이블이 아직 준비되지 않아 정산 확정/지급 완료 집계는 0으로 표시됩니다.",
            );
          } else {
            throw settlementError;
          }
        } else {
          nextSettlementRecords = (settlementData ?? []) as MonthlySettlementRecordRow[];

          if (nextSettlementRecords.length > 0) {
            const settlementIds = nextSettlementRecords.map((row) => row.id);
            const { data: settlementItemData, error: settlementItemError } = await supabase
              .from("settlement_items")
              .select(
                `
                  id,
                  settlement_id,
                  expense_request_id,
                  amount,
                  status,
                  settlement:monthly_settlements!settlement_items_settlement_id_fkey (
                    id,
                    employee_id,
                    status
                  )
                `,
              )
              .in("settlement_id", settlementIds);

            if (settlementItemError) {
              if (isSettlementSchemaMissing(settlementItemError)) {
                setSchemaNotice(
                  "정산 상세 항목 테이블이 아직 준비되지 않아 정산 항목별 연결 정보는 표시되지 않습니다.",
                );
              } else {
                throw settlementItemError;
              }
            } else {
              nextSettlementItems = (settlementItemData ?? []) as SettlementItemRow[];
            }
          }
        }

        setRawExpenseRows(expenseRows);
        setAttachmentCountByRequestId(nextAttachmentCountByRequestId);
        setSettlementRecords(nextSettlementRecords);
        setSettlementItems(nextSettlementItems);
      } catch (error) {
        const message = getUserFacingSupabaseMessage(
          error,
          "회계 자료를 불러오는 중 알 수 없는 오류가 발생했습니다.",
        );

        if (!isMounted) {
          return;
        }

        setLoadError(message);
        setRawExpenseRows([]);
        setAttachmentCountByRequestId({});
        setSettlementRecords([]);
        setSettlementItems([]);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadAccountingRows();

    return () => {
      isMounted = false;
    };
  }, [selectedMonth]);

  const settlementLookupByExpenseRequestId = useMemo(
    () => getSettlementLookupMap(settlementItems),
    [settlementItems],
  );

  const accountingRows = useMemo(
    () =>
      rawExpenseRows.map((row) =>
        mapExpenseRow(
          row,
          attachmentCountByRequestId[row.id] ?? 0,
          settlementLookupByExpenseRequestId[row.id],
        ),
      ),
    [attachmentCountByRequestId, rawExpenseRows, settlementLookupByExpenseRequestId],
  );

  const summary = useMemo<SummaryCards>(
    () => ({
      totalExpenseCount: accountingRows.length,
      totalExpenseAmount: accountingRows.reduce((sum, row) => sum + row.amount, 0),
      approvedAmount: accountingRows.reduce((sum, row) => sum + row.approvedAmount, 0),
      confirmedSettlementAmount: settlementRecords
        .filter((row) => row.status === "confirmed")
        .reduce((sum, row) => sum + row.final_payment_amount, 0),
      paidSettlementAmount: settlementRecords
        .filter((row) => row.status === "paid")
        .reduce((sum, row) => sum + row.final_payment_amount, 0),
      missingProofCount: accountingRows.filter((row) => row.attachmentStatus === "미첨부").length,
      rejectedRevisionCount: accountingRows.filter((row) =>
        ["rejected", "revision_requested"].includes(row.rawStatus),
      ).length,
    }),
    [accountingRows, settlementRecords],
  );

  const employeeSettlementRows = useMemo<EmployeeSettlementRow[]>(() => {
    const grouped = new Map<string, EmployeeSettlementRow>();

    accountingRows
      .filter((row) => row.settlementEligible)
      .forEach((row) => {
        const current = grouped.get(row.employeeId) ?? {
          employeeId: row.employeeId,
          employeeName: row.employeeName,
          department: row.department,
          approvedAmount: 0,
          pendingEvidenceAmount: 0,
          confirmedAmount: 0,
          paidAmount: 0,
          payoutStatus: "보류" as SettlementStatusBadgeValue,
        };

        current.approvedAmount += row.approvedAmount;
        if (row.attachmentStatus === "미첨부") {
          current.pendingEvidenceAmount += row.approvedAmount;
        }
        current.confirmedAmount += row.settlementConfirmedAmount;
        current.paidAmount += row.settlementPaidAmount;

        grouped.set(row.employeeId, current);
      });

    settlementRecords.forEach((record) => {
      const employee = getSingleRelation(record.employee);
      const current = grouped.get(record.employee_id) ?? {
        employeeId: record.employee_id,
        employeeName: employee?.name ?? `직원 ${record.employee_id.slice(0, 8)}`,
        department: employee?.department ?? "-",
        approvedAmount: 0,
        pendingEvidenceAmount: 0,
        confirmedAmount: 0,
        paidAmount: 0,
        payoutStatus: "보류" as SettlementStatusBadgeValue,
      };

      current.approvedAmount = record.approved_amount;
      current.pendingEvidenceAmount = record.pending_evidence_amount;
      current.confirmedAmount = record.status === "confirmed" ? record.final_payment_amount : 0;
      current.paidAmount = record.status === "paid" ? record.final_payment_amount : 0;

      grouped.set(record.employee_id, current);
    });

    return Array.from(grouped.values())
      .map((row) => ({
        ...row,
        payoutStatus: getPayoutStatus(row),
      }))
      .filter(
        (row) =>
          row.approvedAmount > 0 ||
          row.pendingEvidenceAmount > 0 ||
          row.confirmedAmount > 0 ||
          row.paidAmount > 0,
      )
      .sort((left, right) => right.approvedAmount - left.approvedAmount);
  }, [accountingRows, settlementRecords]);

  const projectExpenseRows = useMemo<ProjectSummaryRow[]>(() => {
    const grouped = new Map<string, ProjectSummaryRow>();

    accountingRows.forEach((row) => {
      const current = grouped.get(row.projectName) ?? {
        key: row.projectName,
        name: row.projectName,
        count: 0,
        amount: 0,
        approvedAmount: 0,
        confirmedAmount: 0,
        paidAmount: 0,
        missingProofCount: 0,
      };

      current.count += 1;
      current.amount += row.amount;
      current.approvedAmount += row.approvedAmount;
      current.confirmedAmount += row.settlementConfirmedAmount;
      current.paidAmount += row.settlementPaidAmount;
      current.missingProofCount += row.attachmentStatus === "미첨부" ? 1 : 0;

      grouped.set(row.projectName, current);
    });

    return Array.from(grouped.values()).sort((left, right) => right.amount - left.amount);
  }, [accountingRows]);

  const categoryExpenseRows = useMemo<CategorySummaryRow[]>(() => {
    const grouped = new Map<string, CategorySummaryRow>();

    accountingRows.forEach((row) => {
      const current = grouped.get(row.categoryName) ?? {
        key: row.categoryName,
        name: row.categoryName,
        count: 0,
        amount: 0,
        approvedAmount: 0,
        confirmedAmount: 0,
        paidAmount: 0,
        missingProofCount: 0,
      };

      current.count += 1;
      current.amount += row.amount;
      current.approvedAmount += row.approvedAmount;
      current.confirmedAmount += row.settlementConfirmedAmount;
      current.paidAmount += row.settlementPaidAmount;
      current.missingProofCount += row.attachmentStatus === "미첨부" ? 1 : 0;

      grouped.set(row.categoryName, current);
    });

    return Array.from(grouped.values()).sort((left, right) => right.amount - left.amount);
  }, [accountingRows]);

  const missingProofRows = useMemo(
    () => accountingRows.filter((row) => row.attachmentStatus === "미첨부"),
    [accountingRows],
  );

  const rejectedRevisionRows = useMemo(
    () =>
      accountingRows.filter((row) =>
        ["rejected", "revision_requested"].includes(row.rawStatus),
      ),
    [accountingRows],
  );
  const summaryCards = [
    {
      id: "total-expense-count",
      title: "총 지출 건수",
      value: isLoading ? null : <span>{summary.totalExpenseCount}건</span>,
      description: "선택한 월의 expense_requests 전체 건수입니다.",
      icon: <ReceiptText className="h-5 w-5" strokeWidth={1.8} />,
    },
    {
      id: "total-expense-amount",
      title: "총 지출 금액",
      value: isLoading ? null : <AmountText value={summary.totalExpenseAmount} />,
      description: "선택한 월의 전체 지출 금액 합계입니다.",
      icon: <WalletCards className="h-5 w-5" strokeWidth={1.8} />,
    },
    {
      id: "approved-amount",
      title: "승인 완료 금액",
      value: isLoading ? null : <AmountText value={summary.approvedAmount} />,
      description: "승인 완료된 지출 요청 기준 금액 합계입니다.",
      icon: <BadgeCheck className="h-5 w-5" strokeWidth={1.8} />,
    },
    {
      id: "confirmed-settlement-amount",
      title: "정산 확정 금액",
      value: isLoading ? null : <AmountText value={summary.confirmedSettlementAmount} />,
      description: "monthly_settlements.status = confirmed 기준 정산 확정 금액입니다.",
      icon: <Files className="h-5 w-5" strokeWidth={1.8} />,
    },
    {
      id: "paid-settlement-amount",
      title: "지급 완료 금액",
      value: isLoading ? null : <AmountText value={summary.paidSettlementAmount} />,
      description: "monthly_settlements.status = paid 기준 지급 완료 금액입니다.",
      icon: <WalletCards className="h-5 w-5" strokeWidth={1.8} />,
    },
    {
      id: "missing-proof-count",
      title: "증빙 누락 건수",
      value: isLoading ? null : <span>{summary.missingProofCount}건</span>,
      description: "증빙 상태가 미첨부인 지출 요청 건수입니다.",
      icon: <FileWarning className="h-5 w-5" strokeWidth={1.8} />,
    },
    {
      id: "rejected-revision-count",
      title: "반려/수정요청 건수",
      value: isLoading ? null : <span>{summary.rejectedRevisionCount}건</span>,
      description: "반려 또는 수정요청 상태로 남아 있는 건수입니다.",
      icon: <Ban className="h-5 w-5" strokeWidth={1.8} />,
    },
  ];

  function exportCsvRows<T>(
    label: string,
    rows: T[],
    columns: CsvColumn<T>[],
    fileName: string,
  ) {
    if (rows.length === 0) {
      setExportFeedback({
        type: "info",
        message: "내보낼 데이터가 없습니다.",
      });
      return;
    }

    try {
      const content = createCsvContent(rows, columns);
      downloadCsvFile(fileName, content);
      setExportFeedback({
        type: "success",
        message: `${label} CSV를 다운로드했습니다.`,
      });
    } catch (error) {
      setExportFeedback({
        type: "error",
        message: getUserFacingSupabaseMessage(
          error,
          "CSV 파일을 생성하지 못했습니다. 잠시 후 다시 시도해주세요.",
        ),
      });
    }
  }

  const renderActiveTab = () => {
    if (activeTab === "all-expenses") {
      return (
        <TabSection
          title="전체 지출 내역"
          description="월별 지출 요청, 승인 상태, 정산 상태, 증빙 상태를 한 번에 확인합니다."
          columns={allExpenseColumns}
          hasRows={accountingRows.length > 0}
          emptyMessage="선택한 월의 전체 지출 내역이 없습니다."
          isLoading={isLoading}
          loadingMessage="전체 지출 내역을 불러오는 중입니다."
        >
          {accountingRows.map((row) => (
            <tr
              key={row.id}
              className={[
                "border-b border-slate-100 last:border-b-0",
                row.attachmentStatus === "미첨부" ? "bg-amber-50/35" : "",
              ].join(" ")}
            >
              <td className="px-4 py-4 text-slate-500">{row.usedDate}</td>
              <td className="px-4 py-4 text-slate-500">{row.requestedDate}</td>
              <td className="px-4 py-4 font-medium text-slate-900">{row.employeeName}</td>
              <td className="px-4 py-4 text-slate-700">{row.projectName}</td>
              <td className="px-4 py-4 text-slate-700">{row.categoryName}</td>
              <td className="px-4 py-4 text-slate-600">{row.vendor}</td>
              <td className="px-4 py-4 text-right text-slate-700">
                <AmountText value={row.amount} />
              </td>
              <td className="px-4 py-4 text-right font-medium text-slate-900">
                <AmountText value={row.approvedAmount} />
              </td>
              <td className="px-4 py-4 text-center">
                <StatusBadge status={row.attachmentStatus} />
              </td>
              <td className="px-4 py-4 text-center">
                <StatusBadge status={row.approvalStatus} />
              </td>
              <td className="px-4 py-4 text-center">
                <SettlementStatusCell
                  status={row.settlementStatus}
                  label={row.settlementStatusLabel}
                />
              </td>
            </tr>
          ))}
        </TabSection>
      );
    }

    if (activeTab === "employee-settlements") {
      return (
        <TabSection
          title="직원별 정산 내역"
          description="실제 지출 요청과 월말 정산 확정 데이터를 함께 기준으로 직원별 정산 흐름을 정리합니다."
          columns={employeeSettlementColumns}
          hasRows={employeeSettlementRows.length > 0}
          emptyMessage="선택한 월의 직원별 정산 내역이 없습니다."
          isLoading={isLoading}
          loadingMessage="직원별 정산 내역을 불러오는 중입니다."
        >
          {employeeSettlementRows.map((row) => (
            <tr key={row.employeeId} className="border-b border-slate-100 last:border-b-0">
              <td className="px-4 py-4 font-medium text-slate-900">{row.employeeName}</td>
              <td className="px-4 py-4 text-slate-600">{row.department}</td>
              <td className="px-4 py-4 text-right font-medium text-slate-900">
                <AmountText value={row.approvedAmount} />
              </td>
              <td
                className={[
                  "px-4 py-4 text-right font-medium",
                  row.pendingEvidenceAmount > 0 ? "text-amber-700" : "text-slate-500",
                ].join(" ")}
              >
                <AmountText value={row.pendingEvidenceAmount} />
              </td>
              <td className="px-4 py-4 text-right text-[var(--primary)]">
                <AmountText value={row.confirmedAmount} />
              </td>
              <td className="px-4 py-4 text-right text-emerald-700">
                <AmountText value={row.paidAmount} />
              </td>
              <td className="px-4 py-4 text-center">
                <StatusBadge status={row.payoutStatus} />
              </td>
            </tr>
          ))}
        </TabSection>
      );
    }

    if (activeTab === "project-expenses") {
      return (
        <TabSection
          title="프로젝트별 지출"
          description="프로젝트별로 총 지출, 승인 완료, 정산 확정, 지급 완료, 증빙 누락 현황을 집계합니다."
          columns={projectColumns}
          hasRows={projectExpenseRows.length > 0}
          emptyMessage="선택한 월의 프로젝트별 지출 내역이 없습니다."
          isLoading={isLoading}
          loadingMessage="프로젝트별 지출 내역을 불러오는 중입니다."
        >
          {projectExpenseRows.map((row) => (
            <tr key={row.key} className="border-b border-slate-100 last:border-b-0">
              <td className="px-4 py-4 font-medium text-slate-900">{row.name}</td>
              <td className="px-4 py-4 text-right text-slate-700">{row.count}건</td>
              <td className="px-4 py-4 text-right font-medium text-slate-900">
                <AmountText value={row.amount} />
              </td>
              <td className="px-4 py-4 text-right text-slate-700">
                <AmountText value={row.approvedAmount} />
              </td>
              <td className="px-4 py-4 text-right text-[var(--primary)]">
                <AmountText value={row.confirmedAmount} />
              </td>
              <td className="px-4 py-4 text-right text-emerald-700">
                <AmountText value={row.paidAmount} />
              </td>
              <td
                className={[
                  "px-4 py-4 text-right font-medium",
                  row.missingProofCount > 0 ? "text-amber-700" : "text-slate-500",
                ].join(" ")}
              >
                {row.missingProofCount}건
              </td>
            </tr>
          ))}
        </TabSection>
      );
    }

    if (activeTab === "category-expenses") {
      return (
        <TabSection
          title="경비 유형별 지출"
          description="경비 유형별로 지출 금액, 승인 금액, 정산 확정/지급 완료 금액을 확인합니다."
          columns={categoryColumns}
          hasRows={categoryExpenseRows.length > 0}
          emptyMessage="선택한 월의 경비 유형별 지출 내역이 없습니다."
          isLoading={isLoading}
          loadingMessage="경비 유형별 지출 내역을 불러오는 중입니다."
        >
          {categoryExpenseRows.map((row) => (
            <tr key={row.key} className="border-b border-slate-100 last:border-b-0">
              <td className="px-4 py-4 font-medium text-slate-900">{row.name}</td>
              <td className="px-4 py-4 text-right text-slate-700">{row.count}건</td>
              <td className="px-4 py-4 text-right font-medium text-slate-900">
                <AmountText value={row.amount} />
              </td>
              <td className="px-4 py-4 text-right text-slate-700">
                <AmountText value={row.approvedAmount} />
              </td>
              <td className="px-4 py-4 text-right text-[var(--primary)]">
                <AmountText value={row.confirmedAmount} />
              </td>
              <td className="px-4 py-4 text-right text-emerald-700">
                <AmountText value={row.paidAmount} />
              </td>
              <td
                className={[
                  "px-4 py-4 text-right font-medium",
                  row.missingProofCount > 0 ? "text-amber-700" : "text-slate-500",
                ].join(" ")}
              >
                {row.missingProofCount}건
              </td>
            </tr>
          ))}
        </TabSection>
      );
    }

    if (activeTab === "missing-proofs") {
      return (
        <TabSection
          title="증빙 누락 목록"
          description="증빙 상태가 미첨부인 지출 요청만 모아 회계 보완 대상 목록으로 확인합니다."
          columns={issueColumns}
          hasRows={missingProofRows.length > 0}
          emptyMessage="선택한 월의 증빙 누락 건이 없습니다."
          isLoading={isLoading}
          loadingMessage="증빙 누락 목록을 불러오는 중입니다."
        >
          {missingProofRows.map((row) => (
            <tr key={row.id} className="border-b border-amber-100 bg-amber-50/45 last:border-b-0">
              <td className="px-4 py-4 text-slate-600">{row.requestNumber}</td>
              <td className="px-4 py-4 text-slate-500">{row.usedDate}</td>
              <td className="px-4 py-4 font-medium text-slate-900">{row.employeeName}</td>
              <td className="px-4 py-4 text-slate-700">{row.projectName}</td>
              <td className="px-4 py-4 text-slate-700">{row.categoryName}</td>
              <td className="px-4 py-4 text-slate-600">{row.vendor}</td>
              <td className="px-4 py-4 text-right font-medium text-slate-900">
                <AmountText value={row.amount} />
              </td>
              <td className="px-4 py-4 text-center">
                <StatusBadge status={row.attachmentStatus} />
              </td>
              <td className="px-4 py-4 text-center">
                <StatusBadge status={row.approvalStatus} />
              </td>
              <td className="px-4 py-4 text-center">
                <SettlementStatusCell
                  status={row.settlementStatus}
                  label={row.settlementStatusLabel}
                />
              </td>
            </tr>
          ))}
        </TabSection>
      );
    }

    return (
      <TabSection
        title="반려/수정요청 목록"
        description="반려 또는 수정요청 상태인 지출 요청만 별도로 모아 회계 제외/보완 대상을 확인합니다."
        columns={issueColumns}
        hasRows={rejectedRevisionRows.length > 0}
        emptyMessage="선택한 월의 반려/수정요청 건이 없습니다."
        isLoading={isLoading}
        loadingMessage="반려/수정요청 목록을 불러오는 중입니다."
      >
        {rejectedRevisionRows.map((row) => (
          <tr
            key={row.id}
            className={[
              "border-b last:border-b-0",
              row.rawStatus === "rejected"
                ? "border-rose-100 bg-rose-50/45"
                : "border-orange-100 bg-orange-50/45",
            ].join(" ")}
          >
            <td className="px-4 py-4 text-slate-600">{row.requestNumber}</td>
            <td className="px-4 py-4 text-slate-500">{row.usedDate}</td>
            <td className="px-4 py-4 font-medium text-slate-900">{row.employeeName}</td>
            <td className="px-4 py-4 text-slate-700">{row.projectName}</td>
            <td className="px-4 py-4 text-slate-700">{row.categoryName}</td>
            <td className="px-4 py-4 text-slate-600">{row.vendor}</td>
            <td className="px-4 py-4 text-right font-medium text-slate-900">
              <AmountText value={row.amount} />
            </td>
            <td className="px-4 py-4 text-center">
              <StatusBadge status={row.attachmentStatus} />
            </td>
            <td className="px-4 py-4 text-center">
              <StatusBadge status={row.approvalStatus} />
            </td>
            <td className="px-4 py-4 text-center">
              <SettlementStatusCell
                status={row.settlementStatus}
                label={row.settlementStatusLabel}
              />
            </td>
          </tr>
        ))}
      </TabSection>
    );
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="회계 자료"
        description="월별 지출, 정산, 증빙, 프로젝트, 경비 유형 데이터를 실제 Supabase 기준으로 정리해 세무/회계 전달 전 상태를 확인합니다."
        roles={roleViews}
        activeRole="관리자 보기"
        eyebrow="회계 전달 자료"
        badgeText="실데이터 집계 화면"
      />

      {loadError ? (
        <section className="rounded-[1.75rem] border border-rose-200 bg-rose-50 px-5 py-4 text-sm leading-6 text-rose-700 shadow-sm">
          <p className="font-semibold">회계 자료를 불러오지 못했습니다.</p>
          <p className="mt-2 whitespace-pre-wrap break-words">{loadError}</p>
        </section>
      ) : null}

      {schemaNotice ? (
        <section className="rounded-[1.75rem] border border-amber-200 bg-amber-50 px-5 py-4 text-sm leading-6 text-amber-800 shadow-sm">
          <p className="font-semibold">정산 스냅샷 테이블 안내</p>
          <p className="mt-2 whitespace-pre-wrap break-words">{schemaNotice}</p>
        </section>
      ) : null}

      <section className="rounded-[1.75rem] border border-slate-200/90 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-950">조회 기준</h3>
            <p className="mt-1 text-sm text-slate-500">
              선택한 월의 expense_requests를 기준으로 monthly_settlements, settlement_items, 첨부 데이터까지 함께
              조회합니다.
            </p>
          </div>

          <div className="w-full xl:w-[220px]">
            <label htmlFor="accounting-month" className="text-sm font-semibold text-slate-900">
              월 선택
            </label>
            <select
              id="accounting-month"
              value={selectedMonth}
              onChange={(event) => setSelectedMonth(event.target.value)}
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-[var(--primary)] focus:ring-4 focus:ring-[color:rgba(22,59,111,0.08)]"
            >
              {monthOptions.map((month) => (
                <option key={month.value} value={month.value}>
                  {month.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-7">
        {summaryCards.map((card) => (
          <StatCard
            key={card.id}
            title={card.title}
            description={card.description}
            value={
              card.value ?? <span className="text-base font-medium text-slate-400">불러오는 중..</span>
            }
            icon={card.icon}
          />
        ))}
      </section>

      <section className="rounded-[1.75rem] border border-slate-200/90 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-950">CSV 다운로드</h3>
            <p className="mt-1 text-sm text-slate-500">
              현재 화면에 집계된 실제 Supabase 회계 데이터를 CSV로 내려받을 수 있습니다.
            </p>
          </div>
          <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">
            파일 기준 {selectedMonth}
          </span>
        </div>

        {exportFeedback ? (
          <div
            className={[
              "mt-4 rounded-2xl border px-4 py-3 text-sm",
              exportFeedback.type === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : exportFeedback.type === "error"
                  ? "border-rose-200 bg-rose-50 text-rose-700"
                  : "border-amber-200 bg-amber-50 text-amber-700",
            ].join(" ")}
          >
            {exportFeedback.message}
          </div>
        ) : null}

        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {[
            {
              key: "all-expenses",
              label: "전체 지출 내역 CSV 다운로드",
              onClick: () =>
                exportCsvRows(
                  "전체 지출 내역",
                  accountingRows,
                  allExpenseCsvColumns,
                  getAccountingCsvFileName(selectedMonth, "all-expenses"),
                ),
            },
            {
              key: "employee-settlements",
              label: "직원별 정산 CSV 다운로드",
              onClick: () =>
                exportCsvRows(
                  "직원별 정산",
                  employeeSettlementRows,
                  employeeSettlementCsvColumns,
                  getAccountingCsvFileName(selectedMonth, "employee-settlements"),
                ),
            },
            {
              key: "project-expenses",
              label: "프로젝트별 지출 CSV 다운로드",
              onClick: () =>
                exportCsvRows(
                  "프로젝트별 지출",
                  projectExpenseRows,
                  projectCsvColumns,
                  getAccountingCsvFileName(selectedMonth, "project-expenses"),
                ),
            },
            {
              key: "category-expenses",
              label: "경비 유형별 지출 CSV 다운로드",
              onClick: () =>
                exportCsvRows(
                  "경비 유형별 지출",
                  categoryExpenseRows,
                  categoryCsvColumns,
                  getAccountingCsvFileName(selectedMonth, "category-expenses"),
                ),
            },
            {
              key: "missing-proofs",
              label: "증빙 누락 목록 CSV 다운로드",
              onClick: () =>
                exportCsvRows(
                  "증빙 누락 목록",
                  missingProofRows,
                  issueCsvColumns,
                  getAccountingCsvFileName(selectedMonth, "missing-proofs"),
                ),
            },
            {
              key: "rejected-revisions",
              label: "반려·수정요청 목록 CSV 다운로드",
              onClick: () =>
                exportCsvRows(
                  "반려·수정요청 목록",
                  rejectedRevisionRows,
                  issueCsvColumns,
                  getAccountingCsvFileName(selectedMonth, "rejected-revisions"),
                ),
            },
          ].map((button) => (
            <button
              key={button.key}
              type="button"
              onClick={button.onClick}
              disabled={isLoading || Boolean(loadError)}
              className={[
                "rounded-2xl border px-4 py-3 text-left text-sm font-semibold transition",
                isLoading || loadError
                  ? "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400"
                  : "border-slate-200 bg-white text-slate-700 hover:border-[var(--primary)] hover:text-[var(--primary)]",
              ].join(" ")}
            >
              {button.label}
            </button>
          ))}
        </div>
      </section>

      <section className="rounded-[1.75rem] border border-slate-200/90 bg-white p-5 shadow-sm">
        <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-950">자료 탭</h3>
            <p className="mt-1 text-sm text-slate-500">
              전체 지출, 정산, 프로젝트, 경비 유형, 증빙 누락, 반려/수정요청 기준으로 자료를 나누어 확인합니다.
            </p>
          </div>
          <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">
            현재 {tabs.find((tab) => tab.key === activeTab)?.label}
          </span>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={[
                "whitespace-nowrap rounded-2xl px-4 py-2.5 text-sm font-semibold transition",
                activeTab === tab.key
                  ? "bg-[var(--primary)] text-white shadow-sm"
                  : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900",
              ].join(" ")}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </section>

      {renderActiveTab()}
    </div>
  );
}
