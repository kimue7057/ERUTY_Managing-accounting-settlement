import type {
  DbExpenseStatus,
  DbPaymentMethod,
} from "@/utils/expenseRequests";

export type DbFundType =
  | "operating_account"
  | "grant_account"
  | "corporate_card_account"
  | "reserve_fund"
  | "other";

export type DbFundStatus = "active" | "inactive";

export type DbFundTransactionType =
  | "deposit"
  | "withdrawal"
  | "transfer"
  | "adjustment";

export type FundAdjustmentDirection = "increase" | "decrease";

type FundBalanceSource = {
  current_balance: number;
  status: DbFundStatus;
};

type ApprovedExpenseSource = {
  id: string;
  amount: number;
  status: DbExpenseStatus;
  settlement_requested: boolean;
  payment_method: DbPaymentMethod;
};

export function mapFundTypeLabel(fundType: DbFundType) {
  switch (fundType) {
    case "operating_account":
      return "운영비 계좌";
    case "grant_account":
      return "정부지원금 계좌";
    case "corporate_card_account":
      return "법인카드 결제 계좌";
    case "reserve_fund":
      return "예비비";
    case "other":
    default:
      return "기타 자금";
  }
}

export function mapFundStatusLabel(status: DbFundStatus) {
  return status === "active" ? "활성" : "비활성";
}

export function mapFundTransactionTypeLabel(transactionType: DbFundTransactionType) {
  switch (transactionType) {
    case "deposit":
      return "입금";
    case "withdrawal":
      return "출금";
    case "transfer":
      return "이체";
    case "adjustment":
    default:
      return "조정";
  }
}

export function getFundTransactionDelta({
  transactionType,
  amount,
  adjustmentDirection = "increase",
}: {
  transactionType: DbFundTransactionType;
  amount: number;
  adjustmentDirection?: FundAdjustmentDirection;
}) {
  const normalizedAmount = Math.abs(amount);

  switch (transactionType) {
    case "deposit":
      return normalizedAmount;
    case "withdrawal":
    case "transfer":
      return normalizedAmount * -1;
    case "adjustment":
    default:
      return adjustmentDirection === "decrease"
        ? normalizedAmount * -1
        : normalizedAmount;
  }
}

export function isFundSchemaMissing(error: unknown) {
  if (!(typeof error === "object" && error !== null && "message" in error)) {
    return false;
  }

  const message =
    typeof error.message === "string" ? error.message.toLowerCase().trim() : "";

  return (
    /(company_funds|fund_transactions)/i.test(message) &&
    /(does not exist|schema cache|could not find)/i.test(message)
  );
}

export function isSettlementSchemaMissing(error: unknown) {
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

export function isFundTransactionRpcMissing(error: unknown) {
  if (!(typeof error === "object" && error !== null && "message" in error)) {
    return false;
  }

  const message =
    typeof error.message === "string" ? error.message.toLowerCase().trim() : "";

  return (
    /create_fund_transaction/i.test(message) &&
    /(does not exist|schema cache|could not find)/i.test(message)
  );
}

export function calculateFundOverview({
  funds,
  approvedExpenses,
  handledExpenseRequestIds,
  confirmedSettlementAmount = 0,
}: {
  funds: FundBalanceSource[];
  approvedExpenses: ApprovedExpenseSource[];
  handledExpenseRequestIds: Set<string>;
  confirmedSettlementAmount?: number;
}) {
  const totalFunds = funds
    .filter((fund) => fund.status === "active")
    .reduce((sum, fund) => sum + fund.current_balance, 0);

  const pendingApprovedExpenses = approvedExpenses.filter(
    (expense) => expense.status === "approved" && !handledExpenseRequestIds.has(expense.id),
  );

  const settlementPendingAmount = Math.max(confirmedSettlementAmount, 0);

  const approvedExpensePendingAmount = pendingApprovedExpenses
    .filter(
      (expense) =>
        !expense.settlement_requested ||
        (expense.payment_method !== "personal_card" && expense.payment_method !== "cash"),
    )
    .reduce((sum, expense) => sum + expense.amount, 0);

  return {
    totalFunds,
    approvedExpensePendingAmount,
    settlementPendingAmount,
    availableFunds:
      totalFunds - approvedExpensePendingAmount - settlementPendingAmount,
  };
}
