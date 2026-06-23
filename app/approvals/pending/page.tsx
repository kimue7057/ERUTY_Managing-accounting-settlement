"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  BadgeCheck,
  FileWarning,
  Search,
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
  AttachmentStatus,
  PaymentMethod,
  RoleView,
  SettlementRequestOption,
  UrgencyLevel,
} from "@/types";
import {
  formatSupabaseDate,
  getRequestSortValue,
  getSingleRelation,
  inferUrgencyLevel,
  mapDbEvidenceStatus,
  mapDbExpenseStatusToApproval,
  mapDbPaymentMethod,
  mapSettlementRequested,
  type ApprovalDisplayStatus,
  type DbEvidenceStatus,
  type DbExpenseStatus,
  type DbPaymentMethod,
} from "@/utils/expenseRequests";
import { getUserFacingSupabaseMessage } from "@/utils/userFacingError";

const roleViews: RoleView[] = ["직원 보기", "관리자 보기", "대표 보기"];

const approvalStatusOptions = [
  "전체",
  "승인대기",
  "수정요청",
  "승인완료",
  "반려",
] as const;

const baseExpenseTypeOptions = [
  "전체",
  "식대/회의비",
  "교통비",
  "출장비",
  "소모품비",
  "서버/소프트웨어비",
  "기타",
] as const;

const tableColumns = [
  { key: "requestNumber", label: "요청번호" },
  { key: "requestedAt", label: "요청일" },
  { key: "employeeName", label: "직원명" },
  { key: "title", label: "경비 제목" },
  { key: "expenseType", label: "경비 유형" },
  { key: "usedDate", label: "사용일" },
  { key: "merchantName", label: "사용처" },
  { key: "amount", label: "사용 금액", align: "right" as const },
  { key: "paymentMethod", label: "결제수단" },
  { key: "settlementRequest", label: "정산 요청", align: "center" as const },
  { key: "attachmentStatus", label: "증빙 상태", align: "center" as const },
  { key: "status", label: "상태", align: "center" as const },
  { key: "review", label: "검토", align: "center" as const },
];

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

type ExpenseRequestQueueRow = {
  id: string;
  request_no: string;
  title: string;
  purpose: string | null;
  expense_date: string;
  vendor: string;
  amount: number;
  payment_method: DbPaymentMethod;
  settlement_requested: boolean;
  status: DbExpenseStatus;
  evidence_status: DbEvidenceStatus;
  requested_at: string | null;
  created_at: string | null;
  requester: RelationValue<RequesterRelation>;
  project: RelationValue<ProjectRelation>;
  category: RelationValue<CategoryRelation>;
};

type ApprovalQueueListItem = {
  id: string;
  requestNumber: string;
  requestedAt: string;
  employeeName: string;
  department: string;
  title: string;
  expenseType: string;
  usedDate: string;
  merchantName: string;
  amount: number;
  paymentMethod: PaymentMethod;
  settlementRequest: SettlementRequestOption;
  attachmentStatus: AttachmentStatus;
  urgency: UrgencyLevel;
  status: ApprovalDisplayStatus;
};

function mapExpenseRequestToQueueItem(row: ExpenseRequestQueueRow): ApprovalQueueListItem {
  const requester = getSingleRelation(row.requester);
  const category = getSingleRelation(row.category);

  return {
    id: row.id,
    requestNumber: row.request_no,
    requestedAt: formatSupabaseDate(getRequestSortValue(row)),
    employeeName: requester?.name ?? "미확인 직원",
    department: requester?.department ?? "-",
    title: row.title,
    expenseType: category?.name ?? "기타",
    usedDate: formatSupabaseDate(row.expense_date),
    merchantName: row.vendor,
    amount: row.amount,
    paymentMethod: mapDbPaymentMethod(row.payment_method),
    settlementRequest: mapSettlementRequested(row.settlement_requested),
    attachmentStatus: mapDbEvidenceStatus(row.evidence_status),
    urgency: inferUrgencyLevel(row.title, row.purpose),
    status: mapDbExpenseStatusToApproval(row.status),
  };
}

export default function ApprovalPendingPage() {
  const [statusFilter, setStatusFilter] =
    useState<(typeof approvalStatusOptions)[number]>("전체");
  const [expenseTypeFilter, setExpenseTypeFilter] =
    useState<(typeof baseExpenseTypeOptions)[number] | string>("전체");
  const [employeeQuery, setEmployeeQuery] = useState("");
  const [titleMerchantQuery, setTitleMerchantQuery] = useState("");
  const [items, setItems] = useState<ApprovalQueueListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadApprovalQueue() {
      setIsLoading(true);
      setLoadError(null);

      if (!isSupabaseConfigured) {
        if (!isMounted) {
          return;
        }

        setLoadError(
          "Supabase 환경변수가 설정되지 않았습니다. NEXT_PUBLIC_SUPABASE_URL과 NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY를 확인해주세요.",
        );
        setItems([]);
        setIsLoading(false);
        return;
      }

      try {
        const supabase = getSupabaseBrowserClient();
        const { data, error } = await supabase
          .from("expense_requests")
          .select(
            `
              id,
              request_no,
              title,
              purpose,
              expense_date,
              vendor,
              amount,
              payment_method,
              settlement_requested,
              status,
              evidence_status,
              requested_at,
              created_at,
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
          .in("status", ["submitted", "revision_requested", "approved", "rejected"])
          .order("requested_at", { ascending: false })
          .order("created_at", { ascending: false });

        if (error) {
          throw error;
        }

        if (!isMounted) {
          return;
        }

        const mappedItems = ((data ?? []) as ExpenseRequestQueueRow[]).map(
          mapExpenseRequestToQueueItem,
        );

        setItems(mappedItems);
      } catch (error) {
        const message = getUserFacingSupabaseMessage(
          error,
          "승인 대기함 데이터를 불러오는 중 알 수 없는 오류가 발생했습니다.",
        );

        if (!isMounted) {
          return;
        }

        setLoadError(message);
        setItems([]);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadApprovalQueue();

    return () => {
      isMounted = false;
    };
  }, []);

  const expenseTypeOptions = useMemo(() => {
    const optionSet = new Set<string>(baseExpenseTypeOptions);

    items.forEach((item) => {
      optionSet.add(item.expenseType);
    });

    return Array.from(optionSet);
  }, [items]);

  const filteredItems = useMemo(() => {
    const normalizedEmployeeQuery = employeeQuery.trim().toLowerCase();
    const normalizedTitleMerchantQuery = titleMerchantQuery.trim().toLowerCase();

    return items.filter((item) => {
      const matchesStatus = statusFilter === "전체" || item.status === statusFilter;
      const matchesType = expenseTypeFilter === "전체" || item.expenseType === expenseTypeFilter;
      const matchesEmployee =
        normalizedEmployeeQuery.length === 0 ||
        item.employeeName.toLowerCase().includes(normalizedEmployeeQuery);
      const matchesTitleMerchant =
        normalizedTitleMerchantQuery.length === 0 ||
        item.title.toLowerCase().includes(normalizedTitleMerchantQuery) ||
        item.merchantName.toLowerCase().includes(normalizedTitleMerchantQuery);

      return matchesStatus && matchesType && matchesEmployee && matchesTitleMerchant;
    });
  }, [employeeQuery, expenseTypeFilter, items, statusFilter, titleMerchantQuery]);

  const summary = useMemo(() => {
    const pendingItems = items.filter((item) => item.status === "승인대기");
    const missingProofCount = items.filter((item) => item.attachmentStatus === "미첨부").length;
    const urgentCount = items.filter((item) => item.urgency === "긴급").length;

    return {
      pendingCount: pendingItems.length,
      pendingAmount: pendingItems.reduce((sum, item) => sum + item.amount, 0),
      missingProofCount,
      urgentCount,
    };
  }, [items]);

  const summaryCards = [
    {
      id: "pending-count",
      title: "승인 대기 건수",
      value: isLoading ? <span className="text-base text-slate-400">불러오는 중...</span> : <span>{summary.pendingCount}건</span>,
      description: "현재 검토가 필요한 경비 요청 건수",
      icon: <BadgeCheck className="h-5 w-5" strokeWidth={1.8} />,
    },
    {
      id: "pending-amount",
      title: "승인 대기 총액",
      value: isLoading ? <span className="text-base text-slate-400">불러오는 중...</span> : <AmountText value={summary.pendingAmount} />,
      description: "승인대기 상태 요청의 전체 금액",
      icon: <WalletCards className="h-5 w-5" strokeWidth={1.8} />,
    },
    {
      id: "missing-proof",
      title: "증빙 미첨부 건수",
      value: isLoading ? <span className="text-base text-slate-400">불러오는 중...</span> : <span>{summary.missingProofCount}건</span>,
      description: "추가 증빙 확인이 필요한 요청",
      icon: <FileWarning className="h-5 w-5" strokeWidth={1.8} />,
    },
    {
      id: "urgent-count",
      title: "긴급 요청 건수",
      value: isLoading ? <span className="text-base text-slate-400">불러오는 중...</span> : <span>{summary.urgentCount}건</span>,
      description: "제목 또는 목적에 긴급 표시가 포함된 요청",
      icon: <AlertTriangle className="h-5 w-5" strokeWidth={1.8} />,
    },
  ];

  return (
    <div className="space-y-8">
      <PageHeader
        title="승인 대기함"
        description="직원들이 제출한 경비 요청을 검토하고 승인, 반려, 수정요청 전환 전까지 목록으로 확인합니다."
        roles={roleViews}
        activeRole="관리자 보기"
        eyebrow="관리자 승인"
        badgeText="검토 대기 요청"
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((card) => (
          <StatCard
            key={card.id}
            title={card.title}
            description={card.description}
            value={card.value}
            icon={card.icon}
          />
        ))}
      </section>

      {loadError ? (
        <section className="rounded-[1.75rem] border border-rose-200 bg-rose-50 px-5 py-4 text-sm leading-6 text-rose-700 shadow-sm">
          <p className="font-semibold">승인 대기함 데이터를 불러오지 못했습니다.</p>
          <p className="mt-2 whitespace-pre-wrap break-words">{loadError}</p>
        </section>
      ) : null}

      <section className="rounded-[1.75rem] border border-slate-200/90 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <h3 className="text-lg font-semibold text-slate-950">필터 및 검색</h3>
              <p className="mt-1 text-sm text-slate-500">
                상태, 경비 유형, 직원명, 제목·사용처 기준으로 관리자 검토 대상을 빠르게 좁혀볼 수 있습니다.
              </p>
            </div>
            <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">
              {isLoading ? "데이터를 불러오는 중입니다" : `총 ${filteredItems.length}건 표시`}
            </span>
          </div>

          <div className="grid gap-4 xl:grid-cols-[180px_210px_minmax(0,0.8fr)_minmax(0,1fr)]">
            <div>
              <label htmlFor="approval-status-filter" className="text-sm font-semibold text-slate-900">
                상태
              </label>
              <select
                id="approval-status-filter"
                value={statusFilter}
                disabled={isLoading}
                onChange={(event) =>
                  setStatusFilter(event.target.value as (typeof approvalStatusOptions)[number])
                }
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-[var(--primary)] focus:ring-4 focus:ring-[color:rgba(22,59,111,0.08)] disabled:bg-slate-50 disabled:text-slate-400"
              >
                {approvalStatusOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="approval-expense-type-filter" className="text-sm font-semibold text-slate-900">
                경비 유형
              </label>
              <select
                id="approval-expense-type-filter"
                value={expenseTypeFilter}
                disabled={isLoading}
                onChange={(event) => setExpenseTypeFilter(event.target.value)}
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-[var(--primary)] focus:ring-4 focus:ring-[color:rgba(22,59,111,0.08)] disabled:bg-slate-50 disabled:text-slate-400"
              >
                {expenseTypeOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="employee-search" className="text-sm font-semibold text-slate-900">
                직원명 검색
              </label>
              <div className="relative mt-2">
                <Search
                  className="pointer-events-none absolute left-4 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-slate-400"
                  strokeWidth={1.8}
                />
                <input
                  id="employee-search"
                  type="text"
                  value={employeeQuery}
                  disabled={isLoading}
                  onChange={(event) => setEmployeeQuery(event.target.value)}
                  placeholder="예: 공하연, 김태우"
                  className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-[var(--primary)] focus:ring-4 focus:ring-[color:rgba(22,59,111,0.08)] disabled:bg-slate-50 disabled:text-slate-400"
                />
              </div>
            </div>

            <div>
              <label htmlFor="title-merchant-search" className="text-sm font-semibold text-slate-900">
                사용처/제목 검색
              </label>
              <div className="relative mt-2">
                <Search
                  className="pointer-events-none absolute left-4 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-slate-400"
                  strokeWidth={1.8}
                />
                <input
                  id="title-merchant-search"
                  type="text"
                  value={titleMerchantQuery}
                  disabled={isLoading}
                  onChange={(event) => setTitleMerchantQuery(event.target.value)}
                  placeholder="예: 스타벅스, 행사, AWS"
                  className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-[var(--primary)] focus:ring-4 focus:ring-[color:rgba(22,59,111,0.08)] disabled:bg-slate-50 disabled:text-slate-400"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-[1.75rem] border border-slate-200/90 bg-white p-5 shadow-sm">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-slate-950">관리자 검토 목록</h3>
          <p className="mt-1 text-sm text-slate-500">
            Supabase의 `expense_requests` 전체 요청 중 승인 흐름에 있는 건만 최신순으로 보여줍니다.
          </p>
        </div>

        <DashboardTable columns={tableColumns}>
          {filteredItems.map((item) => (
            <tr
              key={item.id}
              className={[
                "border-b border-slate-100 last:border-b-0",
                item.attachmentStatus === "미첨부" ? "bg-rose-50/40" : "",
              ].join(" ")}
            >
              <td className="px-4 py-4 font-medium text-slate-700">{item.requestNumber}</td>
              <td className="px-4 py-4 text-slate-500">
                <time dateTime={item.requestedAt}>{item.requestedAt}</time>
              </td>
              <td className="px-4 py-4 font-medium text-slate-900">{item.employeeName}</td>
              <td className="px-4 py-4 text-slate-900">{item.title}</td>
              <td className="px-4 py-4 text-slate-600">{item.expenseType}</td>
              <td className="px-4 py-4 text-slate-500">
                <time dateTime={item.usedDate}>{item.usedDate}</time>
              </td>
              <td className="px-4 py-4 text-slate-600">{item.merchantName}</td>
              <td className="px-4 py-4 text-right font-medium text-slate-900">
                <AmountText value={item.amount} />
              </td>
              <td className="px-4 py-4 text-slate-600">{item.paymentMethod}</td>
              <td className="px-4 py-4 text-center text-slate-600">{item.settlementRequest}</td>
              <td className="px-4 py-4 text-center">
                <StatusBadge status={item.attachmentStatus} />
              </td>
              <td className="px-4 py-4 text-center">
                <StatusBadge status={item.status} />
              </td>
              <td className="px-4 py-4 text-center">
                <Link
                  href={`/approvals/pending/${encodeURIComponent(item.id)}`}
                  className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
                >
                  검토
                </Link>
              </td>
            </tr>
          ))}
        </DashboardTable>

        {isLoading ? (
          <EmptyState
            title="승인 대기함 데이터를 불러오는 중입니다."
            description="Supabase에서 직원 경비 요청과 관계 데이터를 조회하고 있습니다."
          />
        ) : null}

        {!isLoading && !loadError && items.length > 0 && filteredItems.length === 0 ? (
          <EmptyState
            title="조건에 맞는 승인 요청이 없습니다."
            description="상태, 경비 유형, 검색어를 조정해서 다른 요청을 확인해보세요."
          />
        ) : null}

        {!isLoading && !loadError && items.length === 0 ? (
          <EmptyState
            title="표시할 승인 요청이 없습니다."
            description="현재 `submitted`, `revision_requested`, `approved`, `rejected` 상태의 요청이 없습니다."
          />
        ) : null}
      </section>
    </div>
  );
}
