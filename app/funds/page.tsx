"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BadgeCheck,
  Building2,
  CreditCard,
  Landmark,
  PencilLine,
  Plus,
  Power,
  RefreshCw,
  WalletCards,
  X,
} from "lucide-react";

import { AmountText } from "@/components/common/AmountText";
import { DashboardTable } from "@/components/common/DashboardTable";
import { EmptyState } from "@/components/common/EmptyState";
import { PageHeader } from "@/components/common/PageHeader";
import { StatCard } from "@/components/common/StatCard";
import { StatusBadge } from "@/components/common/StatusBadge";
import { roleViews } from "@/data/uiOptions";
import {
  getSupabaseBrowserClient,
  isSupabaseConfigured,
} from "@/lib/supabase/client";
import {
  formatSupabaseDate,
  getSingleRelation,
  type DbExpenseStatus,
  type DbPaymentMethod,
} from "@/utils/expenseRequests";
import {
  calculateFundOverview,
  isFundSchemaMissing,
  isSettlementSchemaMissing,
  mapFundStatusLabel,
  mapFundTransactionTypeLabel,
  mapFundTypeLabel,
  type DbFundStatus,
  type DbFundTransactionType,
  type DbFundType,
  type FundAdjustmentDirection,
} from "@/utils/funds";
import { formatKrw } from "@/utils/format";
import { getUserFacingSupabaseMessage } from "@/utils/userFacingError";

type RelationValue<T> = T | T[] | null;

type SettlementRecordStatus = "confirmed" | "paid" | "on_hold";

type MonthlySettlementRow = {
  id: string;
  final_payment_amount: number;
  status: SettlementRecordStatus;
};

type CompanyFundRow = {
  id: string;
  name: string;
  fund_type: DbFundType;
  current_balance: number;
  description: string;
  status: DbFundStatus;
  created_at: string;
  updated_at: string;
};

type ApprovedExpenseRow = {
  id: string;
  amount: number;
  status: DbExpenseStatus;
  settlement_requested: boolean;
  payment_method: DbPaymentMethod;
};

type SettlementStatusRelation = {
  status: SettlementRecordStatus;
};

type SettlementItemRow = {
  expense_request_id: string;
  settlement: RelationValue<SettlementStatusRelation>;
};

type ExpenseRequestOption = {
  id: string;
  request_no: string;
  title: string;
};

type FundRelation = {
  id: string;
  name: string;
  current_balance: number;
  status: DbFundStatus;
};

type RelatedRequestRelation = {
  id: string;
  request_no: string;
  title: string;
};

type FundTransactionRow = {
  id: string;
  fund_id: string;
  transaction_type: DbFundTransactionType;
  amount: number;
  title: string;
  description: string;
  transaction_date: string;
  related_expense_request_id: string | null;
  created_at: string;
  fund: RelationValue<FundRelation>;
  related_request: RelationValue<RelatedRequestRelation>;
};

type FeedbackState = {
  type: "success" | "error";
  message: string;
};

type FundFormState = {
  name: string;
  fundType: DbFundType;
  currentBalance: string;
  description: string;
};

type TransactionFormState = {
  fundId: string;
  transactionType: DbFundTransactionType;
  adjustmentDirection: FundAdjustmentDirection;
  amount: string;
  title: string;
  description: string;
  transactionDate: string;
  relatedExpenseRequestId: string;
};

const fundCardColumns = [
  { key: "transactionDate", label: "거래일" },
  { key: "fundName", label: "자금 항목" },
  { key: "transactionType", label: "구분", align: "center" as const },
  { key: "title", label: "제목" },
  { key: "amount", label: "금액", align: "right" as const },
  { key: "currentBalance", label: "현재 잔액", align: "right" as const },
  { key: "requestNumber", label: "연결 요청번호", align: "center" as const },
];

const fundTypeOptions: Array<{ value: DbFundType; label: string }> = [
  { value: "operating_account", label: "운영비 계좌" },
  { value: "grant_account", label: "정부지원금 계좌" },
  { value: "corporate_card_account", label: "법인카드 결제 계좌" },
  { value: "reserve_fund", label: "예비비" },
  { value: "other", label: "기타 자금" },
];

const transactionTypeOptions: Array<{ value: DbFundTransactionType; label: string }> = [
  { value: "deposit", label: "입금" },
  { value: "withdrawal", label: "출금" },
  { value: "transfer", label: "이체" },
  { value: "adjustment", label: "조정" },
];

function getTodayDateValue() {
  return new Date().toISOString().slice(0, 10);
}

function getCurrentMonthKey() {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
  }).format(new Date());
}

function getMonthKeyFromDate(dateValue: string) {
  return dateValue.slice(0, 7);
}

function createFundFormState(fund?: CompanyFundRow): FundFormState {
  return {
    name: fund?.name ?? "",
    fundType: fund?.fund_type ?? "operating_account",
    currentBalance: fund ? String(fund.current_balance) : "0",
    description: fund?.description ?? "",
  };
}

function createTransactionFormState(defaultFundId = ""): TransactionFormState {
  return {
    fundId: defaultFundId,
    transactionType: "deposit",
    adjustmentDirection: "increase",
    amount: "",
    title: "",
    description: "",
    transactionDate: getTodayDateValue(),
    relatedExpenseRequestId: "",
  };
}

function formatTransactionAmount(value: number) {
  const sign = value > 0 ? "+" : value < 0 ? "-" : "";
  return `${sign}${formatKrw(Math.abs(value))}`;
}

function getTransactionAmountTone(value: number) {
  if (value > 0) {
    return "text-sky-700";
  }

  if (value < 0) {
    return "text-rose-700";
  }

  return "text-slate-600";
}

function TransactionTypeBadge({ type }: { type: DbFundTransactionType }) {
  const label = mapFundTransactionTypeLabel(type);
  const tone =
    type === "deposit"
      ? "border-sky-200 bg-sky-50 text-sky-700"
      : type === "withdrawal"
        ? "border-rose-200 bg-rose-50 text-rose-700"
        : type === "transfer"
          ? "border-amber-200 bg-amber-50 text-amber-700"
          : "border-slate-200 bg-slate-100 text-slate-600";

  return (
    <span
      className={[
        "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold",
        tone,
      ].join(" ")}
    >
      {label}
    </span>
  );
}

export default function FundsPage() {
  const [funds, setFunds] = useState<CompanyFundRow[]>([]);
  const [transactions, setTransactions] = useState<FundTransactionRow[]>([]);
  const [approvedExpenses, setApprovedExpenses] = useState<ApprovedExpenseRow[]>([]);
  const [monthlySettlements, setMonthlySettlements] = useState<MonthlySettlementRow[]>([]);
  const [settlementItems, setSettlementItems] = useState<SettlementItemRow[]>([]);
  const [expenseRequestOptions, setExpenseRequestOptions] = useState<ExpenseRequestOption[]>([]);
  const [selectedFundFilter, setSelectedFundFilter] = useState("전체");
  const [selectedTransactionTypeFilter, setSelectedTransactionTypeFilter] = useState("전체");
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [schemaNotice, setSchemaNotice] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const [isFundModalOpen, setIsFundModalOpen] = useState(false);
  const [fundModalTarget, setFundModalTarget] = useState<CompanyFundRow | null>(null);
  const [fundForm, setFundForm] = useState<FundFormState>(createFundFormState());
  const [fundFormError, setFundFormError] = useState<string | null>(null);
  const [isFundSaving, setIsFundSaving] = useState(false);

  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
  const [transactionForm, setTransactionForm] = useState<TransactionFormState>(
    createTransactionFormState(),
  );
  const [transactionFormError, setTransactionFormError] = useState<string | null>(null);
  const [isTransactionSaving, setIsTransactionSaving] = useState(false);
  const [isDeactivatingFundId, setIsDeactivatingFundId] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadFundsData() {
      setIsLoading(true);
      setLoadError(null);
      setSchemaNotice(null);

      if (!isSupabaseConfigured) {
        if (!isMounted) {
          return;
        }

        setLoadError(
          "Supabase 환경변수가 설정되지 않았습니다. NEXT_PUBLIC_SUPABASE_URL과 NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY를 확인해주세요.",
        );
        setFunds([]);
        setTransactions([]);
        setApprovedExpenses([]);
        setMonthlySettlements([]);
        setSettlementItems([]);
        setExpenseRequestOptions([]);
        setIsLoading(false);
        return;
      }

      try {
        const supabase = getSupabaseBrowserClient();

        const [
          fundsResult,
          transactionsResult,
          approvedExpensesResult,
          monthlySettlementsResult,
          settlementItemsResult,
          expenseRequestOptionsResult,
        ] = await Promise.all([
          supabase
            .from("company_funds")
            .select(
              `
                id,
                name,
                fund_type,
                current_balance,
                description,
                status,
                created_at,
                updated_at
              `,
            )
            .order("created_at", { ascending: true }),
          supabase
            .from("fund_transactions")
            .select(
              `
                id,
                fund_id,
                transaction_type,
                amount,
                title,
                description,
                transaction_date,
                related_expense_request_id,
                created_at,
                fund:company_funds!fund_transactions_fund_id_fkey (
                  id,
                  name,
                  current_balance,
                  status
                ),
                related_request:expense_requests!fund_transactions_related_expense_request_id_fkey (
                  id,
                  request_no,
                  title
                )
              `,
            )
            .order("transaction_date", { ascending: false })
            .order("created_at", { ascending: false }),
          supabase
            .from("expense_requests")
            .select("id, amount, status, settlement_requested, payment_method")
            .eq("status", "approved"),
          supabase
            .from("monthly_settlements")
            .select("id, final_payment_amount, status")
            .in("status", ["confirmed", "paid"]),
          supabase
            .from("settlement_items")
            .select(
              `
                expense_request_id,
                settlement:monthly_settlements!settlement_items_settlement_id_fkey (
                  status
                )
              `,
            ),
          supabase
            .from("expense_requests")
            .select("id, request_no, title")
            .order("requested_at", { ascending: false })
            .limit(200),
        ]);

        const possibleSchemaErrors = [
          fundsResult.error,
          transactionsResult.error,
        ].filter(Boolean);

        const fundSchemaError = possibleSchemaErrors.find((error) =>
          isFundSchemaMissing(error),
        );

        if (fundSchemaError) {
          throw fundSchemaError;
        }

        if (fundsResult.error) {
          throw fundsResult.error;
        }

        if (transactionsResult.error) {
          throw transactionsResult.error;
        }

        if (approvedExpensesResult.error) {
          throw approvedExpensesResult.error;
        }

        const settlementSchemaError = [monthlySettlementsResult.error, settlementItemsResult.error]
          .find((error) => error && isSettlementSchemaMissing(error)) ?? null;

        if (
          monthlySettlementsResult.error &&
          !isSettlementSchemaMissing(monthlySettlementsResult.error)
        ) {
          throw monthlySettlementsResult.error;
        }

        if (
          settlementItemsResult.error &&
          !isSettlementSchemaMissing(settlementItemsResult.error)
        ) {
          throw settlementItemsResult.error;
        }

        const normalizedSettlementSchemaError =
          settlementSchemaError && isSettlementSchemaMissing(settlementSchemaError)
            ? settlementSchemaError
            : null;

        if (expenseRequestOptionsResult.error) {
          throw expenseRequestOptionsResult.error;
        }

        if (!isMounted) {
          return;
        }

        setFunds((fundsResult.data ?? []) as CompanyFundRow[]);
        setTransactions((transactionsResult.data ?? []) as FundTransactionRow[]);
        setApprovedExpenses((approvedExpensesResult.data ?? []) as ApprovedExpenseRow[]);
        setMonthlySettlements(
          normalizedSettlementSchemaError
            ? []
            : ((monthlySettlementsResult.data ?? []) as MonthlySettlementRow[]),
        );
        setSettlementItems(
          normalizedSettlementSchemaError
            ? []
            : ((settlementItemsResult.data ?? []) as SettlementItemRow[]),
        );
        setExpenseRequestOptions(
          (expenseRequestOptionsResult.data ?? []) as ExpenseRequestOption[],
        );
      } catch (error) {
        if (!isMounted) {
          return;
        }

        if (isFundSchemaMissing(error)) {
          setSchemaNotice(
            "회사 자금 테이블이 아직 없습니다. Supabase SQL Editor에서 supabase/company_funds.sql을 먼저 실행해주세요.",
          );
          setFunds([]);
          setTransactions([]);
          setApprovedExpenses([]);
          setMonthlySettlements([]);
          setSettlementItems([]);
          setExpenseRequestOptions([]);
        } else {
          setLoadError(
            getUserFacingSupabaseMessage(
              error,
              "회사 자금 현황 데이터를 불러오는 중 알 수 없는 오류가 발생했습니다.",
            ),
          );
          setFunds([]);
          setTransactions([]);
          setApprovedExpenses([]);
          setMonthlySettlements([]);
          setSettlementItems([]);
          setExpenseRequestOptions([]);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadFundsData();

    return () => {
      isMounted = false;
    };
  }, [reloadToken]);

  const currentMonthKey = useMemo(() => getCurrentMonthKey(), []);

  const activeFunds = useMemo(
    () => funds.filter((fund) => fund.status === "active"),
    [funds],
  );

  const handledExpenseRequestIds = useMemo(() => {
    const ids = new Set<string>();

    transactions.forEach((transaction) => {
      if (transaction.related_expense_request_id && transaction.amount < 0) {
        ids.add(transaction.related_expense_request_id);
      }
    });

    settlementItems.forEach((item) => {
      const settlement = getSingleRelation(item.settlement);

      if (
        item.expense_request_id &&
        (settlement?.status === "confirmed" || settlement?.status === "paid")
      ) {
        ids.add(item.expense_request_id);
      }
    });

    return ids;
  }, [settlementItems, transactions]);

  const fundOverview = useMemo(() => {
    const confirmedSettlementAmount = monthlySettlements
      .filter((settlement) => settlement.status === "confirmed")
      .reduce((sum, settlement) => sum + settlement.final_payment_amount, 0);

    return calculateFundOverview({
      funds,
      approvedExpenses,
      handledExpenseRequestIds,
      confirmedSettlementAmount,
    });
  }, [approvedExpenses, funds, handledExpenseRequestIds, monthlySettlements]);

  const fundOptions = useMemo(
    () => [
      { value: "전체", label: "전체 자금 항목" },
      ...funds.map((fund) => ({ value: fund.id, label: fund.name })),
    ],
    [funds],
  );

  const activeFundOptions = useMemo(
    () => activeFunds.map((fund) => ({ value: fund.id, label: fund.name })),
    [activeFunds],
  );

  const fundCards = useMemo(() => {
    return [...funds]
      .sort((left, right) => {
        if (left.status !== right.status) {
          return left.status === "active" ? -1 : 1;
        }

        return right.updated_at.localeCompare(left.updated_at);
      })
      .map((fund) => {
        const fundTransactions = transactions.filter(
          (transaction) => transaction.fund_id === fund.id,
        );

        const monthlyTransactions = fundTransactions.filter(
          (transaction) => getMonthKeyFromDate(transaction.transaction_date) === currentMonthKey,
        );

        const monthlyDeposit = monthlyTransactions
          .filter((transaction) => transaction.amount > 0)
          .reduce((sum, transaction) => sum + transaction.amount, 0);

        const monthlyWithdrawal = monthlyTransactions
          .filter((transaction) => transaction.amount < 0)
          .reduce((sum, transaction) => sum + Math.abs(transaction.amount), 0);

        return {
          ...fund,
          monthlyDeposit,
          monthlyWithdrawal,
          recentTransactionDate: fundTransactions[0]?.transaction_date ?? null,
        };
      });
  }, [currentMonthKey, funds, transactions]);

  const filteredTransactions = useMemo(() => {
    const normalizedSearchTerm = searchTerm.trim().toLowerCase();

    return transactions.filter((transaction) => {
      const fund = getSingleRelation(transaction.fund);
      const relatedRequest = getSingleRelation(transaction.related_request);
      const matchesFund =
        selectedFundFilter === "전체" || transaction.fund_id === selectedFundFilter;
      const matchesType =
        selectedTransactionTypeFilter === "전체" ||
        transaction.transaction_type === selectedTransactionTypeFilter;
      const matchesSearch =
        normalizedSearchTerm.length === 0 ||
        [
          transaction.title,
          transaction.description,
          fund?.name ?? "",
          relatedRequest?.request_no ?? "",
          relatedRequest?.title ?? "",
        ]
          .join(" ")
          .toLowerCase()
          .includes(normalizedSearchTerm);

      return matchesFund && matchesType && matchesSearch;
    });
  }, [searchTerm, selectedFundFilter, selectedTransactionTypeFilter, transactions]);

  const summaryCards = [
    {
      id: "total-balance",
      title: "총 보유 자금",
      description: "company_funds.status = active 기준 current_balance 합계입니다.",
      value: isLoading ? null : <AmountText value={fundOverview.totalFunds} />,
      icon: <WalletCards className="h-5 w-5" strokeWidth={1.8} />,
    },
    {
      id: "approved-unpaid",
      title: "승인 지출 예정액",
      description: "approved 상태 일반 지출 중 아직 출금 처리되지 않은 금액입니다.",
      value: isLoading ? null : <AmountText value={fundOverview.approvedExpensePendingAmount} />,
      icon: <BadgeCheck className="h-5 w-5" strokeWidth={1.8} />,
    },
    {
      id: "settlement-due",
      title: "직원 정산 예정액",
      description: "approved + 정산 요청 + 개인카드/현금 기준 지급 예정 금액입니다.",
      value: isLoading ? null : <AmountText value={fundOverview.settlementPendingAmount} />,
      icon: <CreditCard className="h-5 w-5" strokeWidth={1.8} />,
    },
    {
      id: "available-cash",
      title: "실질 가용 자금",
      description: "총 보유 자금 - 승인 지출 예정액 - 직원 정산 예정액 기준입니다.",
      value: isLoading ? null : <AmountText value={fundOverview.availableFunds} />,
      icon: <Landmark className="h-5 w-5" strokeWidth={1.8} />,
    },
    {
      id: "active-funds",
      title: "활성 자금 항목 수",
      description: "현재 운영 중인 active 상태 자금 항목 수입니다.",
      value: isLoading ? null : <span>{activeFunds.length}개</span>,
      icon: <Building2 className="h-5 w-5" strokeWidth={1.8} />,
    },
  ];

  function openCreateFundModal() {
    setFeedback(null);
    setFundFormError(null);
    setFundModalTarget(null);
    setFundForm(createFundFormState());
    setIsFundModalOpen(true);
  }

  function openEditFundModal(fund: CompanyFundRow) {
    setFeedback(null);
    setFundFormError(null);
    setFundModalTarget(fund);
    setFundForm(createFundFormState(fund));
    setIsFundModalOpen(true);
  }

  function closeFundModal() {
    setIsFundModalOpen(false);
    setFundModalTarget(null);
    setFundForm(createFundFormState());
    setFundFormError(null);
  }

  function openTransactionModal(defaultFundId = "") {
    setFeedback(null);
    setTransactionFormError(null);
    setTransactionForm(createTransactionFormState(defaultFundId));
    setIsTransactionModalOpen(true);
  }

  function closeTransactionModal() {
    setIsTransactionModalOpen(false);
    setTransactionForm(createTransactionFormState());
    setTransactionFormError(null);
  }

  async function handleFundSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFundFormError(null);
    setFeedback(null);

    if (!isSupabaseConfigured) {
      setFundFormError(
        "Supabase 환경변수가 설정되지 않았습니다. NEXT_PUBLIC_SUPABASE_URL과 NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY를 확인해주세요.",
      );
      return;
    }

    const normalizedName = fundForm.name.trim();
    const numericBalance = Number(fundForm.currentBalance);

    if (normalizedName.length === 0) {
      setFundFormError("자금 항목 이름을 입력해주세요.");
      return;
    }

    if (!Number.isFinite(numericBalance)) {
      setFundFormError("현재 잔액은 숫자로 입력해주세요.");
      return;
    }

    setIsFundSaving(true);

    try {
      const supabase = getSupabaseBrowserClient();
      const payload = {
        name: normalizedName,
        fund_type: fundForm.fundType,
        current_balance: Math.trunc(numericBalance),
        description: fundForm.description.trim(),
        status: fundModalTarget?.status ?? "active",
      };

      const query = fundModalTarget
        ? supabase
            .from("company_funds")
            .update(payload)
            .eq("id", fundModalTarget.id)
        : supabase.from("company_funds").insert(payload);

      const { error } = await query.select("id").single();

      if (error) {
        throw error;
      }

      setFeedback({
        type: "success",
        message: fundModalTarget
          ? "자금 항목이 수정되었습니다."
          : "자금 항목이 추가되었습니다.",
      });
      closeFundModal();
      setReloadToken((current) => current + 1);
    } catch (error) {
      setFundFormError(
        getUserFacingSupabaseMessage(
          error,
          "자금 항목 저장 중 알 수 없는 오류가 발생했습니다.",
        ),
      );
    } finally {
      setIsFundSaving(false);
    }
  }

  async function handleDeactivateFund(fund: CompanyFundRow) {
    const shouldContinue = window.confirm(
      `${fund.name} 항목을 비활성화하시겠습니까? 삭제하지 않고 status = inactive로만 변경됩니다.`,
    );

    if (!shouldContinue) {
      return;
    }

    if (!isSupabaseConfigured) {
      setFeedback({
        type: "error",
        message:
          "Supabase 환경변수가 설정되지 않았습니다. NEXT_PUBLIC_SUPABASE_URL과 NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY를 확인해주세요.",
      });
      return;
    }

    setFeedback(null);
    setIsDeactivatingFundId(fund.id);

    try {
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase
        .from("company_funds")
        .update({ status: "inactive" })
        .eq("id", fund.id)
        .select("id")
        .single();

      if (error) {
        throw error;
      }

      setFeedback({
        type: "success",
        message: `${fund.name} 항목이 비활성화되었습니다.`,
      });
      setReloadToken((current) => current + 1);
    } catch (error) {
      setFeedback({
        type: "error",
        message: getUserFacingSupabaseMessage(
          error,
          "자금 항목 비활성화 중 알 수 없는 오류가 발생했습니다.",
        ),
      });
    } finally {
      setIsDeactivatingFundId(null);
    }
  }

  async function handleTransactionSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setTransactionFormError(null);
    setFeedback(null);

    if (!isSupabaseConfigured) {
      setTransactionFormError(
        "Supabase 환경변수가 설정되지 않았습니다. NEXT_PUBLIC_SUPABASE_URL과 NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY를 확인해주세요.",
      );
      return;
    }

    const selectedFund = activeFunds.find((fund) => fund.id === transactionForm.fundId);
    const rawAmount = Number(transactionForm.amount);

    if (!selectedFund) {
      setTransactionFormError("거래를 반영할 자금 항목을 선택해주세요.");
      return;
    }

    if (!Number.isFinite(rawAmount) || rawAmount <= 0) {
      setTransactionFormError("거래 금액은 0보다 큰 숫자로 입력해주세요.");
      return;
    }

    if (transactionForm.title.trim().length === 0) {
      setTransactionFormError("거래 제목을 입력해주세요.");
      return;
    }

    if (transactionForm.transactionDate.trim().length === 0) {
      setTransactionFormError("거래일을 입력해주세요.");
      return;
    }

    setIsTransactionSaving(true);

    try {
      const supabase = getSupabaseBrowserClient();
      const { error: transactionError } = await supabase.rpc("create_fund_transaction", {
        p_fund_id: selectedFund.id,
        p_transaction_type: transactionForm.transactionType,
        p_amount: Math.trunc(rawAmount),
        p_title: transactionForm.title.trim(),
        p_description: transactionForm.description.trim(),
        p_transaction_date: transactionForm.transactionDate,
        p_related_expense_request_id:
          transactionForm.relatedExpenseRequestId.trim().length > 0
            ? transactionForm.relatedExpenseRequestId
            : null,
        p_adjustment_direction: transactionForm.adjustmentDirection,
      });

      if (transactionError) {
        throw transactionError;
      }

      setFeedback({
        type: "success",
        message: `${selectedFund.name}에 ${mapFundTransactionTypeLabel(
          transactionForm.transactionType,
        )} 거래가 반영되었습니다.`,
      });
      closeTransactionModal();
      setReloadToken((current) => current + 1);
    } catch (error) {
      setTransactionFormError(
        getUserFacingSupabaseMessage(
          error,
          "자금 거래 저장 중 알 수 없는 오류가 발생했습니다.",
        ),
      );
    } finally {
      setIsTransactionSaving(false);
    }
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="회사 자금 현황"
        description="회사 전체 자금 상태와 출납 흐름을 Supabase 실데이터 기준으로 관리합니다."
        roles={roleViews}
        activeRole="대표 보기"
        eyebrow="자금 모니터링"
        badgeText="회사 자금 실데이터"
      />

      {!isSupabaseConfigured ? (
        <section className="rounded-[1.75rem] border border-rose-200 bg-rose-50 px-5 py-4 text-sm leading-6 text-rose-700 shadow-sm">
          <p className="font-semibold">Supabase 연결 정보가 설정되지 않았습니다.</p>
          <p className="mt-2 whitespace-pre-wrap break-words">
            NEXT_PUBLIC_SUPABASE_URL과 NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY를 확인해주세요.
          </p>
        </section>
      ) : null}

      {schemaNotice ? (
        <section className="rounded-[1.75rem] border border-amber-200 bg-amber-50 px-5 py-4 text-sm leading-6 text-amber-800 shadow-sm">
          <p className="font-semibold">회사 자금 테이블이 아직 준비되지 않았습니다.</p>
          <p className="mt-2 whitespace-pre-wrap break-words">{schemaNotice}</p>
        </section>
      ) : null}

      {loadError ? (
        <section className="rounded-[1.75rem] border border-rose-200 bg-rose-50 px-5 py-4 text-sm leading-6 text-rose-700 shadow-sm">
          <p className="font-semibold">회사 자금 현황을 불러오지 못했습니다.</p>
          <p className="mt-2 whitespace-pre-wrap break-words">{loadError}</p>
        </section>
      ) : null}

      {feedback ? (
        <section
          className={[
            "rounded-[1.75rem] px-5 py-4 text-sm leading-6 shadow-sm",
            feedback.type === "success"
              ? "border border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border border-rose-200 bg-rose-50 text-rose-700",
          ].join(" ")}
        >
          <p className="font-semibold">
            {feedback.type === "success" ? "처리가 완료되었습니다." : "처리 중 오류가 발생했습니다."}
          </p>
          <p className="mt-2 whitespace-pre-wrap break-words">{feedback.message}</p>
        </section>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {summaryCards.map((summary) => (
          <StatCard
            key={summary.id}
            title={summary.title}
            description={summary.description}
            value={
              summary.value ?? <span className="text-base font-medium text-slate-400">불러오는 중...</span>
            }
            icon={summary.icon}
          />
        ))}
      </section>

      <section className="rounded-[1.75rem] border border-slate-200/90 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0 flex-1">
            <h3 className="text-lg font-semibold text-slate-950">자금 계산 기준</h3>
            <p className="mt-1 text-sm text-slate-500">
              총 보유 자금은 active 상태 company_funds 합계, 승인 지출 예정액은 아직 실제 출금 또는 정산 처리되지 않은 approved 요청 합계, 직원 정산 예정액은 confirmed 상태 monthly_settlements 합계로 계산합니다.
            </p>
          </div>

          <div className="grid gap-2 sm:grid-cols-3">
            <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700">
              company_funds 기준
            </div>
            <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700">
              fund_transactions 반영
            </div>
            <div className="rounded-2xl bg-[var(--primary)] px-4 py-3 text-sm font-semibold text-white">
              실질 가용 자금 계산
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-[1.75rem] border border-slate-200/90 bg-white p-5 shadow-sm">
        <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-950">계좌별 자금 현황</h3>
            <p className="mt-1 text-sm text-slate-500">
              자금 항목별 현재 잔액, 이번 달 입출금, 최근 거래일을 확인하고 직접 수정할 수 있습니다.
            </p>
          </div>

          <button
            type="button"
            onClick={openCreateFundModal}
            disabled={Boolean(schemaNotice)}
            className={[
              "inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold shadow-sm transition",
              schemaNotice
                ? "cursor-not-allowed border border-slate-200 bg-slate-100 text-slate-400"
                : "bg-[var(--primary)] text-white hover:opacity-95",
            ].join(" ")}
          >
            <Plus className="h-4.5 w-4.5" strokeWidth={1.8} />
            자금 항목 추가
          </button>
        </div>

        <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
          {fundCards.map((fund) => (
            <article
              key={fund.id}
              className={[
                "rounded-[1.5rem] border p-5 shadow-sm transition",
                fund.status === "active"
                  ? "border-slate-200 bg-[var(--card-secondary)]"
                  : "border-slate-200 bg-slate-50/80",
              ].join(" ")}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                    {mapFundTypeLabel(fund.fund_type)}
                  </p>
                  <h4 className="mt-2 truncate text-xl font-semibold text-slate-950">{fund.name}</h4>
                </div>
                <StatusBadge status={mapFundStatusLabel(fund.status)} />
              </div>

              <div className="mt-5">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                  현재 잔액
                </p>
                <p className="mt-2 text-2xl font-semibold text-slate-950">
                  <AmountText value={fund.current_balance} />
                </p>
              </div>

              <p className="mt-4 min-h-12 text-sm leading-6 text-slate-500">
                {fund.description.trim().length > 0
                  ? fund.description
                  : "등록된 설명이 없습니다."}
              </p>

              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl bg-white px-4 py-3 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                    이번 달 입금
                  </p>
                  <p className="mt-2 text-sm font-semibold text-sky-700">
                    {formatKrw(fund.monthlyDeposit)}
                  </p>
                </div>
                <div className="rounded-2xl bg-white px-4 py-3 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                    이번 달 출금
                  </p>
                  <p className="mt-2 text-sm font-semibold text-rose-700">
                    {formatKrw(fund.monthlyWithdrawal)}
                  </p>
                </div>
                <div className="rounded-2xl bg-white px-4 py-3 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                    최근 거래일
                  </p>
                  <p className="mt-2 text-sm font-semibold text-slate-700">
                    {fund.recentTransactionDate
                      ? formatSupabaseDate(fund.recentTransactionDate)
                      : "-"}
                  </p>
                </div>
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => openEditFundModal(fund)}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
                >
                  <PencilLine className="h-4 w-4" strokeWidth={1.8} />
                  수정
                </button>
                {fund.status === "active" ? (
                  <>
                    <button
                      type="button"
                      onClick={() => openTransactionModal(fund.id)}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
                    >
                      <RefreshCw className="h-4 w-4" strokeWidth={1.8} />
                      거래 추가
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        void handleDeactivateFund(fund);
                      }}
                      disabled={isDeactivatingFundId === fund.id}
                      className={[
                        "inline-flex items-center justify-center gap-2 rounded-2xl px-3.5 py-2.5 text-sm font-semibold shadow-sm transition",
                        isDeactivatingFundId === fund.id
                          ? "cursor-not-allowed border border-slate-200 bg-slate-100 text-slate-400"
                          : "border border-rose-200 bg-rose-50 text-rose-700 hover:border-rose-300 hover:bg-rose-100",
                      ].join(" ")}
                    >
                      <Power className="h-4 w-4" strokeWidth={1.8} />
                      {isDeactivatingFundId === fund.id ? "비활성화 중..." : "비활성화"}
                    </button>
                  </>
                ) : null}
              </div>
            </article>
          ))}
        </div>

        {isLoading ? (
          <EmptyState
            title="자금 항목을 불러오는 중입니다."
            description="Supabase에서 company_funds 데이터를 조회하고 있습니다."
          />
        ) : null}

        {!isLoading && fundCards.length === 0 ? (
          <EmptyState
            title="표시할 자금 항목이 없습니다."
            description="자금 항목 추가 버튼을 눌러 운영비 계좌, 정부지원금 계좌, 예비비 등을 등록해보세요."
          />
        ) : null}
      </section>

      <section className="rounded-[1.75rem] border border-slate-200/90 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <h3 className="text-lg font-semibold text-slate-950">자금 출납 내역</h3>
              <p className="mt-1 text-sm text-slate-500">
                입금, 출금, 이체, 조정 내역을 조회하고 자금 흐름을 실제 잔액에 반영합니다.
              </p>
            </div>
            <button
              type="button"
              onClick={() => openTransactionModal(activeFunds[0]?.id ?? "")}
              disabled={activeFunds.length === 0 || Boolean(schemaNotice)}
              className={[
                "inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold shadow-sm transition",
                activeFunds.length === 0 || schemaNotice
                  ? "cursor-not-allowed border border-slate-200 bg-slate-100 text-slate-400"
                  : "bg-[var(--primary)] text-white hover:opacity-95",
              ].join(" ")}
            >
              <Plus className="h-4.5 w-4.5" strokeWidth={1.8} />
              입출금 내역 추가
            </button>
          </div>

          <div className="grid gap-4 xl:grid-cols-[220px_220px_minmax(0,1fr)]">
            <div>
              <label htmlFor="fund-filter" className="text-sm font-semibold text-slate-900">
                자금 항목 필터
              </label>
              <select
                id="fund-filter"
                value={selectedFundFilter}
                onChange={(event) => setSelectedFundFilter(event.target.value)}
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-[var(--primary)] focus:ring-4 focus:ring-[color:rgba(22,59,111,0.08)]"
              >
                {fundOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="transaction-type-filter" className="text-sm font-semibold text-slate-900">
                거래 유형 필터
              </label>
              <select
                id="transaction-type-filter"
                value={selectedTransactionTypeFilter}
                onChange={(event) => setSelectedTransactionTypeFilter(event.target.value)}
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-[var(--primary)] focus:ring-4 focus:ring-[color:rgba(22,59,111,0.08)]"
              >
                <option value="전체">전체 거래 유형</option>
                {transactionTypeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="transaction-search" className="text-sm font-semibold text-slate-900">
                검색
              </label>
              <input
                id="transaction-search"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="제목, 설명, 자금 항목, 요청번호 검색"
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-[var(--primary)] focus:ring-4 focus:ring-[color:rgba(22,59,111,0.08)]"
              />
            </div>
          </div>
        </div>

        <div className="mt-5">
          <DashboardTable columns={fundCardColumns}>
            {filteredTransactions.map((transaction) => {
              const fund = getSingleRelation(transaction.fund);
              const relatedRequest = getSingleRelation(transaction.related_request);

              return (
                <tr key={transaction.id} className="border-b border-slate-100 last:border-b-0">
                  <td className="px-4 py-4 text-slate-500">
                    <time dateTime={transaction.transaction_date}>
                      {formatSupabaseDate(transaction.transaction_date)}
                    </time>
                  </td>
                  <td className="px-4 py-4 font-medium text-slate-900">
                    {fund?.name ?? "미확인 자금 항목"}
                  </td>
                  <td className="px-4 py-4 text-center">
                    <TransactionTypeBadge type={transaction.transaction_type} />
                  </td>
                  <td className="px-4 py-4">
                    <div>
                      <p className="font-medium text-slate-900">{transaction.title}</p>
                      <p className="mt-1 text-xs leading-5 text-slate-500">
                        {transaction.description.trim().length > 0
                          ? transaction.description
                          : "설명 없음"}
                      </p>
                    </div>
                  </td>
                  <td
                    className={[
                      "px-4 py-4 text-right font-semibold",
                      getTransactionAmountTone(transaction.amount),
                    ].join(" ")}
                  >
                    {formatTransactionAmount(transaction.amount)}
                  </td>
                  <td className="px-4 py-4 text-right text-slate-700">
                    {fund ? <AmountText value={fund.current_balance} /> : "-"}
                  </td>
                  <td className="px-4 py-4 text-center text-slate-500">
                    {relatedRequest?.request_no ?? "-"}
                  </td>
                </tr>
              );
            })}
          </DashboardTable>
        </div>

        {isLoading ? (
          <EmptyState
            title="자금 거래 내역을 불러오는 중입니다."
            description="Supabase에서 fund_transactions 데이터를 조회하고 있습니다."
          />
        ) : null}

        {!isLoading && filteredTransactions.length === 0 ? (
          <EmptyState
            title="표시할 자금 거래 내역이 없습니다."
            description="자금 항목을 등록한 뒤 입금, 출금, 조정 거래를 추가해보세요."
          />
        ) : null}
      </section>

      {isFundModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4 py-8">
          <div className="w-full max-w-2xl rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-slate-500">회사 자금 항목 관리</p>
                <h3 className="mt-2 text-2xl font-semibold text-slate-950">
                  {fundModalTarget ? "자금 항목 수정" : "자금 항목 추가"}
                </h3>
                <p className="mt-2 text-sm text-slate-500">
                  자금 항목 이름, 유형, 현재 잔액, 설명을 등록하거나 수정합니다.
                </p>
              </div>
              <button
                type="button"
                onClick={closeFundModal}
                className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 text-slate-500 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-700"
                aria-label="닫기"
              >
                <X className="h-4.5 w-4.5" strokeWidth={1.9} />
              </button>
            </div>

            <form onSubmit={handleFundSubmit} className="mt-6 space-y-5">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label htmlFor="fund-name" className="text-sm font-semibold text-slate-900">
                    자금 항목 이름
                  </label>
                  <input
                    id="fund-name"
                    value={fundForm.name}
                    onChange={(event) =>
                      setFundForm((current) => ({ ...current, name: event.target.value }))
                    }
                    placeholder="예: 운영비 계좌"
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-[var(--primary)] focus:ring-4 focus:ring-[color:rgba(22,59,111,0.08)]"
                  />
                </div>
                <div>
                  <label htmlFor="fund-type" className="text-sm font-semibold text-slate-900">
                    자금 유형
                  </label>
                  <select
                    id="fund-type"
                    value={fundForm.fundType}
                    onChange={(event) =>
                      setFundForm((current) => ({
                        ...current,
                        fundType: event.target.value as DbFundType,
                      }))
                    }
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-[var(--primary)] focus:ring-4 focus:ring-[color:rgba(22,59,111,0.08)]"
                  >
                    {fundTypeOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="fund-balance" className="text-sm font-semibold text-slate-900">
                  현재 잔액
                </label>
                <input
                  id="fund-balance"
                  type="number"
                  inputMode="numeric"
                  value={fundForm.currentBalance}
                  onChange={(event) =>
                    setFundForm((current) => ({
                      ...current,
                      currentBalance: event.target.value,
                    }))
                  }
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-[var(--primary)] focus:ring-4 focus:ring-[color:rgba(22,59,111,0.08)]"
                />
              </div>

              <div>
                <label htmlFor="fund-description" className="text-sm font-semibold text-slate-900">
                  설명
                </label>
                <textarea
                  id="fund-description"
                  rows={4}
                  value={fundForm.description}
                  onChange={(event) =>
                    setFundForm((current) => ({
                      ...current,
                      description: event.target.value,
                    }))
                  }
                  placeholder="자금 용도나 관리 메모를 입력해주세요."
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm leading-6 text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-[var(--primary)] focus:ring-4 focus:ring-[color:rgba(22,59,111,0.08)]"
                />
              </div>

              {fundFormError ? (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm leading-6 text-rose-700">
                  {fundFormError}
                </div>
              ) : null}

              <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeFundModal}
                  className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={isFundSaving}
                  className={[
                    "inline-flex items-center justify-center rounded-2xl px-4 py-3 text-sm font-semibold shadow-sm transition",
                    isFundSaving
                      ? "cursor-not-allowed bg-slate-200 text-slate-500"
                      : "bg-[var(--primary)] text-white hover:opacity-95",
                  ].join(" ")}
                >
                  {isFundSaving ? "저장 중..." : fundModalTarget ? "변경사항 저장" : "자금 항목 추가"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {isTransactionModalOpen ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/45 px-4 py-8">
          <div className="w-full max-w-2xl rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-slate-500">자금 출납 등록</p>
                <h3 className="mt-2 text-2xl font-semibold text-slate-950">입출금 내역 추가</h3>
                <p className="mt-2 text-sm text-slate-500">
                  거래를 저장하면 fund_transactions에 기록되고, 선택한 자금 항목의 current_balance가 함께 갱신됩니다.
                </p>
              </div>
              <button
                type="button"
                onClick={closeTransactionModal}
                className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 text-slate-500 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-700"
                aria-label="닫기"
              >
                <X className="h-4.5 w-4.5" strokeWidth={1.9} />
              </button>
            </div>

            <form onSubmit={handleTransactionSubmit} className="mt-6 space-y-5">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label htmlFor="transaction-fund" className="text-sm font-semibold text-slate-900">
                    자금 항목
                  </label>
                  <select
                    id="transaction-fund"
                    value={transactionForm.fundId}
                    onChange={(event) =>
                      setTransactionForm((current) => ({
                        ...current,
                        fundId: event.target.value,
                      }))
                    }
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-[var(--primary)] focus:ring-4 focus:ring-[color:rgba(22,59,111,0.08)]"
                  >
                    <option value="">자금 항목 선택</option>
                    {activeFundOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="transaction-type" className="text-sm font-semibold text-slate-900">
                    거래 유형
                  </label>
                  <select
                    id="transaction-type"
                    value={transactionForm.transactionType}
                    onChange={(event) =>
                      setTransactionForm((current) => ({
                        ...current,
                        transactionType: event.target.value as DbFundTransactionType,
                      }))
                    }
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-[var(--primary)] focus:ring-4 focus:ring-[color:rgba(22,59,111,0.08)]"
                  >
                    {transactionTypeOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label htmlFor="transaction-amount" className="text-sm font-semibold text-slate-900">
                    거래 금액
                  </label>
                  <input
                    id="transaction-amount"
                    type="number"
                    inputMode="numeric"
                    min="0"
                    value={transactionForm.amount}
                    onChange={(event) =>
                      setTransactionForm((current) => ({
                        ...current,
                        amount: event.target.value,
                      }))
                    }
                    placeholder="예: 1500000"
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-[var(--primary)] focus:ring-4 focus:ring-[color:rgba(22,59,111,0.08)]"
                  />
                </div>

                <div>
                  <label htmlFor="transaction-date" className="text-sm font-semibold text-slate-900">
                    거래일
                  </label>
                  <input
                    id="transaction-date"
                    type="date"
                    value={transactionForm.transactionDate}
                    onChange={(event) =>
                      setTransactionForm((current) => ({
                        ...current,
                        transactionDate: event.target.value,
                      }))
                    }
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-[var(--primary)] focus:ring-4 focus:ring-[color:rgba(22,59,111,0.08)]"
                  />
                </div>
              </div>

              {transactionForm.transactionType === "adjustment" ? (
                <div>
                  <label htmlFor="adjustment-direction" className="text-sm font-semibold text-slate-900">
                    조정 방향
                  </label>
                  <select
                    id="adjustment-direction"
                    value={transactionForm.adjustmentDirection}
                    onChange={(event) =>
                      setTransactionForm((current) => ({
                        ...current,
                        adjustmentDirection: event.target.value as FundAdjustmentDirection,
                      }))
                    }
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-[var(--primary)] focus:ring-4 focus:ring-[color:rgba(22,59,111,0.08)]"
                  >
                    <option value="increase">증가</option>
                    <option value="decrease">차감</option>
                  </select>
                </div>
              ) : null}

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label htmlFor="transaction-title" className="text-sm font-semibold text-slate-900">
                    거래 제목
                  </label>
                  <input
                    id="transaction-title"
                    value={transactionForm.title}
                    onChange={(event) =>
                      setTransactionForm((current) => ({
                        ...current,
                        title: event.target.value,
                      }))
                    }
                    placeholder="예: AWS 6월 결제"
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-[var(--primary)] focus:ring-4 focus:ring-[color:rgba(22,59,111,0.08)]"
                  />
                </div>

                <div>
                  <label htmlFor="related-expense-request" className="text-sm font-semibold text-slate-900">
                    연결 요청번호
                  </label>
                  <select
                    id="related-expense-request"
                    value={transactionForm.relatedExpenseRequestId}
                    onChange={(event) =>
                      setTransactionForm((current) => ({
                        ...current,
                        relatedExpenseRequestId: event.target.value,
                      }))
                    }
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-[var(--primary)] focus:ring-4 focus:ring-[color:rgba(22,59,111,0.08)]"
                  >
                    <option value="">연결 안 함</option>
                    {expenseRequestOptions.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.request_no} / {option.title}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="transaction-description" className="text-sm font-semibold text-slate-900">
                  설명
                </label>
                <textarea
                  id="transaction-description"
                  rows={4}
                  value={transactionForm.description}
                  onChange={(event) =>
                    setTransactionForm((current) => ({
                      ...current,
                      description: event.target.value,
                    }))
                  }
                  placeholder="입금/출금 상세 내용을 입력해주세요."
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm leading-6 text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-[var(--primary)] focus:ring-4 focus:ring-[color:rgba(22,59,111,0.08)]"
                />
              </div>

              {transactionFormError ? (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm leading-6 text-rose-700">
                  {transactionFormError}
                </div>
              ) : null}

              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm leading-6 text-slate-600">
                입금은 잔액이 증가하고, 출금/이체는 잔액이 차감됩니다. 조정은 증가 또는 차감 방향을 직접 선택할 수 있습니다.
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeTransactionModal}
                  className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={isTransactionSaving}
                  className={[
                    "inline-flex items-center justify-center rounded-2xl px-4 py-3 text-sm font-semibold shadow-sm transition",
                    isTransactionSaving
                      ? "cursor-not-allowed bg-slate-200 text-slate-500"
                      : "bg-[var(--primary)] text-white hover:opacity-95",
                  ].join(" ")}
                >
                  {isTransactionSaving ? "저장 중..." : "거래 저장"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
