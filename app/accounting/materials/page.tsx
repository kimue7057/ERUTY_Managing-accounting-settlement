"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  BadgeCheck,
  Download,
  FileArchive,
  Files,
  FileWarning,
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
import type {
  AccountingProcessingStatus,
  AttachmentStatus,
  ExpenseStatus,
  MonthlySettlementStatus,
  PaymentMethod,
  RoleView,
  SettlementEligibility,
} from "@/types";
import {
  formatSupabaseDate,
  getSingleRelation,
  mapDbExpenseStatus,
  mapDbPaymentMethod,
  mapSettlementRequested,
  type DbEvidenceStatus,
  type DbExpenseStatus,
  type DbPaymentMethod,
} from "@/utils/expenseRequests";
import { createCsvContent, downloadCsvFile, type CsvColumn } from "@/utils/csv";
import { formatNumber } from "@/utils/format";
import { getUserFacingSupabaseMessage } from "@/utils/userFacingError";

type AccountingTabKey =
  | "monthly-summary"
  | "all-expenses"
  | "employee-settlements"
  | "project-expenses"
  | "account-subjects"
  | "missing-proofs"
  | "rejected-hold";

const roleViews: RoleView[] = ["직원 보기", "관리자 보기", "대표 보기"];

const tabs: Array<{ key: AccountingTabKey; label: string }> = [
  { key: "monthly-summary", label: "월별 요약" },
  { key: "all-expenses", label: "전체 지출 내역" },
  { key: "employee-settlements", label: "직원별 정산 내역" },
  { key: "project-expenses", label: "프로젝트별 지출 내역" },
  { key: "account-subjects", label: "계정과목별 지출 내역" },
  { key: "missing-proofs", label: "증빙 누락 목록" },
  { key: "rejected-hold", label: "반려/보류 목록" },
];

const statusFilterOptions = [
  "전체",
  "승인대기",
  "승인완료",
  "수정요청",
  "반려",
  "보류",
] as const;

const monthlySummaryColumns = [
  { key: "month", label: "월" },
  { key: "count", label: "총 지출 건수", align: "right" as const },
  { key: "amount", label: "총 지출 금액", align: "right" as const },
  { key: "proofCompleted", label: "증빙 완료 건수", align: "right" as const },
  { key: "proofMissing", label: "증빙 누락 건수", align: "right" as const },
  { key: "accountingCompleted", label: "회계처리 완료 건수", align: "right" as const },
];

const allExpenseColumns = [
  { key: "usedDate", label: "사용일" },
  { key: "employeeName", label: "직원명" },
  { key: "expenseType", label: "경비 유형" },
  { key: "merchantName", label: "사용처" },
  { key: "amount", label: "금액", align: "right" as const },
  { key: "paymentMethod", label: "결제수단" },
  { key: "settlementEligibility", label: "정산 여부", align: "center" as const },
  { key: "attachmentStatus", label: "증빙", align: "center" as const },
  { key: "approvalStatus", label: "승인 상태", align: "center" as const },
  { key: "accountingStatus", label: "회계처리 상태", align: "center" as const },
];

const employeeSettlementColumns = [
  { key: "employeeName", label: "직원명" },
  { key: "approvedAmount", label: "승인 금액", align: "right" as const },
  { key: "plannedAmount", label: "정산 예정액", align: "right" as const },
  { key: "payoutStatus", label: "지급 상태", align: "center" as const },
];

const projectExpenseColumns = [
  { key: "projectName", label: "프로젝트" },
  { key: "count", label: "건수", align: "right" as const },
  { key: "amount", label: "총액", align: "right" as const },
  { key: "approvedAmount", label: "승인완료 금액", align: "right" as const },
  { key: "missingProofCount", label: "증빙 누락 건수", align: "right" as const },
];

const accountSubjectColumns = [
  { key: "accountSubject", label: "계정과목" },
  { key: "count", label: "건수", align: "right" as const },
  { key: "amount", label: "총액", align: "right" as const },
  { key: "proofRate", label: "증빙 완료율", align: "right" as const },
];

const issueColumns = [
  { key: "usedDate", label: "사용일" },
  { key: "employeeName", label: "직원명" },
  { key: "projectName", label: "프로젝트" },
  { key: "expenseType", label: "경비 유형" },
  { key: "merchantName", label: "사용처" },
  { key: "amount", label: "금액", align: "right" as const },
  { key: "approvalStatus", label: "승인 상태", align: "center" as const },
  { key: "accountingStatus", label: "회계처리 상태", align: "center" as const },
];

type MonthOption = {
  value: string;
  label: string;
};

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

type AccountingExpenseRow = {
  id: string;
  requestNumber: string;
  title: string;
  employeeId: string;
  usedDate: string;
  requestedDate: string;
  approvedDate: string;
  employeeName: string;
  department: string;
  projectName: string;
  expenseType: string;
  accountSubject: string;
  merchantName: string;
  purpose: string;
  memo: string;
  amount: number;
  paymentMethod: PaymentMethod;
  settlementRequestedLabel: string;
  settlementEligibility: SettlementEligibility;
  attachmentStatus: AttachmentStatus;
  approvalStatus: ExpenseStatus;
  accountingStatus: AccountingProcessingStatus;
};

type AccountingSummaryValues = {
  totalExpenseCount: number;
  totalExpenseAmount: number;
  proofCompletedCount: number;
  proofMissingCount: number;
  accountingCompletedCount: number;
};

type ProjectExpenseRow = {
  projectName: string;
  count: number;
  amount: number;
  approvedAmount: number;
  missingProofCount: number;
};

type AccountSubjectRow = {
  accountSubject: string;
  count: number;
  amount: number;
  proofRate: number;
};

type SettlementRecordStatus = "confirmed" | "paid" | "on_hold";

type EmployeeSettlementDisplayStatus = MonthlySettlementStatus | "정산완료";

type EmployeeSettlementRow = {
  employeeId: string;
  employeeName: string;
  department: string;
  approvedAmount: number;
  plannedAmount: number;
  payoutStatus: EmployeeSettlementDisplayStatus;
};

type MonthlySettlementRecordRow = {
  id: string;
  employee_id: string;
  approved_amount: number;
  final_payment_amount: number;
  status: SettlementRecordStatus;
  confirmed_at: string | null;
  paid_at: string | null;
};

type AggregatedEmployeeSettlement = {
  employeeId: string;
  employeeName: string;
  department: string;
  approvedAmount: number;
  plannedAmount: number;
  payoutStatus: MonthlySettlementStatus;
};

type CsvDownloadFeedback = {
  type: "error" | "notice";
  message: string;
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

function isSettlementTargetPaymentMethod(paymentMethod: DbPaymentMethod) {
  return paymentMethod === "personal_card" || paymentMethod === "cash";
}

function getSettlementEligibility(row: ExpenseRequestRow): SettlementEligibility {
  return row.settlement_requested && isSettlementTargetPaymentMethod(row.payment_method)
    ? "정산 대상"
    : "정산 대상 아님";
}

function getAccountingStatus(
  row: ExpenseRequestRow,
  hasAttachment: boolean,
): AccountingProcessingStatus {
  if (row.status === "approved" && hasAttachment) {
    return "처리완료";
  }

  if (
    !hasAttachment ||
    row.status === "rejected" ||
    row.status === "on_hold" ||
    row.status === "revision_requested"
  ) {
    return "보류";
  }

  return "처리대기";
}

function normalizeExportText(value: string | null | undefined, fallback = "-") {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : fallback;
}

function mapSettlementRecordStatus(
  settlementRecord: MonthlySettlementRecordRow | undefined,
  defaultStatus: MonthlySettlementStatus,
): EmployeeSettlementDisplayStatus {
  if (settlementRecord?.status === "paid") {
    return "지급완료";
  }

  if (settlementRecord?.status === "confirmed") {
    return "정산완료";
  }

  return defaultStatus;
}

function getExpensePayoutStatus(
  expense: AccountingExpenseRow,
  settlementRecord: MonthlySettlementRecordRow | undefined,
) {
  if (expense.settlementEligibility !== "정산 대상") {
    return "정산 대상 아님";
  }

  if (settlementRecord?.status === "paid") {
    return "지급완료";
  }

  if (settlementRecord?.status === "confirmed") {
    return "정산완료";
  }

  if (expense.attachmentStatus === "미첨부") {
    return "보류";
  }

  if (expense.approvalStatus === "승인완료") {
    return "지급대기";
  }

  return "정산대기";
}

function createAccountingCsvFileName(month: string, suffix?: string) {
  return suffix
    ? `eruty-accounting-${month}-${suffix}.csv`
    : `eruty-accounting-${month}.csv`;
}

function mapExpenseRow(
  row: ExpenseRequestRow,
  attachmentCount: number,
): AccountingExpenseRow {
  const requester = getSingleRelation(row.requester);
  const project = getSingleRelation(row.project);
  const category = getSingleRelation(row.category);
  const attachmentStatus: AttachmentStatus =
    attachmentCount > 0 ? "첨부완료" : "미첨부";

  return {
    id: row.id,
    requestNumber: row.request_no,
    title: normalizeExportText(row.title),
    employeeId: requester?.id ?? `unknown-${row.id}`,
    usedDate: formatSupabaseDate(row.expense_date),
    requestedDate: formatSupabaseDate(row.requested_at),
    approvedDate: formatSupabaseDate(row.approved_at),
    employeeName: requester?.name ?? "미확인 직원",
    department: normalizeExportText(requester?.department, "-"),
    projectName: project?.name ?? "미지정 프로젝트",
    expenseType: category?.name ?? "기타",
    accountSubject: category?.name ?? "기타",
    merchantName: row.vendor,
    purpose: normalizeExportText(row.purpose),
    memo: [normalizeExportText(row.memo, ""), normalizeExportText(row.reject_reason, "")]
      .filter((value) => value.length > 0)
      .join(" / "),
    amount: row.amount,
    paymentMethod: mapDbPaymentMethod(row.payment_method),
    settlementRequestedLabel: mapSettlementRequested(row.settlement_requested),
    settlementEligibility: getSettlementEligibility(row),
    attachmentStatus,
    approvalStatus: mapDbExpenseStatus(row.status),
    accountingStatus: getAccountingStatus(row, attachmentCount > 0),
  };
}

function getSettlementRecordMap(rows: MonthlySettlementRecordRow[]) {
  return rows.reduce<Record<string, MonthlySettlementRecordRow>>((result, row) => {
    result[row.employee_id] = row;
    return result;
  }, {});
}

function buildEmployeeSettlementRows(
  expenses: AccountingExpenseRow[],
): AggregatedEmployeeSettlement[] {
  const grouped = new Map<string, AggregatedEmployeeSettlement>();

  expenses
    .filter(
      (expense) =>
        expense.settlementEligibility === "정산 대상" &&
        expense.approvalStatus === "승인완료",
    )
    .forEach((expense) => {
      const current = grouped.get(expense.employeeId) ?? {
        employeeId: expense.employeeId,
        employeeName: expense.employeeName,
        department: expense.department,
        approvedAmount: 0,
        plannedAmount: 0,
        payoutStatus: "정산대기" as MonthlySettlementStatus,
      };

      current.approvedAmount += expense.amount;

      if (expense.attachmentStatus === "첨부완료") {
        current.plannedAmount += expense.amount;
      }

      grouped.set(expense.employeeId, current);
    });

  return Array.from(grouped.values()).map((employee) => ({
    ...employee,
    payoutStatus: employee.plannedAmount > 0 ? "지급대기" : "정산대기",
  }));
}

function SettlementEligibilityBadge({ value }: { value: SettlementEligibility }) {
  const tone =
    value === "정산 대상"
      ? "border-[color:rgba(22,59,111,0.14)] bg-[var(--primary-soft)] text-[var(--primary)]"
      : "border-slate-200 bg-slate-100 text-slate-600";

  return (
    <span
      className={[
        "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold",
        tone,
      ].join(" ")}
    >
      {value}
    </span>
  );
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
          description="필터를 조정해서 다른 회계 자료를 확인해보세요."
        />
      ) : null}
    </section>
  );
}

export default function AccountingMaterialsPage() {
  const monthOptions = useMemo(() => createRecentMonthOptions(), []);
  const [selectedMonth, setSelectedMonth] = useState(monthOptions[0]?.value ?? "");
  const [selectedProject, setSelectedProject] = useState("전체");
  const [selectedStatus, setSelectedStatus] =
    useState<(typeof statusFilterOptions)[number]>("전체");
  const [activeTab, setActiveTab] = useState<AccountingTabKey>("monthly-summary");
  const [rawExpenseRows, setRawExpenseRows] = useState<ExpenseRequestRow[]>([]);
  const [attachmentCountByRequestId, setAttachmentCountByRequestId] = useState<
    Record<string, number>
  >({});
  const [settlementRecordByEmployeeId, setSettlementRecordByEmployeeId] = useState<
    Record<string, MonthlySettlementRecordRow>
  >({});
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [downloadFeedback, setDownloadFeedback] = useState<CsvDownloadFeedback | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadAccountingRows() {
      setIsLoading(true);
      setLoadError(null);
      setDownloadFeedback(null);

      if (!isSupabaseConfigured) {
        if (!isMounted) {
          return;
        }

        setLoadError(
          "Supabase 환경변수가 설정되지 않았습니다. NEXT_PUBLIC_SUPABASE_URL과 NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY를 확인해주세요.",
        );
        setRawExpenseRows([]);
        setAttachmentCountByRequestId({});
        setSettlementRecordByEmployeeId({});
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
          .order("expense_date", { ascending: false });

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
          ).reduce<Record<string, number>>((acc, attachment) => {
            acc[attachment.expense_request_id] = (acc[attachment.expense_request_id] ?? 0) + 1;
            return acc;
          }, {});
        }

        const { data: settlementRows, error: settlementError } = await supabase
          .from("monthly_settlements")
          .select(
            `
              id,
              employee_id,
              approved_amount,
              final_payment_amount,
              status,
              confirmed_at,
              paid_at
            `,
          )
          .eq("settlement_month", selectedMonth);

        if (settlementError) {
          throw settlementError;
        }

        setRawExpenseRows(expenseRows);
        setAttachmentCountByRequestId(nextAttachmentCountByRequestId);
        setSettlementRecordByEmployeeId(
          getSettlementRecordMap((settlementRows ?? []) as MonthlySettlementRecordRow[]),
        );
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
        setSettlementRecordByEmployeeId({});
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

  const accountingRows = useMemo(
    () =>
      rawExpenseRows.map((row) => mapExpenseRow(row, attachmentCountByRequestId[row.id] ?? 0)),
    [attachmentCountByRequestId, rawExpenseRows],
  );

  const projectOptions = useMemo(
    () => ["전체", ...Array.from(new Set(accountingRows.map((row) => row.projectName)))],
    [accountingRows],
  );

  const filteredExpenses = useMemo(() => {
    return accountingRows.filter((expense) => {
      const matchesProject =
        selectedProject === "전체" || expense.projectName === selectedProject;
      const matchesStatus =
        selectedStatus === "전체" || expense.approvalStatus === selectedStatus;

      return matchesProject && matchesStatus;
    });
  }, [accountingRows, selectedProject, selectedStatus]);

  const summary = useMemo<AccountingSummaryValues>(
    () => ({
      totalExpenseCount: accountingRows.length,
      totalExpenseAmount: accountingRows.reduce((sum, row) => sum + row.amount, 0),
      proofCompletedCount: accountingRows.filter(
        (row) => row.attachmentStatus === "첨부완료",
      ).length,
      proofMissingCount: accountingRows.filter((row) => row.attachmentStatus === "미첨부").length,
      accountingCompletedCount: accountingRows.filter(
        (row) => row.accountingStatus === "처리완료",
      ).length,
    }),
    [accountingRows],
  );

  const employeeSettlementRows = useMemo<EmployeeSettlementRow[]>(() => {
    return buildEmployeeSettlementRows(filteredExpenses).map((employee) => {
      const settlementRecord = settlementRecordByEmployeeId[employee.employeeId];

      return {
        employeeId: employee.employeeId,
        employeeName: employee.employeeName,
        department: employee.department,
        approvedAmount: settlementRecord?.approved_amount ?? employee.approvedAmount,
        plannedAmount: settlementRecord?.final_payment_amount ?? employee.plannedAmount,
        payoutStatus: mapSettlementRecordStatus(settlementRecord, employee.payoutStatus),
      };
    });
  }, [filteredExpenses, settlementRecordByEmployeeId]);

  const exportEmployeeSettlementRows = useMemo<EmployeeSettlementRow[]>(() => {
    return buildEmployeeSettlementRows(accountingRows).map((employee) => {
      const settlementRecord = settlementRecordByEmployeeId[employee.employeeId];

      return {
        employeeId: employee.employeeId,
        employeeName: employee.employeeName,
        department: employee.department,
        approvedAmount: settlementRecord?.approved_amount ?? employee.approvedAmount,
        plannedAmount: settlementRecord?.final_payment_amount ?? employee.plannedAmount,
        payoutStatus: mapSettlementRecordStatus(settlementRecord, employee.payoutStatus),
      };
    });
  }, [accountingRows, settlementRecordByEmployeeId]);

  const projectExpenseRows = useMemo<ProjectExpenseRow[]>(() => {
    const grouped = new Map<string, ProjectExpenseRow>();

    filteredExpenses.forEach((expense) => {
      const current = grouped.get(expense.projectName) ?? {
        projectName: expense.projectName,
        count: 0,
        amount: 0,
        approvedAmount: 0,
        missingProofCount: 0,
      };

      current.count += 1;
      current.amount += expense.amount;
      current.approvedAmount += expense.approvalStatus === "승인완료" ? expense.amount : 0;
      current.missingProofCount += expense.attachmentStatus === "미첨부" ? 1 : 0;

      grouped.set(expense.projectName, current);
    });

    return Array.from(grouped.values()).sort((left, right) => right.amount - left.amount);
  }, [filteredExpenses]);

  const exportProjectExpenseRows = useMemo<ProjectExpenseRow[]>(() => {
    const grouped = new Map<string, ProjectExpenseRow>();

    accountingRows.forEach((expense) => {
      const current = grouped.get(expense.projectName) ?? {
        projectName: expense.projectName,
        count: 0,
        amount: 0,
        approvedAmount: 0,
        missingProofCount: 0,
      };

      current.count += 1;
      current.amount += expense.amount;
      current.approvedAmount += expense.approvalStatus === "승인완료" ? expense.amount : 0;
      current.missingProofCount += expense.attachmentStatus === "미첨부" ? 1 : 0;

      grouped.set(expense.projectName, current);
    });

    return Array.from(grouped.values()).sort((left, right) => right.amount - left.amount);
  }, [accountingRows]);

  const accountSubjectRows = useMemo<AccountSubjectRow[]>(() => {
    const grouped = new Map<
      string,
      { accountSubject: string; count: number; amount: number; proofCompletedCount: number }
    >();

    filteredExpenses.forEach((expense) => {
      const current = grouped.get(expense.accountSubject) ?? {
        accountSubject: expense.accountSubject,
        count: 0,
        amount: 0,
        proofCompletedCount: 0,
      };

      current.count += 1;
      current.amount += expense.amount;
      current.proofCompletedCount += expense.attachmentStatus === "첨부완료" ? 1 : 0;

      grouped.set(expense.accountSubject, current);
    });

    return Array.from(grouped.values())
      .map((item) => ({
        accountSubject: item.accountSubject,
        count: item.count,
        amount: item.amount,
        proofRate: item.count === 0 ? 0 : Math.round((item.proofCompletedCount / item.count) * 100),
      }))
      .sort((left, right) => right.amount - left.amount);
  }, [filteredExpenses]);

  const exportAccountSubjectRows = useMemo<AccountSubjectRow[]>(() => {
    const grouped = new Map<
      string,
      { accountSubject: string; count: number; amount: number; proofCompletedCount: number }
    >();

    accountingRows.forEach((expense) => {
      const current = grouped.get(expense.accountSubject) ?? {
        accountSubject: expense.accountSubject,
        count: 0,
        amount: 0,
        proofCompletedCount: 0,
      };

      current.count += 1;
      current.amount += expense.amount;
      current.proofCompletedCount += expense.attachmentStatus === "첨부완료" ? 1 : 0;

      grouped.set(expense.accountSubject, current);
    });

    return Array.from(grouped.values())
      .map((item) => ({
        accountSubject: item.accountSubject,
        count: item.count,
        amount: item.amount,
        proofRate: item.count === 0 ? 0 : Math.round((item.proofCompletedCount / item.count) * 100),
      }))
      .sort((left, right) => right.amount - left.amount);
  }, [accountingRows]);

  const missingProofRows = useMemo(
    () => filteredExpenses.filter((expense) => expense.attachmentStatus === "미첨부"),
    [filteredExpenses],
  );

  const exportMissingProofRows = useMemo(
    () => accountingRows.filter((expense) => expense.attachmentStatus === "미첨부"),
    [accountingRows],
  );

  const rejectedHoldRows = useMemo(
    () =>
      filteredExpenses.filter((expense) =>
        ["반려", "보류", "수정요청"].includes(expense.approvalStatus),
      ),
    [filteredExpenses],
  );

  const exportRejectedHoldRows = useMemo(
    () =>
      accountingRows.filter((expense) =>
        ["반려", "보류", "수정요청"].includes(expense.approvalStatus),
      ),
    [accountingRows],
  );

  const monthSummaryRows = [
    {
      month: monthOptions.find((option) => option.value === selectedMonth)?.label ?? selectedMonth,
      count: summary.totalExpenseCount,
      amount: summary.totalExpenseAmount,
      proofCompleted: summary.proofCompletedCount,
      proofMissing: summary.proofMissingCount,
      accountingCompleted: summary.accountingCompletedCount,
    },
  ];

  const summaryCards = [
    {
      id: "expense-count",
      title: "총 지출 건수",
      value: isLoading ? null : <span>{summary.totalExpenseCount}건</span>,
      description: "선택한 월의 expense_requests 전체 건수입니다.",
      icon: <ReceiptText className="h-5 w-5" strokeWidth={1.8} />,
    },
    {
      id: "expense-amount",
      title: "총 지출 금액",
      value: isLoading ? null : <AmountText value={summary.totalExpenseAmount} />,
      description: "선택한 월의 전체 지출 금액 합계입니다.",
      icon: <WalletCards className="h-5 w-5" strokeWidth={1.8} />,
    },
    {
      id: "proof-complete",
      title: "증빙 완료 건수",
      value: isLoading ? null : <span>{summary.proofCompletedCount}건</span>,
      description: "expense_attachments 기준으로 첨부가 있는 지출 건수입니다.",
      icon: <BadgeCheck className="h-5 w-5" strokeWidth={1.8} />,
    },
    {
      id: "proof-missing",
      title: "증빙 누락 건수",
      value: isLoading ? null : <span>{summary.proofMissingCount}건</span>,
      description: "expense_attachments가 없는 지출 건수입니다.",
      icon: <FileWarning className="h-5 w-5" strokeWidth={1.8} />,
    },
    {
      id: "accounting-complete",
      title: "회계처리 완료 건수",
      value: isLoading ? null : <span>{summary.accountingCompletedCount}건</span>,
      description: "approved + 첨부완료 기준으로 회계 전달 완료로 간주한 건수입니다.",
      icon: <Files className="h-5 w-5" strokeWidth={1.8} />,
    },
  ];

  const allExpenseCsvColumns: CsvColumn<AccountingExpenseRow>[] = [
    { key: "requestNumber", header: "요청번호" },
    { key: "title", header: "경비 제목" },
    { key: "usedDate", header: "사용일" },
    { key: "requestedDate", header: "요청일" },
    { key: "employeeName", header: "직원명" },
    { key: "department", header: "부서" },
    { key: "projectName", header: "프로젝트명" },
    { key: "expenseType", header: "경비유형" },
    { key: "merchantName", header: "사용처" },
    { key: "purpose", header: "사용목적" },
    { key: "paymentMethod", header: "결제수단" },
    { key: "settlementRequestedLabel", header: "정산요청여부" },
    { key: "amount", header: "금액" },
    { key: "approvalStatus", header: "상태" },
    { key: "attachmentStatus", header: "증빙상태" },
    { key: "approvedDate", header: "승인일" },
    {
      key: "payoutStatus",
      header: "지급상태",
      accessor: (row) => getExpensePayoutStatus(row, settlementRecordByEmployeeId[row.employeeId]),
    },
    { key: "memo", header: "메모" },
  ];

  const employeeSettlementCsvColumns: CsvColumn<EmployeeSettlementRow>[] = [
    { key: "employeeName", header: "직원명" },
    { key: "department", header: "부서" },
    { key: "approvedAmount", header: "승인 금액" },
    { key: "plannedAmount", header: "정산 예정액" },
    { key: "payoutStatus", header: "지급 상태" },
  ];

  const projectExpenseCsvColumns: CsvColumn<ProjectExpenseRow>[] = [
    { key: "projectName", header: "프로젝트명" },
    { key: "count", header: "건수" },
    { key: "amount", header: "총 지출 금액" },
    { key: "approvedAmount", header: "승인완료 금액" },
    { key: "missingProofCount", header: "증빙 누락 건수" },
  ];

  const accountSubjectCsvColumns: CsvColumn<AccountSubjectRow>[] = [
    { key: "accountSubject", header: "경비유형" },
    { key: "count", header: "건수" },
    { key: "amount", header: "총 지출 금액" },
    { key: "proofRate", header: "증빙 완료율(%)" },
  ];

  function ensureDownloadReady() {
    if (isLoading) {
      setDownloadFeedback({
        type: "notice",
        message: "회계 자료를 불러오는 중입니다. 로딩이 끝난 뒤 다시 시도해주세요.",
      });
      return false;
    }

    if (loadError) {
      setDownloadFeedback({
        type: "error",
        message: "회계 자료를 정상적으로 불러오지 못해 다운로드를 진행할 수 없습니다.",
      });
      return false;
    }

    return true;
  }

  function downloadSingleCsv<T>({
    rows,
    columns,
    fileName,
  }: {
    rows: T[];
    columns: CsvColumn<T>[];
    fileName: string;
  }) {
    const csvContent = createCsvContent(rows, columns);
    downloadCsvFile(fileName, csvContent);
  }

  function handleDatasetCsvDownload<T>({
    rows,
    columns,
    fileName,
  }: {
    rows: T[];
    columns: CsvColumn<T>[];
    fileName: string;
  }) {
    if (!ensureDownloadReady()) {
      return;
    }

    if (rows.length === 0) {
      setDownloadFeedback({
        type: "notice",
        message: "내보낼 데이터가 없습니다.",
      });
      return;
    }

    try {
      downloadSingleCsv({ rows, columns, fileName });
      setDownloadFeedback(null);
    } catch (error) {
      setDownloadFeedback({
        type: "error",
        message: getUserFacingSupabaseMessage(
          error,
          "CSV 다운로드 중 알 수 없는 오류가 발생했습니다.",
        ),
      });
    }
  }

  function handleDownloadAllAccountingFiles() {
    if (!ensureDownloadReady()) {
      return;
    }

    let downloadedFileCount = 0;

    const tryDownload = <T,>({
      rows,
      columns,
      fileName,
    }: {
      rows: T[];
      columns: CsvColumn<T>[];
      fileName: string;
    }) => {
      if (rows.length === 0) {
        return;
      }

      downloadSingleCsv({ rows, columns, fileName });
      downloadedFileCount += 1;
    };

    try {
      tryDownload({
        rows: accountingRows,
        columns: allExpenseCsvColumns,
        fileName: createAccountingCsvFileName(selectedMonth),
      });
      tryDownload({
        rows: exportEmployeeSettlementRows,
        columns: employeeSettlementCsvColumns,
        fileName: createAccountingCsvFileName(selectedMonth, "employee-settlements"),
      });
      tryDownload({
        rows: exportProjectExpenseRows,
        columns: projectExpenseCsvColumns,
        fileName: createAccountingCsvFileName(selectedMonth, "project-summary"),
      });
      tryDownload({
        rows: exportAccountSubjectRows,
        columns: accountSubjectCsvColumns,
        fileName: createAccountingCsvFileName(selectedMonth, "category-summary"),
      });
      tryDownload({
        rows: exportMissingProofRows,
        columns: allExpenseCsvColumns,
        fileName: createAccountingCsvFileName(selectedMonth, "missing-proofs"),
      });
      tryDownload({
        rows: exportRejectedHoldRows,
        columns: allExpenseCsvColumns,
        fileName: createAccountingCsvFileName(selectedMonth, "rejected-hold"),
      });

      if (downloadedFileCount === 0) {
        setDownloadFeedback({
          type: "notice",
          message: "내보낼 데이터가 없습니다.",
        });
        return;
      }

      setDownloadFeedback({
        type: "notice",
        message: `${downloadedFileCount}개의 회계자료 CSV 다운로드를 시작했습니다.`,
      });
    } catch (error) {
      setDownloadFeedback({
        type: "error",
        message: getUserFacingSupabaseMessage(
          error,
          "전체 회계자료 다운로드 중 알 수 없는 오류가 발생했습니다.",
        ),
      });
    }
  }

  const renderActiveTab = () => {
    if (activeTab === "monthly-summary") {
      return (
        <TabSection
          title="월별 요약"
          description="세무사 및 회계 담당자에게 전달할 월간 지출 현황 요약입니다."
          columns={monthlySummaryColumns}
          hasRows={monthSummaryRows.length > 0}
          emptyMessage="표시할 월별 요약 데이터가 없습니다."
          isLoading={isLoading}
          loadingMessage="월별 요약을 불러오는 중입니다."
        >
          {monthSummaryRows.map((row) => (
            <tr key={row.month} className="border-b border-slate-100 last:border-b-0">
              <td className="px-4 py-4 font-medium text-slate-900">{row.month}</td>
              <td className="px-4 py-4 text-right text-slate-700">{formatNumber(row.count)}건</td>
              <td className="px-4 py-4 text-right font-medium text-slate-900">
                <AmountText value={row.amount} />
              </td>
              <td className="px-4 py-4 text-right text-emerald-700">
                {formatNumber(row.proofCompleted)}건
              </td>
              <td className="px-4 py-4 text-right text-rose-700">
                {formatNumber(row.proofMissing)}건
              </td>
              <td className="px-4 py-4 text-right text-[var(--primary)]">
                {formatNumber(row.accountingCompleted)}건
              </td>
            </tr>
          ))}
        </TabSection>
      );
    }

    if (activeTab === "all-expenses") {
      return (
        <TabSection
          title="전체 지출 내역"
          description="선택한 월의 실제 expense_requests 지출 내역을 회계 전달 형식으로 정리합니다."
          columns={allExpenseColumns}
          hasRows={filteredExpenses.length > 0}
          emptyMessage="조건에 맞는 전체 지출 내역이 없습니다."
          isLoading={isLoading}
          loadingMessage="전체 지출 내역을 불러오는 중입니다."
        >
          {filteredExpenses.map((expense) => (
            <tr
              key={expense.id}
              className={[
                "border-b border-slate-100 last:border-b-0",
                expense.attachmentStatus === "미첨부" ? "bg-amber-50/35" : "",
              ].join(" ")}
            >
              <td className="px-4 py-4 text-slate-500">
                <time dateTime={expense.usedDate}>{expense.usedDate}</time>
              </td>
              <td className="px-4 py-4 font-medium text-slate-900">{expense.employeeName}</td>
              <td className="px-4 py-4 text-slate-700">{expense.expenseType}</td>
              <td className="px-4 py-4 text-slate-600">{expense.merchantName}</td>
              <td className="px-4 py-4 text-right font-medium text-slate-900">
                <AmountText value={expense.amount} />
              </td>
              <td className="px-4 py-4 text-slate-600">{expense.paymentMethod}</td>
              <td className="px-4 py-4 text-center">
                <SettlementEligibilityBadge value={expense.settlementEligibility} />
              </td>
              <td className="px-4 py-4 text-center">
                <StatusBadge status={expense.attachmentStatus} />
              </td>
              <td className="px-4 py-4 text-center">
                <StatusBadge status={expense.approvalStatus} />
              </td>
              <td className="px-4 py-4 text-center">
                <StatusBadge status={expense.accountingStatus} />
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
          description="승인완료된 개인카드/현금 사용 건만 기준으로 직원별 승인 금액, 정산 예정액, 지급 상태를 monthly_settlements 기준으로 표시합니다."
          columns={employeeSettlementColumns}
          hasRows={employeeSettlementRows.length > 0}
          emptyMessage="조건에 맞는 직원별 정산 내역이 없습니다."
          isLoading={isLoading}
          loadingMessage="직원별 정산 내역을 불러오는 중입니다."
        >
          {employeeSettlementRows.map((row) => (
            <tr key={row.employeeId} className="border-b border-slate-100 last:border-b-0">
              <td className="px-4 py-4 font-medium text-slate-900">{row.employeeName}</td>
              <td className="px-4 py-4 text-right font-medium text-slate-900">
                <AmountText value={row.approvedAmount} />
              </td>
              <td className="px-4 py-4 text-right text-[var(--primary)]">
                <AmountText value={row.plannedAmount} />
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
          title="프로젝트별 지출 내역"
          description="project_id 기준으로 건수, 총액, 승인완료 금액, 증빙 누락 건수를 집계합니다."
          columns={projectExpenseColumns}
          hasRows={projectExpenseRows.length > 0}
          emptyMessage="조건에 맞는 프로젝트별 지출 내역이 없습니다."
          isLoading={isLoading}
          loadingMessage="프로젝트별 지출 내역을 불러오는 중입니다."
        >
          {projectExpenseRows.map((row) => (
            <tr key={row.projectName} className="border-b border-slate-100 last:border-b-0">
              <td className="px-4 py-4 font-medium text-slate-900">{row.projectName}</td>
              <td className="px-4 py-4 text-right text-slate-700">{formatNumber(row.count)}건</td>
              <td className="px-4 py-4 text-right font-medium text-slate-900">
                <AmountText value={row.amount} />
              </td>
              <td className="px-4 py-4 text-right text-[var(--primary)]">
                <AmountText value={row.approvedAmount} />
              </td>
              <td
                className={[
                  "px-4 py-4 text-right font-medium",
                  row.missingProofCount > 0 ? "text-amber-700" : "text-slate-500",
                ].join(" ")}
              >
                {formatNumber(row.missingProofCount)}건
              </td>
            </tr>
          ))}
        </TabSection>
      );
    }

    if (activeTab === "account-subjects") {
      return (
        <TabSection
          title="계정과목별 지출 내역"
          description="expense_categories 기준으로 건수, 총액, 증빙 완료율을 집계합니다."
          columns={accountSubjectColumns}
          hasRows={accountSubjectRows.length > 0}
          emptyMessage="조건에 맞는 계정과목별 지출 내역이 없습니다."
          isLoading={isLoading}
          loadingMessage="계정과목별 지출 내역을 불러오는 중입니다."
        >
          {accountSubjectRows.map((row) => (
            <tr key={row.accountSubject} className="border-b border-slate-100 last:border-b-0">
              <td className="px-4 py-4 font-medium text-slate-900">{row.accountSubject}</td>
              <td className="px-4 py-4 text-right text-slate-700">{formatNumber(row.count)}건</td>
              <td className="px-4 py-4 text-right font-medium text-slate-900">
                <AmountText value={row.amount} />
              </td>
              <td className="px-4 py-4 text-right text-[var(--primary)]">{row.proofRate}%</td>
            </tr>
          ))}
        </TabSection>
      );
    }

    if (activeTab === "missing-proofs") {
      return (
        <TabSection
          title="증빙 누락 목록"
          description="실제 첨부파일이 없는 지출만 모아서 회계 전달 전 보완 대상을 확인합니다."
          columns={issueColumns}
          hasRows={missingProofRows.length > 0}
          emptyMessage="증빙 누락 건이 없습니다."
          isLoading={isLoading}
          loadingMessage="증빙 누락 목록을 불러오는 중입니다."
        >
          {missingProofRows.map((expense) => (
            <tr key={expense.id} className="border-b border-amber-100 bg-amber-50/45 last:border-b-0">
              <td className="px-4 py-4 text-slate-500">
                <time dateTime={expense.usedDate}>{expense.usedDate}</time>
              </td>
              <td className="px-4 py-4 font-medium text-slate-900">{expense.employeeName}</td>
              <td className="px-4 py-4 text-slate-700">{expense.projectName}</td>
              <td className="px-4 py-4 text-slate-700">{expense.expenseType}</td>
              <td className="px-4 py-4 text-slate-600">{expense.merchantName}</td>
              <td className="px-4 py-4 text-right font-medium text-slate-900">
                <AmountText value={expense.amount} />
              </td>
              <td className="px-4 py-4 text-center">
                <StatusBadge status={expense.approvalStatus} />
              </td>
              <td className="px-4 py-4 text-center">
                <StatusBadge status={expense.accountingStatus} />
              </td>
            </tr>
          ))}
        </TabSection>
      );
    }

    return (
      <TabSection
        title="반려/보류 목록"
        description="status 가 rejected, on_hold, revision_requested 인 요청만 별도로 모아서 확인합니다."
        columns={issueColumns}
        hasRows={rejectedHoldRows.length > 0}
        emptyMessage="반려 또는 보류 건이 없습니다."
        isLoading={isLoading}
        loadingMessage="반려/보류 목록을 불러오는 중입니다."
      >
        {rejectedHoldRows.map((expense) => (
          <tr
            key={expense.id}
            className={[
              "border-b last:border-b-0",
              expense.approvalStatus === "반려"
                ? "border-rose-100 bg-rose-50/45"
                : "border-slate-100 bg-slate-50/80",
            ].join(" ")}
          >
            <td className="px-4 py-4 text-slate-500">
              <time dateTime={expense.usedDate}>{expense.usedDate}</time>
            </td>
            <td className="px-4 py-4 font-medium text-slate-900">{expense.employeeName}</td>
            <td className="px-4 py-4 text-slate-700">{expense.projectName}</td>
            <td className="px-4 py-4 text-slate-700">{expense.expenseType}</td>
            <td className="px-4 py-4 text-slate-600">{expense.merchantName}</td>
            <td className="px-4 py-4 text-right font-medium text-slate-900">
              <AmountText value={expense.amount} />
            </td>
            <td className="px-4 py-4 text-center">
              <StatusBadge status={expense.approvalStatus} />
            </td>
            <td className="px-4 py-4 text-center">
              <StatusBadge status={expense.accountingStatus} />
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
        description="월별 지출 자료를 정리해 세무사 및 회계 담당자에게 전달하기 위한 자료 화면입니다."
        roles={roleViews}
        activeRole="관리자 보기"
        eyebrow="회계 전달 자료"
        badgeText="실데이터 집계 뷰"
      />

      {loadError ? (
        <section className="rounded-[1.75rem] border border-rose-200 bg-rose-50 px-5 py-4 text-sm leading-6 text-rose-700 shadow-sm">
          <p className="font-semibold">회계 자료를 불러오지 못했습니다.</p>
          <p className="mt-2 whitespace-pre-wrap break-words">{loadError}</p>
        </section>
      ) : null}

      {downloadFeedback ? (
        <section
          className={[
            "rounded-[1.75rem] px-5 py-4 text-sm leading-6 shadow-sm",
            downloadFeedback.type === "error"
              ? "border border-rose-200 bg-rose-50 text-rose-700"
              : "border border-slate-200 bg-slate-50 text-slate-700",
          ].join(" ")}
        >
          <p className="font-semibold">
            {downloadFeedback.type === "error"
              ? "다운로드를 진행하지 못했습니다."
              : "다운로드 안내"}
          </p>
          <p className="mt-2 whitespace-pre-wrap break-words">{downloadFeedback.message}</p>
        </section>
      ) : null}

      <section className="rounded-[1.75rem] border border-slate-200/90 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0 flex-1">
            <h3 className="text-lg font-semibold text-slate-950">필터 및 전달 액션</h3>
            <p className="mt-1 text-sm text-slate-500">
              월 선택을 기준으로 실제 expense_requests 자료를 조회하고, 프로젝트와 상태 필터를 탭 데이터에 적용합니다.
            </p>
            <p className="mt-2 text-xs font-medium text-slate-400">
              CSV 다운로드는 선택한 월의 전체 자료 기준으로 생성되며, 프로젝트/상태 필터는 화면 표시용으로만 적용됩니다.
            </p>

            <div className="mt-5 grid gap-4 xl:grid-cols-[220px_220px_220px]">
              <div>
                <label htmlFor="accounting-month" className="text-sm font-semibold text-slate-900">
                  월 선택
                </label>
                <select
                  id="accounting-month"
                  value={selectedMonth}
                  onChange={(event) => {
                    setSelectedMonth(event.target.value);
                    setSelectedProject("전체");
                    setSelectedStatus("전체");
                  }}
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-[var(--primary)] focus:ring-4 focus:ring-[color:rgba(22,59,111,0.08)]"
                >
                  {monthOptions.map((month) => (
                    <option key={month.value} value={month.value}>
                      {month.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="accounting-project" className="text-sm font-semibold text-slate-900">
                  프로젝트 선택
                </label>
                <select
                  id="accounting-project"
                  value={selectedProject}
                  onChange={(event) => setSelectedProject(event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-[var(--primary)] focus:ring-4 focus:ring-[color:rgba(22,59,111,0.08)]"
                >
                  {projectOptions.map((project) => (
                    <option key={project} value={project}>
                      {project}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="accounting-status" className="text-sm font-semibold text-slate-900">
                  지출 상태 선택
                </label>
                <select
                  id="accounting-status"
                  value={selectedStatus}
                  onChange={(event) =>
                    setSelectedStatus(event.target.value as (typeof statusFilterOptions)[number])
                  }
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-[var(--primary)] focus:ring-4 focus:ring-[color:rgba(22,59,111,0.08)]"
                >
                  {statusFilterOptions.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="flex w-full flex-col gap-3 xl:w-auto xl:min-w-[360px]">
            <button
              type="button"
              onClick={handleDownloadAllAccountingFiles}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[var(--primary)] px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:opacity-95"
            >
              <Download className="h-4.5 w-4.5" strokeWidth={1.8} />
              전체 회계자료 다운로드
            </button>
            <div className="grid gap-3 md:grid-cols-2">
              <button
                type="button"
                onClick={() =>
                  handleDatasetCsvDownload({
                    rows: accountingRows,
                    columns: allExpenseCsvColumns,
                    fileName: createAccountingCsvFileName(selectedMonth),
                  })
                }
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
              >
                <Download className="h-4.5 w-4.5" strokeWidth={1.8} />
                전체 지출 내역 CSV
              </button>
              <button
                type="button"
                onClick={() =>
                  handleDatasetCsvDownload({
                    rows: exportEmployeeSettlementRows,
                    columns: employeeSettlementCsvColumns,
                    fileName: createAccountingCsvFileName(selectedMonth, "employee-settlements"),
                  })
                }
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
              >
                <Download className="h-4.5 w-4.5" strokeWidth={1.8} />
                직원별 정산 CSV
              </button>
              <button
                type="button"
                onClick={() =>
                  handleDatasetCsvDownload({
                    rows: exportProjectExpenseRows,
                    columns: projectExpenseCsvColumns,
                    fileName: createAccountingCsvFileName(selectedMonth, "project-summary"),
                  })
                }
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
              >
                <Download className="h-4.5 w-4.5" strokeWidth={1.8} />
                프로젝트별 지출 CSV
              </button>
              <button
                type="button"
                onClick={() =>
                  handleDatasetCsvDownload({
                    rows: exportAccountSubjectRows,
                    columns: accountSubjectCsvColumns,
                    fileName: createAccountingCsvFileName(selectedMonth, "category-summary"),
                  })
                }
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
              >
                <Download className="h-4.5 w-4.5" strokeWidth={1.8} />
                경비 유형별 지출 CSV
              </button>
              <button
                type="button"
                onClick={() =>
                  handleDatasetCsvDownload({
                    rows: exportMissingProofRows,
                    columns: allExpenseCsvColumns,
                    fileName: createAccountingCsvFileName(selectedMonth, "missing-proofs"),
                  })
                }
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
              >
                <Download className="h-4.5 w-4.5" strokeWidth={1.8} />
                증빙 누락 목록 CSV
              </button>
              <button
                type="button"
                onClick={() =>
                  handleDatasetCsvDownload({
                    rows: exportRejectedHoldRows,
                    columns: allExpenseCsvColumns,
                    fileName: createAccountingCsvFileName(selectedMonth, "rejected-hold"),
                  })
                }
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
              >
                <Download className="h-4.5 w-4.5" strokeWidth={1.8} />
                반려/수정요청/보류 CSV
              </button>
            </div>
            <button
              type="button"
              onClick={() => window.alert("증빙 파일 다운로드 기능은 추후 연동 예정입니다.")}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
            >
              <FileArchive className="h-4.5 w-4.5" strokeWidth={1.8} />
              증빙 파일 다운로드
            </button>
            <button
              type="button"
              onClick={() => window.alert("회계 마감 처리되었습니다.")}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 shadow-sm transition hover:border-rose-300 hover:bg-rose-100"
            >
              <AlertTriangle className="h-4.5 w-4.5" strokeWidth={1.8} />
              회계 마감 처리
            </button>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {summaryCards.map((card) => (
          <StatCard
            key={card.id}
            title={card.title}
            description={card.description}
            value={
              card.value ?? <span className="text-base font-medium text-slate-400">불러오는 중...</span>
            }
            icon={card.icon}
          />
        ))}
      </section>

      <section className="rounded-[1.75rem] border border-slate-200/90 bg-white p-5 shadow-sm">
        <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-950">자료 탭</h3>
            <p className="mt-1 text-sm text-slate-500">
              세무회계 전달 목적에 맞게 필요한 자료 묶음을 탭별로 나눠 확인할 수 있습니다.
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
