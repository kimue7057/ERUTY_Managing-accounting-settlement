import type { BudgetHealthStatus } from "@/types";

export type DbProjectBudgetStatus = "normal" | "warning" | "at_risk" | "over";
export type DbProjectBudgetLogType = "approval_applied";

export function toBudgetNumber(value: number | string | null | undefined) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

export function getApprovedExpenseAmount(row: {
  amount: number;
  approved_amount?: number | string | null;
}) {
  if (row.approved_amount === null || row.approved_amount === undefined || row.approved_amount === "") {
    return row.amount;
  }

  return toBudgetNumber(row.approved_amount);
}

export function getBudgetUsageRate(budgetAmount: number, usedAmount: number) {
  if (budgetAmount <= 0) {
    return 0;
  }

  return Math.round((usedAmount / budgetAmount) * 100);
}

export function getBudgetHealthStatus(usageRate: number): BudgetHealthStatus {
  if (usageRate >= 100) {
    return "초과";
  }

  if (usageRate >= 80) {
    return "초과위험";
  }

  if (usageRate >= 60) {
    return "주의";
  }

  return "정상";
}

export function mapBudgetHealthStatusToDb(status: BudgetHealthStatus): DbProjectBudgetStatus {
  switch (status) {
    case "주의":
      return "warning";
    case "초과위험":
      return "at_risk";
    case "초과":
      return "over";
    case "정상":
    default:
      return "normal";
  }
}

export function getBudgetHealthProgressTone(status: BudgetHealthStatus) {
  switch (status) {
    case "주의":
      return "warning" as const;
    case "초과위험":
      return "risk" as const;
    case "초과":
      return "danger" as const;
    case "정상":
    default:
      return "success" as const;
  }
}

export function getBudgetHealthBadgeClassName(status: BudgetHealthStatus) {
  switch (status) {
    case "주의":
      return "border-amber-200 bg-amber-50 text-amber-700";
    case "초과위험":
      return "border-orange-200 bg-orange-50 text-orange-700";
    case "초과":
      return "border-rose-200 bg-rose-50 text-rose-700";
    case "정상":
    default:
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }
}

export function calculateProjectBudgetMetrics(
  budgetAmount: number | string | null | undefined,
  usedAmount: number | string | null | undefined,
) {
  const normalizedBudgetAmount = Math.max(toBudgetNumber(budgetAmount), 0);
  const normalizedUsedAmount = Math.max(toBudgetNumber(usedAmount), 0);
  const remainingAmount = normalizedBudgetAmount - normalizedUsedAmount;
  const usageRate = getBudgetUsageRate(normalizedBudgetAmount, normalizedUsedAmount);
  const status = getBudgetHealthStatus(usageRate);

  return {
    budgetAmount: normalizedBudgetAmount,
    usedAmount: normalizedUsedAmount,
    remainingAmount,
    usageRate,
    status,
    budgetConfigured: normalizedBudgetAmount > 0,
  };
}
