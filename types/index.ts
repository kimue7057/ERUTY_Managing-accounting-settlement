export type RoleView = "직원 보기" | "관리자 보기" | "대표 보기";

export type AuthRole = "employee" | "manager" | "admin";

export type ProfileStatus = "active" | "inactive";

export type AuthProfile = {
  id: string;
  email: string;
  name: string;
  department: string;
  position: string;
  role: AuthRole;
  status: ProfileStatus;
  isActive: boolean;
};

export type SummaryIconKey =
  | "holding"
  | "available"
  | "approved"
  | "paid"
  | "settlement"
  | "pending";

export type SummaryStat = {
  id: string;
  title: string;
  value: number;
  description: string;
  iconKey: SummaryIconKey;
};

export type ExpenseStatus =
  | "승인대기"
  | "승인완료"
  | "수정요청"
  | "반려"
  | "보류"
  | "정산대기"
  | "정산완료";

export type RecentExpense = {
  draftNumber: string;
  title: string;
  requester: string;
  amount: number;
  status: ExpenseStatus;
  requestedAt: string;
};

export type UrgencyLevel = "일반" | "긴급";

export type PendingApproval = {
  requester: string;
  title: string;
  project: string;
  requestedAmount: number;
  urgency: UrgencyLevel;
};

export type BudgetHealthStatus = "정상" | "주의" | "초과위험" | "초과";

export type ProjectBudget = {
  id: string;
  name: string;
  totalBudget: number;
  spentBudget: number;
  remainingBudget: number;
  usageRate: number;
  status: BudgetHealthStatus;
  budgetConfigured: boolean;
};

export type ExpenseCategory = {
  category: string;
  amount: number;
};

export type PaymentMethod = "개인카드" | "법인카드" | "현금" | "계좌이체";

export type SettlementRequestOption = "정산 요청" | "정산 요청 안 함";

export type AttachmentCategory =
  | "영수증"
  | "카드전표"
  | "현금영수증"
  | "간이영수증"
  | "교통비 증빙"
  | "기타 증빙";

export type ExpenseRequestFormData = {
  title: string;
  expenseType: string;
  usedDate: string;
  purpose: string;
  relatedProject: string;
  amount: string;
  merchantName: string;
  paymentMethod: PaymentMethod | "";
  attendeeInfo: string;
  detailMemo: string;
  settlementRequest: SettlementRequestOption | "";
  settlementAccount: string;
  attachments: Record<AttachmentCategory, string[]>;
};

export type ExpenseRequestFieldKey =
  | "title"
  | "expenseType"
  | "usedDate"
  | "purpose"
  | "relatedProject"
  | "amount"
  | "merchantName"
  | "paymentMethod"
  | "settlementRequest";

export type ExpenseRequestErrors = Partial<Record<ExpenseRequestFieldKey, string>>;

export type AttachmentStatus = "첨부완료" | "미첨부";

export type ExpenseHistoryItem = {
  requestNumber: string;
  title: string;
  expenseType: string;
  usedDate: string;
  merchantName: string;
  amount: number;
  paymentMethod: PaymentMethod;
  settlementRequest: SettlementRequestOption;
  status: ExpenseStatus;
  attachmentStatus: AttachmentStatus;
  requestedAt: string;
};

export type ExpenseHistorySummary = {
  id: string;
  title: string;
  value: number;
  description: string;
};

export type ReviewDecision = "승인" | "반려" | "수정요청";

export type SettlementProcessingOption =
  | "월말 정산 포함"
  | "정산 보류"
  | "정산 대상 아님";

export type ApprovalAttachmentFile = {
  type: AttachmentCategory;
  fileName: string;
};

export type ApprovalQueueItem = {
  requestNumber: string;
  requestedAt: string;
  employeeName: string;
  department: string;
  title: string;
  expenseType: string;
  purpose: string;
  usedDate: string;
  merchantName: string;
  amount: number;
  paymentMethod: PaymentMethod;
  settlementRequest: SettlementRequestOption;
  attachmentStatus: AttachmentStatus;
  attachments: ApprovalAttachmentFile[];
  relatedProject: string;
  budgetCategory: string;
  attendeeInfo: string;
  detailMemo: string;
  budgetRisk: boolean;
  urgency: UrgencyLevel;
  status: ExpenseStatus;
  reviewDecision?: ReviewDecision;
  approvedAmount?: number;
  adminMemo?: string;
  settlementProcessing?: SettlementProcessingOption;
  includeAccounting?: boolean;
};

export type FundSummaryItem = {
  id: string;
  title: string;
  value: number;
  description: string;
};

export type FundAccount = {
  id: string;
  accountName: string;
  bankName: string;
  balance: number;
  monthlyDeposit: number;
  monthlyWithdrawal: number;
  recentTransactionDate: string;
};

export type FundTransactionType = "입금" | "출금" | "이체" | "조정";

export type FundTransaction = {
  id: string;
  transactionDate: string;
  accountName: string;
  type: FundTransactionType;
  description: string;
  amount: number;
  balanceAfter: number;
  linkedRequestNumber: string | null;
};

export type ProjectBudgetSummaryItem = {
  id: string;
  title: string;
  value: number;
  description: string;
};

export type ProjectBudgetCategoryItem = {
  category: string;
  allocatedBudget: number;
  spentAmount: number;
  pendingAmount: number;
  remainingBudget: number;
  usageRate: number;
  status: BudgetHealthStatus;
};

export type ProjectBudgetDetail = {
  id: string;
  name: string;
  totalBudget: number;
  spentAmount: number;
  pendingAmount: number;
  remainingBudget: number;
  usageRate: number;
  status: BudgetHealthStatus;
  budgetItems: ProjectBudgetCategoryItem[];
};

export type MonthlySettlementStatus = "정산대기" | "지급대기" | "지급완료" | "보류";

export type MonthlySettlementSummary = {
  employeeCount: number;
  totalPlannedAmount: number;
  paidAmount: number;
  holdAmount: number;
  rejectedAmount: number;
};

export type MonthlySettlementExpenseItem = {
  id: string;
  usedDate: string;
  expenseType: string;
  merchantName: string;
  amount: number;
  approvedAmount: number;
  attachmentStatus: AttachmentStatus;
  settlementStatus: MonthlySettlementStatus;
};

export type MonthlySettlementEmployee = {
  id: string;
  employeeName: string;
  personalExpenseTotal: number;
  approvedAmount: number;
  rejectedAmount: number;
  missingProofAmount: number;
  finalPayoutAmount: number;
  payoutStatus: MonthlySettlementStatus;
  expenses: MonthlySettlementExpenseItem[];
};

export type MonthlySettlementMonthData = {
  month: string;
  summary: MonthlySettlementSummary;
  employees: MonthlySettlementEmployee[];
};

export type SettlementEligibility = "정산 대상" | "정산 대상 아님";

export type AccountingProcessingStatus = "처리완료" | "처리대기" | "보류";

export type AccountingMaterialSummary = {
  totalExpenseCount: number;
  totalExpenseAmount: number;
  proofCompletedCount: number;
  proofMissingCount: number;
  accountingCompletedCount: number;
};

export type AccountingMaterialExpenseItem = {
  id: string;
  month: string;
  usedDate: string;
  employeeName: string;
  projectName: string;
  expenseType: string;
  accountSubject: string;
  merchantName: string;
  amount: number;
  approvedAmount: number;
  paymentMethod: PaymentMethod;
  settlementEligibility: SettlementEligibility;
  attachmentStatus: AttachmentStatus;
  approvalStatus: ExpenseStatus;
  accountingStatus: AccountingProcessingStatus;
};

export type AccountingMaterialMonthData = {
  month: string;
  summary: AccountingMaterialSummary;
  expenses: AccountingMaterialExpenseItem[];
};

export type UserManagementRole = "직원" | "관리자";

export type UserManagementStatus = "활성" | "비활성";

export type UserManagementItem = {
  id: string;
  name: string;
  email: string;
  department: string;
  role: UserManagementRole;
  status: UserManagementStatus;
};

export type ProjectManagementStatus = "진행중" | "준비중" | "종료";

export type ProjectManagementItem = {
  id: string;
  projectName: string;
  totalBudget: number;
  startDate: string;
  endDate: string;
  owner: string;
  status: ProjectManagementStatus;
};

export type ExpenseTypeManagementItem = {
  id: string;
  label: string;
  enabled: boolean;
};

export type AccountManagementItem = {
  id: string;
  accountName: string;
  bankName: string;
  accountNumber: string;
  currentBalance: number;
  enabled: boolean;
};

export type SettlementPolicySettings = {
  preApprovalRequiredAmount: number;
  proofRequired: boolean;
  monthEndClosingDay: string;
  settlementPayoutDay: string;
  missingProofHandling: "정산 보류" | "추가 소명 요청" | "반려 처리";
  excludeCorporateCardSettlement: boolean;
};
