"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  CircleAlert,
  FileText,
  Receipt,
} from "lucide-react";

import { AmountText } from "@/components/common/AmountText";
import { EmptyState } from "@/components/common/EmptyState";
import { PageHeader } from "@/components/common/PageHeader";
import { StatusBadge } from "@/components/common/StatusBadge";
import {
  getSupabaseBrowserClient,
  isSupabaseConfigured,
} from "@/lib/supabase/client";
import type {
  AttachmentStatus,
  ExpenseStatus,
  PaymentMethod,
  RoleView,
  SettlementRequestOption,
  UrgencyLevel,
} from "@/types";
import {
  formatSupabaseDate,
  getMonthRange,
  getRequestSortValue,
  getSingleRelation,
  inferUrgencyLevel,
  isSettlementTargetPaymentMethod,
  mapAttachmentFileType,
  mapDbEvidenceStatus,
  mapDbExpenseStatus,
  mapDbPaymentMethod,
  mapSettlementRequested,
  normalizeText,
  type DbAttachmentFileType,
  type DbEvidenceStatus,
  type DbExpenseStatus,
  type DbPaymentMethod,
} from "@/utils/expenseRequests";
import { getUserFacingSupabaseMessage } from "@/utils/userFacingError";

const roleViews: RoleView[] = ["직원 보기", "관리자 보기", "대표 보기"];

type ReviewDecision = "승인" | "반려" | "수정요청";
type SettlementProcessingOption = "월말 정산 포함" | "정산 보류" | "정산 대상 아님";

type ValidationErrors = {
  approvedAmount?: string;
  adminMemo?: string;
};

type SaveErrorState = {
  message: string;
  code: string | null;
  details: string | null;
  hint: string | null;
};

type RelationValue<T> = T | T[] | null;

type RequesterRelation = {
  id: string;
  name: string;
  department: string | null;
  role: string | null;
  email: string | null;
};

type ProjectRelation = {
  id: string;
  name: string;
  status: string | null;
};

type CategoryRelation = {
  id: string;
  name: string;
  is_active: boolean | null;
};

type ExpenseRequestDetailRow = {
  id: string;
  request_no: string;
  user_id: string;
  project_id: string | null;
  category_id: string | null;
  title: string;
  purpose: string | null;
  expense_date: string;
  vendor: string;
  amount: number;
  payment_method: DbPaymentMethod;
  settlement_requested: boolean;
  attendees: string | null;
  memo: string | null;
  status: DbExpenseStatus;
  evidence_status: DbEvidenceStatus;
  requested_at: string | null;
  created_at: string | null;
  approved_at: string | null;
  approver_id: string | null;
  reject_reason: string | null;
  requester: RelationValue<RequesterRelation>;
  project: RelationValue<ProjectRelation>;
  category: RelationValue<CategoryRelation>;
};

type ExpenseAttachmentRow = {
  id: string;
  file_type: DbAttachmentFileType;
  file_name: string;
  file_path: string | null;
  created_at: string | null;
};

type SimilarExpenseRow = {
  id: string;
  request_no: string;
  title: string;
  expense_date: string;
  vendor: string;
  amount: number;
  requester: RelationValue<Pick<RequesterRelation, "name">>;
};

type ApproverProfileRow = {
  id: string;
  role: string;
  is_active: boolean | null;
};

type ApprovalAttachmentPreview = {
  id: string;
  typeLabel: string;
  fileName: string;
};

type RecentSimilarExpense = {
  id: string;
  requestNumber: string;
  title: string;
  usedDate: string;
  merchantName: string;
  amount: number;
  employeeName: string;
};

type ApprovalDetailItem = {
  id: string;
  requestNumber: string;
  requestedAt: string;
  employeeName: string;
  department: string;
  title: string;
  expenseType: string;
  urgency: UrgencyLevel;
  usedDate: string;
  merchantName: string;
  amount: number;
  paymentMethod: PaymentMethod;
  settlementRequest: SettlementRequestOption;
  attendeeInfo: string;
  purpose: string;
  detailMemo: string;
  relatedProject: string;
  budgetCategory: string;
  status: ExpenseStatus;
  attachmentStatus: AttachmentStatus;
  attachments: ApprovalAttachmentPreview[];
  adminMemo: string;
};

function UrgencyBadge({ urgency }: { urgency: UrgencyLevel }) {
  const classes =
    urgency === "긴급"
      ? "border-amber-200 bg-amber-50 text-amber-700"
      : "border-slate-200 bg-slate-100 text-slate-600";

  return (
    <span
      className={[
        "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold",
        classes,
      ].join(" ")}
    >
      {urgency}
    </span>
  );
}

function InfoCard({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-[1.75rem] border border-slate-200/90 bg-white p-5 shadow-sm">
      <h3 className="text-lg font-semibold text-slate-950">{title}</h3>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function SummaryBlock({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: ReactNode;
  tone?: "default" | "warning" | "danger" | "success";
}) {
  const toneClassName =
    tone === "warning"
      ? "bg-amber-50 text-amber-800"
      : tone === "danger"
        ? "bg-rose-50 text-rose-800"
        : tone === "success"
          ? "bg-emerald-50 text-emerald-800"
          : "bg-slate-50 text-slate-800";

  return (
    <div className={["rounded-2xl px-4 py-3", toneClassName].join(" ")}>
      <p className="text-xs font-semibold uppercase tracking-[0.14em] opacity-70">{label}</p>
      <div className="mt-2 text-sm font-semibold">{value}</div>
    </div>
  );
}

function getDefaultSettlementProcessing(item: ApprovalDetailItem): SettlementProcessingOption {
  if (!isSettlementTargetPaymentMethod(item.paymentMethod)) {
    return "정산 대상 아님";
  }

  return item.attachmentStatus === "첨부완료" ? "월말 정산 포함" : "정산 보류";
}

function getDefaultDecision(item: ApprovalDetailItem): ReviewDecision {
  if (item.status === "반려") {
    return "반려";
  }

  if (item.status === "수정요청") {
    return "수정요청";
  }

  return "승인";
}

function mapRecentSimilarExpense(row: SimilarExpenseRow): RecentSimilarExpense {
  const requester = getSingleRelation(row.requester);

  return {
    id: row.id,
    requestNumber: row.request_no,
    title: row.title,
    usedDate: formatSupabaseDate(row.expense_date),
    merchantName: row.vendor,
    amount: row.amount,
    employeeName: requester?.name ?? "미확인 직원",
  };
}

function mapBaseRequestToDetailItem(
  row: ExpenseRequestDetailRow,
  attachments: ExpenseAttachmentRow[],
): ApprovalDetailItem {
  const requester = getSingleRelation(row.requester);
  const project = getSingleRelation(row.project);
  const category = getSingleRelation(row.category);

  return {
    id: row.id,
    requestNumber: row.request_no,
    requestedAt: formatSupabaseDate(getRequestSortValue(row)),
    employeeName: requester?.name ?? "미확인 직원",
    department: requester?.department ?? "-",
    title: row.title,
    expenseType: category?.name ?? "기타",
    urgency: inferUrgencyLevel(row.title, row.purpose),
    usedDate: formatSupabaseDate(row.expense_date),
    merchantName: row.vendor,
    amount: row.amount,
    paymentMethod: mapDbPaymentMethod(row.payment_method),
    settlementRequest: mapSettlementRequested(row.settlement_requested),
    attendeeInfo: normalizeText(row.attendees, "입력 없음"),
    purpose: normalizeText(row.purpose),
    detailMemo: normalizeText(row.memo, "등록된 메모가 없습니다."),
    relatedProject: project?.name ?? "미지정 프로젝트",
    budgetCategory: category?.name ?? "미분류",
    status: mapDbExpenseStatus(row.status),
    attachmentStatus: mapDbEvidenceStatus(row.evidence_status),
    attachments: attachments.map((attachment) => ({
      id: attachment.id,
      typeLabel: mapAttachmentFileType(attachment.file_type),
      fileName: attachment.file_name,
    })),
    adminMemo: row.reject_reason ?? "",
  };
}

function getSupabaseErrorDetails(error: unknown): SaveErrorState {
  return {
    message: getUserFacingSupabaseMessage(error, "알 수 없는 오류가 발생했습니다."),
    code: null,
    details: null,
    hint: null,
  };
}

function getStatusFromDecision(decision: ReviewDecision): DbExpenseStatus {
  switch (decision) {
    case "승인":
      return "approved";
    case "반려":
      return "rejected";
    case "수정요청":
      return "revision_requested";
    default:
      return "submitted";
  }
}

export default function ApprovalDetailReviewPage() {
  const router = useRouter();
  const params = useParams<{ requestNumber: string }>();
  const requestId = decodeURIComponent(params.requestNumber);

  const [detailItem, setDetailItem] = useState<ApprovalDetailItem | null>(null);
  const [projectMonthlySpent, setProjectMonthlySpent] = useState(0);
  const [employeeMonthlyTotal, setEmployeeMonthlyTotal] = useState(0);
  const [recentSimilarExpenses, setRecentSimilarExpenses] = useState<RecentSimilarExpense[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [approvedAmount, setApprovedAmount] = useState("");
  const [decision, setDecision] = useState<ReviewDecision>("승인");
  const [adminMemo, setAdminMemo] = useState("");
  const [settlementProcessing, setSettlementProcessing] =
    useState<SettlementProcessingOption>("정산 대상 아님");
  const [includeAccounting, setIncludeAccounting] = useState(true);
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [saveError, setSaveError] = useState<SaveErrorState | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadExpenseDetail() {
      setIsLoading(true);
      setLoadError(null);
      setSaveError(null);

      if (!isSupabaseConfigured) {
        if (!isMounted) {
          return;
        }

        setLoadError(
          "Supabase 환경변수가 설정되지 않았습니다. NEXT_PUBLIC_SUPABASE_URL과 NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY를 확인해주세요.",
        );
        setDetailItem(null);
        setIsLoading(false);
        return;
      }

      try {
        const supabase = getSupabaseBrowserClient();

        const { data: baseRequest, error: baseError } = await supabase
          .from("expense_requests")
          .select(
            `
              id,
              request_no,
              user_id,
              project_id,
              category_id,
              title,
              purpose,
              expense_date,
              vendor,
              amount,
              payment_method,
              settlement_requested,
              attendees,
              memo,
              status,
              evidence_status,
              requested_at,
              created_at,
              approved_at,
              approver_id,
              reject_reason,
              requester:profiles!expense_requests_user_id_fkey (
                id,
                name,
                department,
                role,
                email
              ),
              project:projects!expense_requests_project_id_fkey (
                id,
                name,
                status
              ),
              category:expense_categories!expense_requests_category_id_fkey (
                id,
                name,
                is_active
              )
            `,
          )
          .eq("id", requestId)
          .maybeSingle();

        if (baseError) {
          throw baseError;
        }

        if (!baseRequest) {
          if (!isMounted) {
            return;
          }

          setDetailItem(null);
          setProjectMonthlySpent(0);
          setEmployeeMonthlyTotal(0);
          setRecentSimilarExpenses([]);
          return;
        }

        const row = baseRequest as ExpenseRequestDetailRow;
        const monthRange = getMonthRange(row.expense_date);

        const [
          attachmentsResult,
          projectMonthlyResult,
          employeeMonthlyResult,
          recentSimilarResult,
        ] = await Promise.all([
          supabase
            .from("expense_attachments")
            .select("id, file_type, file_name, file_path, created_at")
            .eq("expense_request_id", row.id)
            .order("created_at", { ascending: true }),
          row.project_id
            ? supabase
                .from("expense_requests")
                .select("amount")
                .eq("project_id", row.project_id)
                .gte("expense_date", monthRange.start)
                .lte("expense_date", monthRange.end)
            : Promise.resolve({ data: [], error: null }),
          supabase
            .from("expense_requests")
            .select("amount")
            .eq("user_id", row.user_id)
            .gte("expense_date", monthRange.start)
            .lte("expense_date", monthRange.end),
          row.category_id
            ? supabase
                .from("expense_requests")
                .select(
                  `
                    id,
                    request_no,
                    title,
                    expense_date,
                    vendor,
                    amount,
                    requester:profiles!expense_requests_user_id_fkey (
                      name
                    )
                  `,
                )
                .eq("category_id", row.category_id)
                .neq("id", row.id)
                .order("expense_date", { ascending: false })
                .limit(3)
            : Promise.resolve({ data: [], error: null }),
        ]);

        if (attachmentsResult.error) {
          throw attachmentsResult.error;
        }

        if (projectMonthlyResult.error) {
          throw projectMonthlyResult.error;
        }

        if (employeeMonthlyResult.error) {
          throw employeeMonthlyResult.error;
        }

        if (recentSimilarResult.error) {
          throw recentSimilarResult.error;
        }

        if (!isMounted) {
          return;
        }

        const mappedItem = mapBaseRequestToDetailItem(
          row,
          (attachmentsResult.data ?? []) as ExpenseAttachmentRow[],
        );

        setDetailItem(mappedItem);
        setProjectMonthlySpent(
          ((projectMonthlyResult.data ?? []) as Array<{ amount: number }>).reduce(
            (sum, item) => sum + item.amount,
            0,
          ),
        );
        setEmployeeMonthlyTotal(
          ((employeeMonthlyResult.data ?? []) as Array<{ amount: number }>).reduce(
            (sum, item) => sum + item.amount,
            0,
          ),
        );
        setRecentSimilarExpenses(
          ((recentSimilarResult.data ?? []) as SimilarExpenseRow[]).map(mapRecentSimilarExpense),
        );

        setApprovedAmount(String(mappedItem.amount));
        setDecision(getDefaultDecision(mappedItem));
        setAdminMemo(mappedItem.adminMemo);
        setSettlementProcessing(getDefaultSettlementProcessing(mappedItem));
        setIncludeAccounting(true);
        setErrors({});
      } catch (error) {
        const errorDetails = getSupabaseErrorDetails(error);

        if (!isMounted) {
          return;
        }

        setLoadError(errorDetails.message);
        setDetailItem(null);
        setProjectMonthlySpent(0);
        setEmployeeMonthlyTotal(0);
        setRecentSimilarExpenses([]);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadExpenseDetail();

    return () => {
      isMounted = false;
    };
  }, [requestId]);

  const requestedAmount = detailItem?.amount ?? 0;
  const numericApprovedAmount = Number(approvedAmount);
  const hasAttachment = Boolean(detailItem?.attachments.length);
  const isPartialApproval =
    approvedAmount.trim().length > 0 &&
    numericApprovedAmount > 0 &&
    detailItem !== null &&
    numericApprovedAmount < requestedAmount;

  const settlementTargetText = useMemo(() => {
    if (settlementProcessing === "정산 대상 아님") {
      return "정산 대상 아님";
    }

    return "정산 대상";
  }, [settlementProcessing]);

  function handleApprovedAmountChange(value: string) {
    if (!detailItem) {
      return;
    }

    setSaveError(null);

    if (value.trim().length === 0) {
      setApprovedAmount("");
      setErrors((current) => ({ ...current, approvedAmount: undefined }));
      return;
    }

    const nextValue = Number(value);

    if (Number.isNaN(nextValue)) {
      setApprovedAmount(value);
      return;
    }

    const clampedAmount = Math.min(nextValue, detailItem.amount);
    setApprovedAmount(String(clampedAmount));
    setErrors((current) => ({ ...current, approvedAmount: undefined }));
  }

  async function handleSave() {
    if (!detailItem) {
      return;
    }

    setSaveError(null);

    const nextErrors: ValidationErrors = {};

    if (approvedAmount.trim().length === 0 || Number.isNaN(numericApprovedAmount)) {
      nextErrors.approvedAmount = "승인 금액을 입력해주세요.";
    } else if (numericApprovedAmount > requestedAmount) {
      nextErrors.approvedAmount = "승인 금액은 요청 금액보다 클 수 없습니다.";
    }

    if ((decision === "반려" || decision === "수정요청") && adminMemo.trim().length === 0) {
      nextErrors.adminMemo = "반려 또는 수정요청 사유를 입력해주세요.";
    }

    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    if (!hasAttachment && decision === "승인" && settlementProcessing === "월말 정산 포함") {
      const shouldContinue = window.confirm(
        "증빙이 없는 경비를 월말 정산에 포함하려고 합니다. 계속하시겠습니까?",
      );

      if (!shouldContinue) {
        return;
      }
    }

    if (!isSupabaseConfigured) {
      setSaveError({
        message:
          "Supabase 환경변수가 설정되지 않았습니다. NEXT_PUBLIC_SUPABASE_URL과 NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY를 확인해주세요.",
        code: "SUPABASE_ENV_MISSING",
        details: null,
        hint: "환경변수를 확인한 뒤 다시 시도해주세요.",
      });
      return;
    }

    setIsSaving(true);

    try {
      const supabase = getSupabaseBrowserClient();

      const { data: approverRows, error: approverError } = await supabase
        .from("profiles")
        .select("id, role, is_active")
        .in("role", ["manager", "admin"])
        .eq("is_active", true)
        .order("created_at", { ascending: true })
        .limit(1);

      if (approverError) {
        throw approverError;
      }

      const approver = (approverRows?.[0] ?? null) as ApproverProfileRow | null;

      if (!approver?.id) {
        throw new Error("manager 또는 admin 역할의 approver_id를 찾을 수 없습니다.");
      }

      const nextStatus = getStatusFromDecision(decision);
      const approvedAt = decision === "승인" ? new Date().toISOString() : null;
      const normalizedAdminMemo = adminMemo.trim();

      const { error: updateError } = await supabase
        .from("expense_requests")
        .update({
          status: nextStatus,
          approved_at: approvedAt,
          approver_id: approver.id,
          reject_reason: normalizedAdminMemo.length > 0 ? normalizedAdminMemo : null,
        })
        .eq("id", detailItem.id)
        .select("id, status")
        .single();

      if (updateError) {
        throw updateError;
      }

      window.alert("검토 결과가 저장되었습니다.");
      router.push("/approvals/pending");
    } catch (error) {
      setSaveError(getSupabaseErrorDetails(error));
    } finally {
      setIsSaving(false);
    }
  }

  if (!detailItem && !isLoading && !loadError) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="지출 상세 검토"
          description="직원이 제출한 경비 요청 내용을 확인하고 승인 검토에 필요한 정보를 확인합니다."
          roles={roleViews}
          activeRole="관리자 보기"
          eyebrow="관리자 승인"
          badgeText="상세 검토"
        />

        <section className="rounded-[1.75rem] border border-slate-200/90 bg-white p-8 shadow-sm">
          <EmptyState
            className="mt-0 border-none bg-slate-50 px-0 py-0"
            title="요청 정보를 찾을 수 없습니다."
            description="선택한 요청 id에 해당하는 `expense_requests` 데이터가 없습니다."
          />
          <button
            type="button"
            onClick={() => router.push("/approvals/pending")}
            className="mt-6 inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
          >
            <ArrowLeft className="h-4 w-4" strokeWidth={1.8} />
            목록으로
          </button>
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="지출 상세 검토"
        description="직원이 제출한 경비 요청 내용을 확인하고 승인, 반려, 수정요청 판단에 필요한 정보를 검토합니다."
        roles={roleViews}
        activeRole="관리자 보기"
        eyebrow="관리자 승인"
        badgeText="상세 검토"
      />

      {loadError ? (
        <section className="rounded-[1.75rem] border border-rose-200 bg-rose-50 px-5 py-4 text-sm leading-6 text-rose-700 shadow-sm">
          <p className="font-semibold">지출 상세 정보를 불러오지 못했습니다.</p>
          <p className="mt-2 whitespace-pre-wrap break-words">{loadError}</p>
        </section>
      ) : null}

      {saveError ? (
        <section className="rounded-[1.75rem] border border-rose-200 bg-rose-50 px-5 py-4 text-sm leading-6 text-rose-700 shadow-sm">
          <p className="font-semibold">처리 저장에 실패했습니다.</p>
          <p className="mt-2 whitespace-pre-wrap break-words">{saveError.message}</p>
        </section>
      ) : null}

      {isLoading ? (
        <section className="rounded-[1.75rem] border border-slate-200/90 bg-white p-8 shadow-sm">
          <EmptyState
            className="mt-0 border-none bg-slate-50 px-0 py-0"
            title="지출 상세 정보를 불러오는 중입니다."
            description="Supabase에서 요청 본문과 관련 데이터를 함께 조회하고 있습니다."
          />
        </section>
      ) : null}

      {detailItem ? (
        <section className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
          <div className="space-y-6">
            <InfoCard title="기본 정보">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl bg-slate-50 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">요청번호</p>
                  <p className="mt-2 text-sm font-semibold text-slate-900">{detailItem.requestNumber}</p>
                </div>
                <div className="rounded-2xl bg-slate-50 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">현재 상태</p>
                  <div className="mt-2">
                    <StatusBadge status={detailItem.status} />
                  </div>
                </div>
                <div className="rounded-2xl bg-slate-50 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">요청일</p>
                  <p className="mt-2 text-sm font-semibold text-slate-900">{detailItem.requestedAt}</p>
                </div>
                <div className="rounded-2xl bg-slate-50 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">요청 직원</p>
                  <p className="mt-2 text-sm font-semibold text-slate-900">{detailItem.employeeName}</p>
                </div>
                <div className="rounded-2xl bg-slate-50 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">부서</p>
                  <p className="mt-2 text-sm font-semibold text-slate-900">{detailItem.department}</p>
                </div>
                <div className="rounded-2xl bg-slate-50 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">긴급 여부</p>
                  <div className="mt-2">
                    <UrgencyBadge urgency={detailItem.urgency} />
                  </div>
                </div>
                <div className="rounded-2xl bg-slate-50 px-4 py-3 md:col-span-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">경비 제목</p>
                  <p className="mt-2 text-sm font-semibold text-slate-900">{detailItem.title}</p>
                </div>
                <div className="rounded-2xl bg-slate-50 px-4 py-3 md:col-span-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">경비 유형</p>
                  <p className="mt-2 text-sm font-semibold text-slate-900">{detailItem.expenseType}</p>
                </div>
              </div>
            </InfoCard>

            <InfoCard title="사용 내역">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl bg-slate-50 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">사용일</p>
                  <p className="mt-2 text-sm font-semibold text-slate-900">{detailItem.usedDate}</p>
                </div>
                <div className="rounded-2xl bg-slate-50 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">사용처</p>
                  <p className="mt-2 text-sm font-semibold text-slate-900">{detailItem.merchantName}</p>
                </div>
                <div className="rounded-2xl bg-slate-50 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">금액</p>
                  <p className="mt-2 text-sm font-semibold text-slate-900">
                    <AmountText value={detailItem.amount} />
                  </p>
                </div>
                <div className="rounded-2xl bg-slate-50 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">결제수단</p>
                  <p className="mt-2 text-sm font-semibold text-slate-900">{detailItem.paymentMethod}</p>
                </div>
                <div className="rounded-2xl bg-slate-50 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">정산 요청 여부</p>
                  <p className="mt-2 text-sm font-semibold text-slate-900">{detailItem.settlementRequest}</p>
                </div>
                <div className="rounded-2xl bg-slate-50 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">참석자/사용 대상</p>
                  <p className="mt-2 text-sm font-semibold text-slate-900">{detailItem.attendeeInfo}</p>
                </div>
                <div className="rounded-2xl bg-slate-50 px-4 py-3 md:col-span-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">사용 목적</p>
                  <p className="mt-2 text-sm leading-6 text-slate-700">{detailItem.purpose}</p>
                </div>
                <div className="rounded-2xl bg-slate-50 px-4 py-3 md:col-span-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">메모</p>
                  <p className="mt-2 text-sm leading-6 text-slate-700">{detailItem.detailMemo}</p>
                </div>
              </div>
            </InfoCard>

            <InfoCard title="관련 업무">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl bg-slate-50 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">관련 프로젝트</p>
                  <p className="mt-2 text-sm font-semibold text-slate-900">{detailItem.relatedProject}</p>
                </div>
                <div className="rounded-2xl bg-slate-50 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">예산 항목</p>
                  <p className="mt-2 text-sm font-semibold text-slate-900">{detailItem.budgetCategory}</p>
                </div>
                <div className="rounded-2xl bg-slate-50 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">해당 프로젝트 월 사용액</p>
                  <p className="mt-2 text-sm font-semibold text-slate-900">
                    <AmountText value={projectMonthlySpent} />
                  </p>
                </div>
                <div className="rounded-2xl bg-slate-50 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">해당 직원 이번 달 누적 경비</p>
                  <p className="mt-2 text-sm font-semibold text-slate-900">
                    <AmountText value={employeeMonthlyTotal} />
                  </p>
                </div>
              </div>

              <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-semibold text-slate-900">동일 유형 최근 사용 내역 3건</p>
                <div className="mt-3 space-y-3">
                  {recentSimilarExpenses.length > 0 ? (
                    recentSimilarExpenses.map((recentItem) => (
                      <div
                        key={recentItem.id}
                        className="flex flex-col gap-2 rounded-2xl bg-white px-4 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{recentItem.title}</p>
                          <p className="mt-1 text-xs text-slate-500">
                            {recentItem.employeeName} · {recentItem.usedDate} · {recentItem.merchantName}
                          </p>
                        </div>
                        <div className="text-sm font-semibold text-slate-900">
                          <AmountText value={recentItem.amount} />
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-slate-500">비교할 동일 유형 최근 사용 내역이 없습니다.</p>
                  )}
                </div>
              </div>
            </InfoCard>

            <InfoCard title="증빙 자료">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl bg-slate-50 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">증빙 상태</p>
                  <div className="mt-2">
                    <StatusBadge status={detailItem.attachmentStatus} />
                  </div>
                </div>
                <div className="rounded-2xl bg-slate-50 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">첨부 유형</p>
                  <p className="mt-2 text-sm font-semibold text-slate-900">
                    {hasAttachment
                      ? detailItem.attachments.map((attachment) => attachment.typeLabel).join(", ")
                      : "미첨부"}
                  </p>
                </div>
              </div>

              <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm font-semibold text-slate-900">첨부 파일명</p>
                  <div className="mt-3 space-y-2">
                    {hasAttachment ? (
                      detailItem.attachments.map((attachment) => (
                        <div
                          key={attachment.id}
                          className="rounded-2xl bg-white px-4 py-3 shadow-sm"
                        >
                          <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                            {attachment.typeLabel}
                          </span>
                          <p className="mt-2 text-sm font-medium text-slate-700">{attachment.fileName}</p>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-slate-500">첨부된 파일이 없습니다.</p>
                    )}
                  </div>
                </div>

                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4">
                  <p className="text-sm font-semibold text-slate-900">첨부 파일 미리보기</p>
                  <div className="mt-3 flex min-h-[220px] items-center justify-center rounded-2xl bg-white px-6 py-10 text-center shadow-sm">
                    {hasAttachment ? (
                      <div>
                        <Receipt className="mx-auto h-10 w-10 text-slate-400" strokeWidth={1.6} />
                        <p className="mt-4 text-sm font-semibold text-slate-900">
                          {detailItem.attachments[0]?.fileName}
                        </p>
                        <p className="mt-2 text-sm text-slate-500">
                          실제 파일 미리보기는 아직 연결되지 않았고, 현재는 파일명만 표시합니다.
                        </p>
                      </div>
                    ) : (
                      <div>
                        <FileText className="mx-auto h-10 w-10 text-slate-300" strokeWidth={1.6} />
                        <p className="mt-4 text-sm font-semibold text-slate-500">
                          미리볼 증빙자료가 없습니다.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {!hasAttachment ? (
                <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-4 text-sm leading-6 text-rose-700">
                  증빙자료가 첨부되지 않았습니다. 승인하더라도 정산이 보류될 수 있습니다.
                </div>
              ) : null}
            </InfoCard>
          </div>

          <aside className="space-y-6 xl:sticky xl:top-6 xl:self-start">
            <section className="rounded-[1.75rem] border border-slate-200/90 bg-white p-5 shadow-sm">
              <h3 className="text-lg font-semibold text-slate-950">승인 처리 패널</h3>
              <p className="mt-1 text-sm text-slate-500">
                요청 금액과 증빙 상태를 확인하고 검토 결과를 저장합니다.
              </p>

              <div className="mt-5 grid gap-3">
                <SummaryBlock label="요청 금액" value={<AmountText value={requestedAmount} />} />
                <SummaryBlock
                  label="승인 가능 금액"
                  value={
                    approvedAmount ? (
                      <AmountText value={Number(approvedAmount)} />
                    ) : (
                      <span className="text-slate-400">미입력</span>
                    )
                  }
                  tone={isPartialApproval ? "warning" : "default"}
                />
                <SummaryBlock
                  label="정산 대상 여부"
                  value={settlementTargetText}
                  tone={settlementTargetText === "정산 대상" ? "success" : "default"}
                />
                <SummaryBlock
                  label="증빙 상태"
                  value={hasAttachment ? "증빙 첨부 완료" : "증빙 미첨부"}
                  tone={hasAttachment ? "success" : "danger"}
                />
                <SummaryBlock
                  label="예산 위험 여부"
                  value="별도 계산 전"
                  tone="warning"
                />
              </div>

              <div className="mt-6 space-y-5">
                <div>
                  <label htmlFor="approved-amount" className="text-sm font-semibold text-slate-900">
                    승인 금액
                  </label>
                  <input
                    id="approved-amount"
                    type="number"
                    min="0"
                    max={requestedAmount}
                    value={approvedAmount}
                    onChange={(event) => handleApprovedAmountChange(event.target.value)}
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-[var(--primary)] focus:ring-4 focus:ring-[color:rgba(22,59,111,0.08)]"
                  />
                  <p className="mt-2 text-sm text-slate-500">
                    최대 입력 가능 금액:
                    {" "}
                    <AmountText value={requestedAmount} className="font-semibold text-slate-900" />
                  </p>
                  {isPartialApproval ? (
                    <p className="mt-2 text-sm text-amber-700">
                      요청 금액보다 적게 입력되어 부분 승인으로 처리됩니다.
                    </p>
                  ) : null}
                  {errors.approvedAmount ? (
                    <p className="mt-2 text-sm text-rose-500">{errors.approvedAmount}</p>
                  ) : null}
                </div>

                <div>
                  <p className="text-sm font-semibold text-slate-900">처리 결과</p>
                  <div className="mt-2 grid gap-3">
                    {(["승인", "반려", "수정요청"] as ReviewDecision[]).map((option) => (
                      <label
                        key={option}
                        className={[
                          "flex cursor-pointer items-center gap-3 rounded-2xl border px-4 py-3 text-sm font-medium shadow-sm transition",
                          decision === option
                            ? "border-[var(--primary)] bg-[var(--primary-soft)] text-[var(--primary)]"
                            : "border-slate-200 bg-white text-slate-700 hover:border-slate-300",
                        ].join(" ")}
                      >
                        <input
                          type="radio"
                          name="reviewDecision"
                          value={option}
                          checked={decision === option}
                          onChange={(event) => {
                            setDecision(event.target.value as ReviewDecision);
                            setSaveError(null);
                          }}
                          className="h-4 w-4 border-slate-300 text-[var(--primary)] focus:ring-[var(--primary)]"
                        />
                        <span>{option}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label htmlFor="admin-memo" className="text-sm font-semibold text-slate-900">
                    관리자 메모
                  </label>
                  <textarea
                    id="admin-memo"
                    value={adminMemo}
                    onChange={(event) => {
                      setAdminMemo(event.target.value);
                      setSaveError(null);
                      setErrors((current) => ({ ...current, adminMemo: undefined }));
                    }}
                    placeholder="승인/반려/수정요청 사유를 입력하세요."
                    className="mt-2 min-h-[140px] w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-[var(--primary)] focus:ring-4 focus:ring-[color:rgba(22,59,111,0.08)]"
                  />
                  {errors.adminMemo ? (
                    <p className="mt-2 text-sm text-rose-500">{errors.adminMemo}</p>
                  ) : null}
                </div>

                <div>
                  <label htmlFor="settlement-processing" className="text-sm font-semibold text-slate-900">
                    정산 처리
                  </label>
                  <select
                    id="settlement-processing"
                    value={settlementProcessing}
                    onChange={(event) => {
                      setSettlementProcessing(event.target.value as SettlementProcessingOption);
                      setSaveError(null);
                    }}
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-[var(--primary)] focus:ring-4 focus:ring-[color:rgba(22,59,111,0.08)]"
                  >
                    <option value="월말 정산 포함">월말 정산 포함</option>
                    <option value="정산 보류">정산 보류</option>
                    <option value="정산 대상 아님">정산 대상 아님</option>
                  </select>
                </div>

                <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={includeAccounting}
                    onChange={(event) => setIncludeAccounting(event.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-[var(--primary)] focus:ring-[var(--primary)]"
                  />
                  <span className="text-sm font-medium text-slate-700">회계 자료 포함 여부</span>
                </label>
              </div>

              <div className="mt-6 flex flex-col gap-3">
                <button
                  type="button"
                  onClick={() => router.push("/approvals/pending")}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                >
                  <ArrowLeft className="h-4 w-4" strokeWidth={1.8} />
                  목록으로
                </button>
                <button
                  type="button"
                  onClick={() => void handleSave()}
                  disabled={isSaving}
                  className="inline-flex items-center justify-center rounded-2xl bg-[var(--primary)] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[var(--primary-strong)] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSaving ? "저장 중..." : "처리 저장"}
                </button>
              </div>
            </section>

            <section className="rounded-[1.75rem] border border-slate-200/90 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-50 text-amber-700">
                  <CircleAlert className="h-5 w-5" strokeWidth={1.8} />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-950">승인 체크포인트</h3>
                  <p className="mt-1 text-sm text-slate-500">처리 전에 아래 항목을 점검해주세요.</p>
                </div>
              </div>

              <ul className="mt-4 space-y-3">
                {[
                  "업무 관련성이 명확한가?",
                  "사용처와 금액이 적절한가?",
                  "식대/회의비의 경우 참석자가 입력되었는가?",
                  "증빙자료가 첨부되었는가?",
                  "동일 직원의 반복 지출이 과도하지 않은가?",
                ].map((itemText) => (
                  <li key={itemText} className="flex gap-3 text-sm leading-6 text-slate-600">
                    <CheckCircle2
                      className="mt-0.5 h-4 w-4 shrink-0 text-[var(--primary)]"
                      strokeWidth={1.8}
                    />
                    <span>{itemText}</span>
                  </li>
                ))}
              </ul>
            </section>
          </aside>
        </section>
      ) : null}
    </div>
  );
}
