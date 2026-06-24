"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BadgeCheck,
  Ban,
  PauseCircle,
  SearchCheck,
  Users,
  WalletCards,
  X,
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
  AttachmentStatus,
  MonthlySettlementStatus,
  RoleView,
} from "@/types";
import {
  formatSupabaseDate,
  getSingleRelation,
  hasEvidenceAttachment,
  mapDbEvidenceStatus,
  type DbEvidenceStatus,
  type DbExpenseStatus,
  type DbPaymentMethod,
} from "@/utils/expenseRequests";
import { getUserFacingSupabaseMessage } from "@/utils/userFacingError";

const roleViews: RoleView[] = ["직원 보기", "관리자 보기", "대표 보기"];

const settlementStatusOptions = [
  "전체",
  "정산대기",
  "정산확정",
  "지급대기",
  "지급완료",
  "보류",
] as const;

const employeeTableColumns = [
  { key: "employeeName", label: "직원명" },
  { key: "personalExpenseTotal", label: "개인 선지출 합계", align: "right" as const },
  { key: "approvedAmount", label: "승인 금액", align: "right" as const },
  { key: "rejectedAmount", label: "반려 금액", align: "right" as const },
  { key: "missingProofAmount", label: "증빙 누락 금액", align: "right" as const },
  { key: "finalPayoutAmount", label: "최종 지급 예정액", align: "right" as const },
  { key: "payoutStatus", label: "지급 상태", align: "center" as const },
  { key: "detail", label: "상세보기", align: "center" as const },
];

const detailTableColumns = [
  { key: "requestNo", label: "요청번호" },
  { key: "usedDate", label: "사용일" },
  { key: "expenseType", label: "경비 유형" },
  { key: "merchantName", label: "사용처" },
  { key: "amount", label: "금액", align: "right" as const },
  { key: "approvedAmount", label: "승인 금액", align: "right" as const },
  { key: "attachmentStatus", label: "증빙 여부", align: "center" as const },
  { key: "settlementStatus", label: "정산 상태", align: "center" as const },
];

const confirmedSettlementColumns = [
  { key: "employeeName", label: "직원명" },
  { key: "finalPaymentAmount", label: "지급 금액", align: "right" as const },
  { key: "status", label: "지급 상태", align: "center" as const },
  { key: "confirmedAt", label: "정산 확정일", align: "center" as const },
  { key: "paidAt", label: "지급 완료일", align: "center" as const },
  { key: "action", label: "처리", align: "center" as const },
];

type MonthOption = {
  value: string;
  label: string;
};

type RelationValue<T> = T | T[] | null;

type RequesterRelation = {
  id: string;
  name: string;
};

type CategoryRelation = {
  id: string;
  name: string;
};

type SettlementRecordEmployeeRelation = {
  id: string;
  name: string;
};

type SettlementExpenseRow = {
  id: string;
  request_no: string;
  amount: number;
  expense_date: string;
  vendor: string;
  status: DbExpenseStatus;
  settlement_requested: boolean;
  payment_method: DbPaymentMethod;
  evidence_status: DbEvidenceStatus;
  requester: RelationValue<RequesterRelation>;
  category: RelationValue<CategoryRelation>;
};

type MonthlySettlementSummaryValues = {
  employeeCount: number;
  totalPlannedAmount: number;
  paidAmount: number;
  holdAmount: number;
  rejectedAmount: number;
};

type SettlementItemStatus = "confirmed" | "pending_evidence" | "rejected";

type SettlementRecordStatus = "confirmed" | "paid" | "on_hold";

type SettlementDisplayStatus = MonthlySettlementStatus | "정산확정";

type SettlementEmployeeExpense = {
  id: string;
  requestNo: string;
  usedDate: string;
  expenseType: string;
  merchantName: string;
  amount: number;
  approvedAmount: number;
  attachmentStatus: AttachmentStatus;
  settlementStatus: MonthlySettlementStatus;
  settlementItemStatus: SettlementItemStatus;
};

type SettlementEmployee = {
  id: string;
  employeeName: string;
  personalExpenseTotal: number;
  approvedAmount: number;
  rejectedAmount: number;
  missingProofAmount: number;
  finalPayoutAmount: number;
  payoutStatus: MonthlySettlementStatus;
  expenses: SettlementEmployeeExpense[];
};

type MonthlySettlementRecordRow = {
  id: string;
  settlement_month: string;
  employee_id: string;
  total_requested_amount: number;
  approved_amount: number;
  rejected_amount: number;
  pending_evidence_amount: number;
  final_payment_amount: number;
  status: SettlementRecordStatus;
  confirmed_at: string | null;
  paid_at: string | null;
  employee: RelationValue<SettlementRecordEmployeeRelation>;
};

type SettlementItemExpenseRequestRelation = {
  id: string;
  request_no: string;
  amount: number;
  expense_date: string;
  vendor: string;
  evidence_status: DbEvidenceStatus;
  category: RelationValue<CategoryRelation>;
};

type SettlementItemRow = {
  id: string;
  settlement_id: string;
  expense_request_id: string;
  amount: number;
  status: SettlementItemStatus;
  expense_request: RelationValue<SettlementItemExpenseRequestRelation>;
};

type ActionFeedback = {
  type: "success" | "error";
  message: string;
};

type ConfirmedSettlementRow = {
  id: string;
  employeeId: string;
  employeeName: string;
  finalPaymentAmount: number;
  status: SettlementRecordStatus;
  confirmedAt: string | null;
  paidAt: string | null;
};

function createRecentMonthOptions(count = 6): MonthOption[] {
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

function isSettlementPaymentMethod(paymentMethod: DbPaymentMethod) {
  return paymentMethod === "personal_card" || paymentMethod === "cash";
}

function getExpenseSettlementItemStatus(row: SettlementExpenseRow): SettlementItemStatus {
  if (row.status === "rejected") {
    return "rejected";
  }

  if (!hasEvidenceAttachment(row.evidence_status)) {
    return "pending_evidence";
  }

  return "confirmed";
}

function getBaseSettlementStatus(itemStatus: SettlementItemStatus): MonthlySettlementStatus {
  return itemStatus === "confirmed" ? "지급대기" : "보류";
}

function getExpenseSettlementStatus(row: SettlementExpenseRow): MonthlySettlementStatus {
  return getBaseSettlementStatus(getExpenseSettlementItemStatus(row));
}

function getEmployeePayoutStatus(
  employee: Pick<
    SettlementEmployee,
    "approvedAmount" | "missingProofAmount" | "finalPayoutAmount" | "rejectedAmount"
  >,
): MonthlySettlementStatus {
  if (employee.missingProofAmount > 0) {
    return "보류";
  }

  if (employee.finalPayoutAmount > 0) {
    return "지급대기";
  }

  if (employee.rejectedAmount > 0) {
    return "보류";
  }

  return "정산대기";
}

function getSettlementRecordDisplayStatus(
  status: SettlementRecordStatus | null | undefined,
  fallback: MonthlySettlementStatus,
): SettlementDisplayStatus {
  if (status === "paid") {
    return "지급완료";
  }

  if (status === "confirmed") {
    return "정산확정";
  }

  if (status === "on_hold") {
    return "보류";
  }

  return fallback;
}

function getDisplayedEmployeeStatus(
  employee: SettlementEmployee,
  settlementRecord: MonthlySettlementRecordRow | null | undefined,
): SettlementDisplayStatus {
  return getSettlementRecordDisplayStatus(settlementRecord?.status, employee.payoutStatus);
}

function getDisplayedExpenseSettlementStatus(
  expense: SettlementEmployeeExpense,
  settlementRecord: MonthlySettlementRecordRow | null | undefined,
): SettlementDisplayStatus {
  if (!settlementRecord) {
    return expense.settlementStatus;
  }

  if (settlementRecord.status === "paid" && expense.settlementItemStatus === "confirmed") {
    return "지급완료";
  }

  if (settlementRecord.status === "confirmed" && expense.settlementItemStatus === "confirmed") {
    return "정산확정";
  }

  if (settlementRecord.status === "on_hold") {
    return "보류";
  }

  return expense.settlementStatus;
}

function formatSettlementDate(value: string | null | undefined) {
  return formatSupabaseDate(value);
}

function getSettlementRecordMap(rows: MonthlySettlementRecordRow[]) {
  return rows.reduce<Record<string, MonthlySettlementRecordRow>>((result, row) => {
    result[row.employee_id] = row;
    return result;
  }, {});
}

function buildSettlementItemsMap(rows: SettlementItemRow[]) {
  return rows.reduce<Record<string, SettlementEmployeeExpense[]>>((result, row) => {
    const expenseRequest = getSingleRelation(row.expense_request);
    const category = getSingleRelation(expenseRequest?.category ?? null);

    const mappedExpense: SettlementEmployeeExpense = {
      id: row.expense_request_id,
      requestNo: expenseRequest?.request_no ?? "-",
      usedDate: formatSupabaseDate(expenseRequest?.expense_date),
      expenseType: category?.name ?? "기타",
      merchantName: expenseRequest?.vendor ?? "-",
      amount: expenseRequest?.amount ?? row.amount,
      approvedAmount: row.status === "rejected" ? 0 : row.amount,
      attachmentStatus: mapDbEvidenceStatus(expenseRequest?.evidence_status),
      settlementStatus: getBaseSettlementStatus(row.status),
      settlementItemStatus: row.status,
    };

    if (!result[row.settlement_id]) {
      result[row.settlement_id] = [];
    }

    result[row.settlement_id].push(mappedExpense);
    result[row.settlement_id].sort((left, right) => right.usedDate.localeCompare(left.usedDate));

    return result;
  }, {});
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

function buildConfirmedSettlementRows(
  settlementRows: MonthlySettlementRecordRow[],
  employees: SettlementEmployee[],
) {
  const employeeNameById = employees.reduce<Record<string, string>>((result, employee) => {
    result[employee.id] = employee.employeeName;
    return result;
  }, {});

  return settlementRows
    .map<ConfirmedSettlementRow>((row) => ({
      id: row.id,
      employeeId: row.employee_id,
      employeeName:
        getSingleRelation(row.employee)?.name ??
        employeeNameById[row.employee_id] ??
        "미확인 직원",
      finalPaymentAmount: row.final_payment_amount,
      status: row.status,
      confirmedAt: row.confirmed_at,
      paidAt: row.paid_at,
    }))
    .sort((left, right) => {
      const rightValue = right.paidAt ?? right.confirmedAt ?? "";
      const leftValue = left.paidAt ?? left.confirmedAt ?? "";
      return rightValue.localeCompare(leftValue);
    });
}

function buildLiveSettlementEmployees(rows: SettlementExpenseRow[]): SettlementEmployee[] {
  const employeeMap = new Map<string, SettlementEmployee>();

  rows.forEach((row) => {
    const requester = getSingleRelation(row.requester);
    const category = getSingleRelation(row.category);
    const employeeId = requester?.id ?? `unknown-${row.id}`;
    const employeeName = requester?.name ?? "미확인 직원";

    if (!employeeMap.has(employeeId)) {
      employeeMap.set(employeeId, {
        id: employeeId,
        employeeName,
        personalExpenseTotal: 0,
        approvedAmount: 0,
        rejectedAmount: 0,
        missingProofAmount: 0,
        finalPayoutAmount: 0,
        payoutStatus: "정산대기",
        expenses: [],
      });
    }

    const employee = employeeMap.get(employeeId);

    if (!employee) {
      return;
    }

    employee.personalExpenseTotal += row.amount;

    const approvedAmount = row.amount;

    if (row.status === "approved" && hasEvidenceAttachment(row.evidence_status)) {
      employee.approvedAmount += approvedAmount;
      employee.finalPayoutAmount += approvedAmount;
    } else if (row.status === "approved" && !hasEvidenceAttachment(row.evidence_status)) {
      employee.missingProofAmount += approvedAmount;
    } else if (row.status === "rejected") {
      employee.rejectedAmount += row.amount;
    }

    employee.expenses.push({
      id: row.id,
      requestNo: row.request_no,
      usedDate: formatSupabaseDate(row.expense_date),
      expenseType: category?.name ?? "기타",
      merchantName: row.vendor,
      amount: row.amount,
      approvedAmount: row.status === "approved" ? approvedAmount : 0,
      attachmentStatus: mapDbEvidenceStatus(row.evidence_status),
      settlementStatus: getExpenseSettlementStatus(row),
      settlementItemStatus: getExpenseSettlementItemStatus(row),
    });
  });

  return Array.from(employeeMap.values())
    .map((employee) => ({
      ...employee,
      payoutStatus: getEmployeePayoutStatus(employee),
      expenses: [...employee.expenses].sort((left, right) =>
        right.usedDate.localeCompare(left.usedDate),
      ),
    }))
    .sort((left, right) => right.finalPayoutAmount - left.finalPayoutAmount);
}

function createSettlementSnapshotEmployee(
  settlementRecord: MonthlySettlementRecordRow,
  expenses: SettlementEmployeeExpense[],
): SettlementEmployee {
  const employeeName =
    getSingleRelation(settlementRecord.employee)?.name ?? "미확인 직원";

  return {
    id: settlementRecord.employee_id,
    employeeName,
    personalExpenseTotal: settlementRecord.total_requested_amount,
    approvedAmount: settlementRecord.approved_amount,
    rejectedAmount: settlementRecord.rejected_amount,
    missingProofAmount: settlementRecord.pending_evidence_amount,
    finalPayoutAmount: settlementRecord.final_payment_amount,
    payoutStatus: getEmployeePayoutStatus({
      approvedAmount: settlementRecord.approved_amount,
      missingProofAmount: settlementRecord.pending_evidence_amount,
      finalPayoutAmount: settlementRecord.final_payment_amount,
      rejectedAmount: settlementRecord.rejected_amount,
    }),
    expenses,
  };
}

function mergeEmployeesWithSettlementRecords(
  employees: SettlementEmployee[],
  settlementRows: MonthlySettlementRecordRow[],
  settlementItemsBySettlementId: Record<string, SettlementEmployeeExpense[]>,
) {
  const employeeMap = new Map<string, SettlementEmployee>();

  employees.forEach((employee) => {
    employeeMap.set(employee.id, employee);
  });

  settlementRows.forEach((settlementRecord) => {
    const currentEmployee = employeeMap.get(settlementRecord.employee_id);
    const snapshotExpenses =
      settlementItemsBySettlementId[settlementRecord.id] ?? currentEmployee?.expenses ?? [];
    const snapshotEmployee = createSettlementSnapshotEmployee(
      settlementRecord,
      snapshotExpenses,
    );

    employeeMap.set(settlementRecord.employee_id, {
      ...(currentEmployee ?? snapshotEmployee),
      ...snapshotEmployee,
    });
  });

  return Array.from(employeeMap.values()).sort((left, right) => {
    if (right.finalPayoutAmount !== left.finalPayoutAmount) {
      return right.finalPayoutAmount - left.finalPayoutAmount;
    }

    return left.employeeName.localeCompare(right.employeeName, "ko");
  });
}

function buildSummary(
  employees: SettlementEmployee[],
  settlementRows: MonthlySettlementRecordRow[],
): MonthlySettlementSummaryValues {
  const paidAmount = settlementRows
    .filter((row) => row.status === "paid")
    .reduce((total, row) => total + row.final_payment_amount, 0);

  return {
    employeeCount: employees.length,
    totalPlannedAmount: employees.reduce(
      (total, employee) => total + employee.finalPayoutAmount,
      0,
    ),
    paidAmount,
    holdAmount: employees.reduce(
      (total, employee) => total + employee.missingProofAmount,
      0,
    ),
    rejectedAmount: employees.reduce(
      (total, employee) => total + employee.rejectedAmount,
      0,
    ),
  };
}

export default function MonthlySettlementPage() {
  const monthOptions = useMemo(() => createRecentMonthOptions(), []);
  const [selectedMonth, setSelectedMonth] = useState(monthOptions[0]?.value ?? "");
  const [employeeFilter, setEmployeeFilter] = useState("전체");
  const [statusFilter, setStatusFilter] =
    useState<(typeof settlementStatusOptions)[number]>("전체");
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const [employees, setEmployees] = useState<SettlementEmployee[]>([]);
  const [settlementRecords, setSettlementRecords] = useState<
    Record<string, MonthlySettlementRecordRow>
  >({});
  const [settlementItemsBySettlementId, setSettlementItemsBySettlementId] = useState<
    Record<string, SettlementEmployeeExpense[]>
  >({});
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [schemaNotice, setSchemaNotice] = useState<string | null>(null);
  const [actionFeedback, setActionFeedback] = useState<ActionFeedback | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);
  const [payoutTarget, setPayoutTarget] = useState<ConfirmedSettlementRow | null>(null);
  const [isMarkingPaid, setIsMarkingPaid] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadMonthlySettlements() {
      setIsLoading(true);
      setLoadError(null);
      setSchemaNotice(null);
      setActionFeedback(null);

      if (!isSupabaseConfigured) {
        if (!isMounted) {
          return;
        }

        setLoadError(
          "Supabase 환경변수가 설정되지 않았습니다. NEXT_PUBLIC_SUPABASE_URL과 NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY를 확인해주세요.",
        );
        setEmployees([]);
        setSettlementRecords({});
        setSettlementItemsBySettlementId({});
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
              amount,
              expense_date,
              vendor,
              status,
              settlement_requested,
              payment_method,
              evidence_status,
              requester:profiles!expense_requests_user_id_fkey (
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
          .eq("settlement_requested", true)
          .in("payment_method", ["personal_card", "cash"])
          .in("status", ["approved", "rejected"])
          .order("expense_date", { ascending: false });

        if (error) {
          throw error;
        }

        if (!isMounted) {
          return;
        }

        const liveRows = ((data ?? []) as SettlementExpenseRow[]).filter((row) =>
          isSettlementPaymentMethod(row.payment_method),
        );
        const nextEmployees = buildLiveSettlementEmployees(liveRows);

        let settlementRowList: MonthlySettlementRecordRow[] = [];
        let settlementItemsMap: Record<string, SettlementEmployeeExpense[]> = {};

        const { data: settlementData, error: settlementError } = await supabase
          .from("monthly_settlements")
          .select(
            `
              id,
              settlement_month,
              employee_id,
              total_requested_amount,
              approved_amount,
              rejected_amount,
              pending_evidence_amount,
              final_payment_amount,
              status,
              confirmed_at,
              paid_at,
              employee:profiles!monthly_settlements_employee_id_fkey (
                id,
                name
              )
            `,
          )
          .eq("settlement_month", selectedMonth)
          .order("confirmed_at", { ascending: false });

        if (settlementError) {
          if (isSettlementSchemaMissing(settlementError)) {
            setSchemaNotice(
              "월말 정산 확정용 테이블이 아직 없습니다. Supabase SQL Editor에서 supabase/monthly_settlements.sql을 먼저 실행해주세요.",
            );
          } else {
            throw settlementError;
          }
        } else {
          settlementRowList = (settlementData ?? []) as MonthlySettlementRecordRow[];

          if (settlementRowList.length > 0) {
            const settlementIds = settlementRowList.map((row) => row.id);
            const { data: settlementItemsData, error: settlementItemsError } = await supabase
              .from("settlement_items")
              .select(
                `
                  id,
                  settlement_id,
                  expense_request_id,
                  amount,
                  status,
                  expense_request:expense_requests!settlement_items_expense_request_id_fkey (
                    id,
                    request_no,
                    amount,
                    expense_date,
                    vendor,
                    evidence_status,
                    category:expense_categories!expense_requests_category_id_fkey (
                      id,
                      name
                    )
                  )
                `,
              )
              .in("settlement_id", settlementIds);

            if (settlementItemsError) {
              if (isSettlementSchemaMissing(settlementItemsError)) {
                setSchemaNotice(
                  "월말 정산 상세 항목 테이블이 아직 없습니다. Supabase SQL Editor에서 supabase/monthly_settlements.sql을 먼저 실행해주세요.",
                );
              } else {
                throw settlementItemsError;
              }
            } else {
              settlementItemsMap = buildSettlementItemsMap(
                (settlementItemsData ?? []) as SettlementItemRow[],
              );
            }
          }
        }

        setEmployees(nextEmployees);
        setSettlementRecords(getSettlementRecordMap(settlementRowList));
        setSettlementItemsBySettlementId(settlementItemsMap);
      } catch (error) {
        const message = getUserFacingSupabaseMessage(
          error,
          "월말 정산 데이터를 불러오는 중 알 수 없는 오류가 발생했습니다.",
        );

        if (!isMounted) {
          return;
        }

        setLoadError(message);
        setEmployees([]);
        setSettlementRecords({});
        setSettlementItemsBySettlementId({});
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadMonthlySettlements();

    return () => {
      isMounted = false;
    };
  }, [selectedMonth]);

  const selectedMonthLabel =
    monthOptions.find((option) => option.value === selectedMonth)?.label ?? selectedMonth;

  const settlementRecordList = useMemo(
    () => Object.values(settlementRecords),
    [settlementRecords],
  );

  const displayEmployees = useMemo(
    () =>
      mergeEmployeesWithSettlementRecords(
        employees,
        settlementRecordList,
        settlementItemsBySettlementId,
      ),
    [employees, settlementItemsBySettlementId, settlementRecordList],
  );

  const summary = useMemo(
    () => buildSummary(displayEmployees, settlementRecordList),
    [displayEmployees, settlementRecordList],
  );

  const employeeOptions = useMemo(
    () => ["전체", ...displayEmployees.map((employee) => employee.employeeName)],
    [displayEmployees],
  );

  const filteredEmployees = useMemo(() => {
    return displayEmployees.filter((employee) => {
      const matchesEmployee =
        employeeFilter === "전체" || employee.employeeName === employeeFilter;
      const displayStatus = getDisplayedEmployeeStatus(
        employee,
        settlementRecords[employee.id],
      );
      const matchesStatus = statusFilter === "전체" || displayStatus === statusFilter;

      return matchesEmployee && matchesStatus;
    });
  }, [displayEmployees, employeeFilter, settlementRecords, statusFilter]);

  const selectedEmployee = useMemo(
    () => displayEmployees.find((employee) => employee.id === selectedEmployeeId) ?? null,
    [displayEmployees, selectedEmployeeId],
  );

  const selectedSettlementRecord = useMemo(() => {
    if (!selectedEmployee) {
      return null;
    }

    return settlementRecords[selectedEmployee.id] ?? null;
  }, [selectedEmployee, settlementRecords]);

  const confirmedSettlementRows = useMemo(
    () => buildConfirmedSettlementRows(settlementRecordList, displayEmployees),
    [displayEmployees, settlementRecordList],
  );

  async function handleConfirmSettlement() {
    if (!selectedEmployee) {
      return;
    }

    setActionFeedback(null);

    if (!isSupabaseConfigured) {
      setActionFeedback({
        type: "error",
        message:
          "Supabase 환경변수가 설정되지 않았습니다. NEXT_PUBLIC_SUPABASE_URL과 NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY를 확인해주세요.",
      });
      return;
    }

    if (schemaNotice) {
      setActionFeedback({
        type: "error",
        message: schemaNotice,
      });
      return;
    }

    if (selectedEmployee.expenses.length === 0) {
      setActionFeedback({
        type: "error",
        message: "정산 확정 대상 지출 요청이 없습니다.",
      });
      return;
    }

    if (selectedSettlementRecord) {
      setActionFeedback({
        type: "error",
        message: "이미 정산이 확정된 직원입니다. 같은 월에는 중복 확정할 수 없습니다.",
      });
      return;
    }

    setIsConfirming(true);

    try {
      const supabase = getSupabaseBrowserClient();

      const { data: existingSettlement, error: existingSettlementError } = await supabase
        .from("monthly_settlements")
        .select(
          `
            id,
            settlement_month,
            employee_id,
            total_requested_amount,
            approved_amount,
            rejected_amount,
            pending_evidence_amount,
            final_payment_amount,
            status,
            confirmed_at,
            paid_at,
            employee:profiles!monthly_settlements_employee_id_fkey (
              id,
              name
            )
          `,
        )
        .eq("settlement_month", selectedMonth)
        .eq("employee_id", selectedEmployee.id)
        .maybeSingle();

      if (existingSettlementError) {
        throw existingSettlementError;
      }

      if (existingSettlement) {
        const existingRecord = existingSettlement as MonthlySettlementRecordRow;

        setSettlementRecords((current) => ({
          ...current,
          [selectedEmployee.id]: existingRecord,
        }));
        setActionFeedback({
          type: "error",
          message: "이미 정산이 확정된 직원입니다. 같은 월에는 중복 확정할 수 없습니다.",
        });
        return;
      }

      const confirmedAt = new Date().toISOString();
      const { data: settlementData, error: settlementInsertError } = await supabase
        .from("monthly_settlements")
        .insert({
          settlement_month: selectedMonth,
          employee_id: selectedEmployee.id,
          total_requested_amount: selectedEmployee.personalExpenseTotal,
          approved_amount: selectedEmployee.approvedAmount,
          rejected_amount: selectedEmployee.rejectedAmount,
          pending_evidence_amount: selectedEmployee.missingProofAmount,
          final_payment_amount: selectedEmployee.finalPayoutAmount,
          status: "confirmed",
          confirmed_at: confirmedAt,
        })
        .select(
          `
            id,
            settlement_month,
            employee_id,
            total_requested_amount,
            approved_amount,
            rejected_amount,
            pending_evidence_amount,
            final_payment_amount,
            status,
            confirmed_at,
            paid_at,
            employee:profiles!monthly_settlements_employee_id_fkey (
              id,
              name
            )
          `,
        )
        .single();

      if (settlementInsertError) {
        throw settlementInsertError;
      }

      const savedSettlement = settlementData as MonthlySettlementRecordRow;
      const settlementItemsPayload = selectedEmployee.expenses.map((expense) => ({
        settlement_id: savedSettlement.id,
        expense_request_id: expense.id,
        amount: expense.approvedAmount > 0 ? expense.approvedAmount : expense.amount,
        status: expense.settlementItemStatus,
      }));

      if (settlementItemsPayload.length > 0) {
        const { error: settlementItemsError } = await supabase
          .from("settlement_items")
          .insert(settlementItemsPayload);

        if (settlementItemsError) {
          await supabase.from("monthly_settlements").delete().eq("id", savedSettlement.id);
          throw settlementItemsError;
        }
      }

      setSettlementRecords((current) => ({
        ...current,
        [selectedEmployee.id]: savedSettlement,
      }));
      setSettlementItemsBySettlementId((current) => ({
        ...current,
        [savedSettlement.id]: [...selectedEmployee.expenses],
      }));
      setActionFeedback({
        type: "success",
        message: `${selectedEmployee.employeeName}님의 ${selectedMonthLabel} 정산을 확정했습니다.`,
      });
    } catch (error) {
      setActionFeedback({
        type: "error",
        message: isSettlementSchemaMissing(error)
          ? "월말 정산 확정용 테이블이 아직 없습니다. Supabase SQL Editor에서 supabase/monthly_settlements.sql을 먼저 실행해주세요."
          : getUserFacingSupabaseMessage(
              error,
              "월말 정산 확정 중 알 수 없는 오류가 발생했습니다.",
            ),
      });
    } finally {
      setIsConfirming(false);
    }
  }

  function openPayoutConfirmation(target: ConfirmedSettlementRow) {
    setActionFeedback(null);
    setPayoutTarget(target);
  }

  async function handleMarkSettlementPaid() {
    if (!payoutTarget) {
      return;
    }

    setActionFeedback(null);

    if (!isSupabaseConfigured) {
      setActionFeedback({
        type: "error",
        message:
          "Supabase 환경변수가 설정되지 않았습니다. NEXT_PUBLIC_SUPABASE_URL과 NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY를 확인해주세요.",
      });
      return;
    }

    if (payoutTarget.status !== "confirmed") {
      setActionFeedback({
        type: "error",
        message: "지급 완료 처리는 confirmed 상태의 정산에서만 가능합니다.",
      });
      setPayoutTarget(null);
      return;
    }

    setIsMarkingPaid(true);

    try {
      const supabase = getSupabaseBrowserClient();
      const paidAt = new Date().toISOString();

      const { data, error } = await supabase
        .from("monthly_settlements")
        .update({
          status: "paid",
          paid_at: paidAt,
        })
        .eq("id", payoutTarget.id)
        .eq("status", "confirmed")
        .select(
          `
            id,
            settlement_month,
            employee_id,
            total_requested_amount,
            approved_amount,
            rejected_amount,
            pending_evidence_amount,
            final_payment_amount,
            status,
            confirmed_at,
            paid_at,
            employee:profiles!monthly_settlements_employee_id_fkey (
              id,
              name
            )
          `,
        )
        .single();

      if (error) {
        throw error;
      }

      const updatedRecord = data as MonthlySettlementRecordRow;

      setSettlementRecords((current) => ({
        ...current,
        [updatedRecord.employee_id]: updatedRecord,
      }));
      setActionFeedback({
        type: "success",
        message: `${payoutTarget.employeeName}님의 정산을 지급 완료 처리했습니다.`,
      });
      setPayoutTarget(null);
    } catch (error) {
      setActionFeedback({
        type: "error",
        message: getUserFacingSupabaseMessage(
          error,
          "지급 완료 처리 중 알 수 없는 오류가 발생했습니다.",
        ),
      });
    } finally {
      setIsMarkingPaid(false);
    }
  }

  const summaryCards = [
    {
      id: "employee-count",
      title: "정산 대상 직원 수",
      value: isLoading ? null : <span>{summary.employeeCount}명</span>,
      description: "해당 월에 개인 선지출 정산 이력이 있는 직원 수입니다.",
      icon: <Users className="h-5 w-5" strokeWidth={1.8} />,
    },
    {
      id: "total-planned",
      title: "총 정산 예정액",
      value: isLoading ? null : <AmountText value={summary.totalPlannedAmount} />,
      description: "증빙이 갖춰진 승인 완료 개인카드/현금 사용 건 기준 지급 예정 금액입니다.",
      icon: <WalletCards className="h-5 w-5" strokeWidth={1.8} />,
    },
    {
      id: "paid-amount",
      title: "지급 완료액",
      value: isLoading ? null : <AmountText value={summary.paidAmount} />,
      description: "monthly_settlements.status = paid 기준으로 집계한 실제 지급 완료 금액입니다.",
      icon: <BadgeCheck className="h-5 w-5" strokeWidth={1.8} />,
    },
    {
      id: "hold-amount",
      title: "보류 금액",
      value: isLoading ? null : <AmountText value={summary.holdAmount} />,
      description: "증빙이 미첨부된 승인 완료 개인 선지출 금액입니다.",
      icon: <PauseCircle className="h-5 w-5" strokeWidth={1.8} />,
    },
    {
      id: "rejected-amount",
      title: "반려 금액",
      value: isLoading ? null : <AmountText value={summary.rejectedAmount} />,
      description: "정산 대상에서 제외된 rejected 상태 금액입니다.",
      icon: <Ban className="h-5 w-5" strokeWidth={1.8} />,
    },
  ];

  return (
    <div className="space-y-8">
      <PageHeader
        title="월말 정산"
        description="승인 완료된 개인카드/현금 경비를 직원별로 집계해 월말 정산 예정 금액을 확인합니다."
        roles={roleViews}
        activeRole="관리자 보기"
        eyebrow="정산 지급 관리"
        badgeText="개인 선지출 정산 흐름"
      />

      {loadError ? (
        <section className="rounded-[1.75rem] border border-rose-200 bg-rose-50 px-5 py-4 text-sm leading-6 text-rose-700 shadow-sm">
          <p className="font-semibold">월말 정산 데이터를 불러오지 못했습니다.</p>
          <p className="mt-2 whitespace-pre-wrap break-words">{loadError}</p>
        </section>
      ) : null}

      {schemaNotice ? (
        <section className="rounded-[1.75rem] border border-amber-200 bg-amber-50 px-5 py-4 text-sm leading-6 text-amber-800 shadow-sm">
          <p className="font-semibold">정산 확정 테이블이 아직 준비되지 않았습니다.</p>
          <p className="mt-2 whitespace-pre-wrap break-words">{schemaNotice}</p>
        </section>
      ) : null}

      {actionFeedback && !selectedEmployee ? (
        <section
          className={[
            "rounded-[1.75rem] px-5 py-4 text-sm leading-6 shadow-sm",
            actionFeedback.type === "success"
              ? "border border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border border-rose-200 bg-rose-50 text-rose-700",
          ].join(" ")}
        >
          <p className="font-semibold">
            {actionFeedback.type === "success"
              ? "정산 처리 결과가 저장되었습니다."
              : "정산 처리 중 오류가 발생했습니다."}
          </p>
          <p className="mt-2 whitespace-pre-wrap break-words">{actionFeedback.message}</p>
        </section>
      ) : null}

      <section className="rounded-[1.75rem] border border-slate-200/90 bg-[var(--card-secondary)] p-5 shadow-sm">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-950">정산 대상 포함 기준</h3>
            <p className="mt-1 text-sm text-slate-500">
              승인 완료된 개인카드/현금 사용 건만 월말 정산 대상에 포함하고, 증빙이 없는 건은 보류 금액으로
              분리합니다. 법인카드 사용 건은 직원 지급 대상에서 제외합니다.
            </p>
          </div>

          <div className="grid gap-2 sm:grid-cols-3">
            <div className="rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm">
              승인 완료
            </div>
            <div className="rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm">
              개인카드/현금 사용
            </div>
            <div className="rounded-2xl bg-[var(--primary)] px-4 py-3 text-sm font-semibold text-white shadow-sm">
              월말 정산 대상
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-[1.75rem] border border-slate-200/90 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <h3 className="text-lg font-semibold text-slate-950">정산 필터</h3>
              <p className="mt-1 text-sm text-slate-500">
                정산 월, 직원, 상태 기준으로 월말 정산 대상 내역을 빠르게 확인합니다.
              </p>
            </div>
            <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">
              {isLoading ? "데이터를 불러오는 중입니다" : `총 ${filteredEmployees.length}명 표시`}
            </span>
          </div>

          <div className="grid gap-4 xl:grid-cols-[220px_220px_220px]">
            <div>
              <label htmlFor="settlement-month" className="text-sm font-semibold text-slate-900">
                정산 월 선택
              </label>
              <select
                id="settlement-month"
                value={selectedMonth}
                onChange={(event) => {
                  setSelectedMonth(event.target.value);
                  setEmployeeFilter("전체");
                  setStatusFilter("전체");
                  setSelectedEmployeeId("");
                  setPayoutTarget(null);
                }}
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-[var(--primary)] focus:ring-4 focus:ring-[color:rgba(22,59,111,0.08)]"
              >
                {monthOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="settlement-employee" className="text-sm font-semibold text-slate-900">
                직원 선택
              </label>
              <select
                id="settlement-employee"
                value={employeeFilter}
                onChange={(event) => setEmployeeFilter(event.target.value)}
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-[var(--primary)] focus:ring-4 focus:ring-[color:rgba(22,59,111,0.08)]"
              >
                {employeeOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="settlement-status" className="text-sm font-semibold text-slate-900">
                상태 선택
              </label>
              <select
                id="settlement-status"
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(event.target.value as (typeof settlementStatusOptions)[number])
                }
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-[var(--primary)] focus:ring-4 focus:ring-[color:rgba(22,59,111,0.08)]"
              >
                {settlementStatusOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
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
              card.value ?? <span className="text-base font-medium text-slate-400">불러오는 중..</span>
            }
            icon={card.icon}
          />
        ))}
      </section>

      <section className="rounded-[1.75rem] border border-slate-200/90 bg-white p-5 shadow-sm">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-slate-950">직원별 월말 정산 예정 현황</h3>
          <p className="mt-1 text-sm text-slate-500">
            승인 금액, 반려 금액, 증빙 누락 금액, 최종 지급 예정액을 직원 단위로 확인합니다.
          </p>
        </div>

        <DashboardTable columns={employeeTableColumns}>
          {filteredEmployees.map((employee) => {
            const displayStatus = getDisplayedEmployeeStatus(
              employee,
              settlementRecords[employee.id],
            );

            return (
              <tr
                key={employee.id}
                className={[
                  "border-b border-slate-100 last:border-b-0",
                  employee.payoutStatus === "보류" ? "bg-amber-50/40" : "",
                ].join(" ")}
              >
                <td className="px-4 py-4 font-medium text-slate-900">{employee.employeeName}</td>
                <td className="px-4 py-4 text-right text-slate-700">
                  <AmountText value={employee.personalExpenseTotal} />
                </td>
                <td className="px-4 py-4 text-right font-medium text-slate-900">
                  <AmountText value={employee.approvedAmount} />
                </td>
                <td className="px-4 py-4 text-right text-rose-700">
                  <AmountText value={employee.rejectedAmount} />
                </td>
                <td
                  className={[
                    "px-4 py-4 text-right font-medium",
                    employee.missingProofAmount > 0 ? "text-amber-700" : "text-slate-500",
                  ].join(" ")}
                >
                  <AmountText value={employee.missingProofAmount} />
                </td>
                <td className="px-4 py-4 text-right font-semibold text-[var(--primary)]">
                  <AmountText value={employee.finalPayoutAmount} />
                </td>
                <td className="px-4 py-4 text-center">
                  <StatusBadge status={displayStatus} />
                </td>
                <td className="px-4 py-4 text-center">
                  <button
                    type="button"
                    onClick={() => setSelectedEmployeeId(employee.id)}
                    className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
                  >
                    상세보기
                  </button>
                </td>
              </tr>
            );
          })}
        </DashboardTable>

        {isLoading ? (
          <EmptyState
            title="직원별 정산 대상 내역을 불러오는 중입니다."
            description="선택한 월의 expense_requests와 monthly_settlements를 함께 조회하고 있습니다."
          />
        ) : null}

        {!isLoading && filteredEmployees.length === 0 ? (
          <EmptyState
            title="조건에 맞는 정산 대상이 없습니다."
            description="정산 월, 직원, 상태 필터를 조정해서 다른 정산 내역을 확인해보세요."
          />
        ) : null}

        <div className="mt-5 rounded-2xl border border-sky-100 bg-sky-50 px-4 py-4 text-sm leading-6 text-sky-800">
          승인 완료된 개인카드/현금 사용 건만 월말 정산 대상에 포함됩니다. 증빙이 미첨부된 건은 보류 금액으로
          분류되며, 법인카드 사용 건은 직원 지급 대상이 아닙니다.
        </div>
      </section>

      <section className="rounded-[1.75rem] border border-slate-200/90 bg-white p-5 shadow-sm">
        <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-950">확정된 정산 목록</h3>
            <p className="mt-1 text-sm text-slate-500">
              선택한 월의 정산 확정/지급 완료 상태를 확인하고, confirmed 상태만 지급 완료 처리할 수 있습니다.
            </p>
          </div>
          <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">
            {isLoading ? "데이터를 불러오는 중입니다" : `총 ${confirmedSettlementRows.length}건`}
          </span>
        </div>

        <DashboardTable columns={confirmedSettlementColumns}>
          {confirmedSettlementRows.map((row) => (
            <tr key={row.id} className="border-b border-slate-100 last:border-b-0">
              <td className="px-4 py-4 font-medium text-slate-900">{row.employeeName}</td>
              <td className="px-4 py-4 text-right font-medium text-slate-900">
                <AmountText value={row.finalPaymentAmount} />
              </td>
              <td className="px-4 py-4 text-center">
                <StatusBadge
                  status={getSettlementRecordDisplayStatus(row.status, "정산대기")}
                />
              </td>
              <td className="px-4 py-4 text-center text-slate-500">
                {formatSettlementDate(row.confirmedAt)}
              </td>
              <td className="px-4 py-4 text-center text-slate-500">
                {row.paidAt ? formatSettlementDate(row.paidAt) : "-"}
              </td>
              <td className="px-4 py-4 text-center">
                <button
                  type="button"
                  onClick={() => openPayoutConfirmation(row)}
                  disabled={row.status !== "confirmed"}
                  className={[
                    "inline-flex items-center justify-center rounded-xl px-3 py-2 text-xs font-semibold shadow-sm transition",
                    row.status === "confirmed"
                      ? "border border-emerald-200 bg-emerald-50 text-emerald-700 hover:border-emerald-300 hover:bg-emerald-100"
                      : "cursor-not-allowed border border-slate-200 bg-slate-100 text-slate-400",
                  ].join(" ")}
                >
                  {row.status === "paid" ? "지급 완료됨" : "지급 완료 처리"}
                </button>
              </td>
            </tr>
          ))}
        </DashboardTable>

        {isLoading ? (
          <EmptyState
            title="확정된 정산 목록을 불러오는 중입니다."
            description="선택한 월의 monthly_settlements 상태를 확인하고 있습니다."
          />
        ) : null}

        {!isLoading && confirmedSettlementRows.length === 0 ? (
          <EmptyState
            title="확정된 정산 내역이 없습니다."
            description="직원별 월말 정산 예정 현황에서 먼저 정산 확정을 진행해보세요."
          />
        ) : null}
      </section>

      {selectedEmployee ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4 py-8">
          <div className="w-full max-w-6xl rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-slate-500">{selectedMonthLabel} 정산 상세</p>
                <div className="mt-2 flex flex-wrap items-center gap-3">
                  <h3 className="text-2xl font-semibold text-slate-950">
                    {selectedEmployee.employeeName}
                  </h3>
                  <StatusBadge
                    status={getDisplayedEmployeeStatus(selectedEmployee, selectedSettlementRecord)}
                  />
                </div>
                <p className="mt-2 text-sm text-slate-500">
                  {selectedSettlementRecord
                    ? "확정된 정산 스냅샷 기준으로 포함된 지출 요청 목록을 표시합니다."
                    : "실시간 expense_requests 기준으로 월말 정산 대상 지출 요청을 표시합니다."}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedEmployeeId("")}
                className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 text-slate-500 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-700"
                aria-label="닫기"
              >
                <X className="h-4.5 w-4.5" strokeWidth={1.9} />
              </button>
            </div>

            {selectedSettlementRecord ? (
              <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm leading-6 text-emerald-800">
                <p className="font-semibold">이미 정산이 확정된 내역입니다.</p>
                <p className="mt-1">확정일: {formatSettlementDate(selectedSettlementRecord.confirmed_at)}</p>
                {selectedSettlementRecord.paid_at ? (
                  <p className="mt-1">
                    지급 완료일: {formatSettlementDate(selectedSettlementRecord.paid_at)}
                  </p>
                ) : null}
                <p className="mt-1">
                  지급 완료된 정산은 다시 수정하지 못하며, 같은 월에는 중복 확정도 허용되지 않습니다.
                </p>
              </div>
            ) : null}

            <div className="mt-6 grid gap-3 md:grid-cols-5">
              <div className="rounded-2xl bg-slate-50 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                  개인 선지출
                </p>
                <p className="mt-2 text-sm font-semibold text-slate-900">
                  <AmountText value={selectedEmployee.personalExpenseTotal} />
                </p>
              </div>
              <div className="rounded-2xl bg-slate-50 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                  승인 금액
                </p>
                <p className="mt-2 text-sm font-semibold text-slate-900">
                  <AmountText value={selectedEmployee.approvedAmount} />
                </p>
              </div>
              <div className="rounded-2xl bg-slate-50 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                  반려 금액
                </p>
                <p className="mt-2 text-sm font-semibold text-rose-700">
                  <AmountText value={selectedEmployee.rejectedAmount} />
                </p>
              </div>
              <div className="rounded-2xl bg-slate-50 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                  증빙 누락
                </p>
                <p className="mt-2 text-sm font-semibold text-amber-700">
                  <AmountText value={selectedEmployee.missingProofAmount} />
                </p>
              </div>
              <div className="rounded-2xl bg-slate-50 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                  최종 지급 예정액
                </p>
                <p className="mt-2 text-sm font-semibold text-[var(--primary)]">
                  <AmountText value={selectedEmployee.finalPayoutAmount} />
                </p>
              </div>
            </div>

            <div className="mt-6">
              <DashboardTable columns={detailTableColumns}>
                {selectedEmployee.expenses.map((expense) => (
                  <tr
                    key={expense.id}
                    className={[
                      "border-b border-slate-100 last:border-b-0",
                      expense.attachmentStatus === "미첨부" ? "bg-amber-50/35" : "",
                    ].join(" ")}
                  >
                    <td className="px-4 py-4 text-slate-600">{expense.requestNo}</td>
                    <td className="px-4 py-4 text-slate-500">
                      <time dateTime={expense.usedDate}>{expense.usedDate}</time>
                    </td>
                    <td className="px-4 py-4 text-slate-900">{expense.expenseType}</td>
                    <td className="px-4 py-4 text-slate-600">{expense.merchantName}</td>
                    <td className="px-4 py-4 text-right text-slate-700">
                      <AmountText value={expense.amount} />
                    </td>
                    <td className="px-4 py-4 text-right font-medium text-slate-900">
                      <AmountText value={expense.approvedAmount} />
                    </td>
                    <td className="px-4 py-4 text-center">
                      <StatusBadge status={expense.attachmentStatus} />
                    </td>
                    <td className="px-4 py-4 text-center">
                      <StatusBadge
                        status={getDisplayedExpenseSettlementStatus(
                          expense,
                          selectedSettlementRecord,
                        )}
                      />
                    </td>
                  </tr>
                ))}
              </DashboardTable>

              {selectedEmployee.expenses.length === 0 ? (
                <EmptyState
                  title="표시할 정산 상세 내역이 없습니다."
                  description="선택한 직원의 월말 정산 포함 지출 요청이 없습니다."
                />
              ) : null}
            </div>

            {actionFeedback ? (
              <div
                className={[
                  "mt-6 rounded-2xl px-4 py-4 text-sm leading-6 shadow-sm",
                  actionFeedback.type === "success"
                    ? "border border-emerald-200 bg-emerald-50 text-emerald-800"
                    : "border border-rose-200 bg-rose-50 text-rose-700",
                ].join(" ")}
              >
                <p className="font-semibold">
                  {actionFeedback.type === "success"
                    ? "정산 처리 결과가 저장되었습니다."
                    : "정산 처리 중 오류가 발생했습니다."}
                </p>
                <p className="mt-1 whitespace-pre-wrap break-words">{actionFeedback.message}</p>
              </div>
            ) : null}

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => {
                  void handleConfirmSettlement();
                }}
                disabled={
                  isConfirming ||
                  Boolean(selectedSettlementRecord) ||
                  Boolean(schemaNotice) ||
                  selectedEmployee.expenses.length === 0
                }
                className={[
                  "inline-flex items-center justify-center rounded-2xl border px-4 py-3 text-sm font-semibold shadow-sm transition",
                  isConfirming ||
                  selectedSettlementRecord ||
                  schemaNotice ||
                  selectedEmployee.expenses.length === 0
                    ? "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400"
                    : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50",
                ].join(" ")}
              >
                {selectedSettlementRecord
                  ? "정산 확정 완료"
                  : isConfirming
                    ? "정산 확정 중.."
                    : "정산 확정"}
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!selectedSettlementRecord) {
                    return;
                  }

                  openPayoutConfirmation({
                    id: selectedSettlementRecord.id,
                    employeeId: selectedEmployee.id,
                    employeeName: selectedEmployee.employeeName,
                    finalPaymentAmount: selectedSettlementRecord.final_payment_amount,
                    status: selectedSettlementRecord.status,
                    confirmedAt: selectedSettlementRecord.confirmed_at,
                    paidAt: selectedSettlementRecord.paid_at,
                  });
                }}
                disabled={selectedSettlementRecord?.status !== "confirmed"}
                className={[
                  "inline-flex items-center justify-center rounded-2xl px-4 py-3 text-sm font-semibold shadow-sm transition",
                  selectedSettlementRecord?.status === "confirmed"
                    ? "border border-emerald-200 bg-emerald-50 text-emerald-700 hover:border-emerald-300 hover:bg-emerald-100"
                    : "cursor-not-allowed border border-slate-200 bg-slate-100 text-slate-400",
                ].join(" ")}
              >
                {selectedSettlementRecord?.status === "paid"
                  ? "지급 완료됨"
                  : "지급 완료 처리"}
              </button>
              <button
                type="button"
                onClick={() =>
                  window.alert("엑셀 다운로드 기능은 추후 연동 예정입니다.")
                }
                className="inline-flex items-center justify-center rounded-2xl bg-[var(--primary)] px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:opacity-95"
              >
                엑셀 다운로드
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {payoutTarget ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/55 px-4 py-8">
          <div className="w-full max-w-xl rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-slate-500">{selectedMonthLabel} 지급 완료 확인</p>
                <h3 className="mt-2 text-2xl font-semibold text-slate-950">
                  지급 완료 처리하시겠습니까?
                </h3>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  실제 은행 송금 기능은 연결하지 않고, 관리자가 수동으로 지급 완료 상태만 기록합니다.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPayoutTarget(null)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 text-slate-500 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-700"
                aria-label="닫기"
              >
                <X className="h-4.5 w-4.5" strokeWidth={1.9} />
              </button>
            </div>

            <div className="mt-6 grid gap-3 rounded-2xl bg-slate-50 p-4 md:grid-cols-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                  직원명
                </p>
                <p className="mt-2 text-sm font-semibold text-slate-900">
                  {payoutTarget.employeeName}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                  지급 금액
                </p>
                <p className="mt-2 text-sm font-semibold text-slate-900">
                  <AmountText value={payoutTarget.finalPaymentAmount} />
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                  정산 확정일
                </p>
                <p className="mt-2 text-sm text-slate-600">
                  {formatSettlementDate(payoutTarget.confirmedAt)}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                  현재 상태
                </p>
                <div className="mt-2">
                  <StatusBadge
                    status={getSettlementRecordDisplayStatus(payoutTarget.status, "정산대기")}
                  />
                </div>
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setPayoutTarget(null)}
                className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
              >
                취소
              </button>
              <button
                type="button"
                onClick={() => {
                  void handleMarkSettlementPaid();
                }}
                disabled={isMarkingPaid || payoutTarget.status !== "confirmed"}
                className={[
                  "inline-flex items-center justify-center rounded-2xl px-4 py-3 text-sm font-semibold shadow-sm transition",
                  isMarkingPaid || payoutTarget.status !== "confirmed"
                    ? "cursor-not-allowed border border-slate-200 bg-slate-100 text-slate-400"
                    : "border border-emerald-200 bg-emerald-50 text-emerald-700 hover:border-emerald-300 hover:bg-emerald-100",
                ].join(" ")}
              >
                {isMarkingPaid ? "지급 완료 처리 중.." : "지급 완료 처리"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <section className="rounded-[1.75rem] border border-slate-200/90 bg-white p-5 shadow-sm">
        <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm leading-6 text-slate-600">
          <SearchCheck className="mt-0.5 h-5 w-5 shrink-0 text-[var(--primary)]" strokeWidth={1.9} />
          <p>
            현재 화면은 <code className="mx-1 rounded bg-white px-1.5 py-0.5 text-xs">expense_requests</code>
            실데이터를 기준으로 월말 정산을 계산하고, <code className="mx-1 rounded bg-white px-1.5 py-0.5 text-xs">monthly_settlements</code>
            와 <code className="mx-1 rounded bg-white px-1.5 py-0.5 text-xs">settlement_items</code>
            에 정산 확정 결과를 저장합니다. 지급 완료 처리는 수동 상태 업데이트 방식으로만 연결되어 있으며,
            실제 계좌이체 기능은 포함하지 않습니다.
          </p>
        </div>
      </section>
    </div>
  );
}
