"use client";

import { useMemo, useState } from "react";
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
import { roleViews } from "@/data/mockData";
import { useApprovalQueueItems, updateApprovalQueueReview } from "@/stores/approvalQueueStore";
import type {
  ApprovalAttachmentFile,
  ApprovalQueueItem,
  ReviewDecision,
  SettlementProcessingOption,
  UrgencyLevel,
} from "@/types";

type ValidationErrors = {
  approvedAmount?: string;
  adminMemo?: string;
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
  children: React.ReactNode;
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
  value: React.ReactNode;
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

function getDefaultSettlementProcessing(item: ApprovalQueueItem): SettlementProcessingOption {
  if (item.settlementProcessing) {
    return item.settlementProcessing;
  }

  if (item.paymentMethod === "개인카드" || item.paymentMethod === "현금") {
    return item.attachments.length > 0 ? "월말 정산 포함" : "정산 보류";
  }

  return "정산 대상 아님";
}

function getDefaultDecision(item: ApprovalQueueItem): ReviewDecision {
  if (item.reviewDecision) {
    return item.reviewDecision;
  }

  if (item.status === "반려") {
    return "반려";
  }

  if (item.status === "수정요청") {
    return "수정요청";
  }

  return "승인";
}

function buildRecentSimilarExpenses(
  item: ApprovalQueueItem,
  items: ApprovalQueueItem[],
) {
  return items
    .filter(
      (candidate) =>
        candidate.requestNumber !== item.requestNumber && candidate.expenseType === item.expenseType,
    )
    .sort((a, b) => b.usedDate.localeCompare(a.usedDate))
    .slice(0, 3);
}

export default function ApprovalDetailReviewPage() {
  const router = useRouter();
  const params = useParams<{ requestNumber: string }>();
  const items = useApprovalQueueItems();
  const requestNumber = decodeURIComponent(params.requestNumber);
  const item = useMemo(
    () => items.find((candidate) => candidate.requestNumber === requestNumber) ?? null,
    [items, requestNumber],
  );

  const [approvedAmount, setApprovedAmount] = useState(() =>
    item ? String(item.approvedAmount ?? item.amount) : "",
  );
  const [decision, setDecision] = useState<ReviewDecision>(() =>
    item ? getDefaultDecision(item) : "승인",
  );
  const [adminMemo, setAdminMemo] = useState(() => item?.adminMemo ?? "");
  const [settlementProcessing, setSettlementProcessing] = useState<SettlementProcessingOption>(() =>
    item ? getDefaultSettlementProcessing(item) : "정산 대상 아님",
  );
  const [includeAccounting, setIncludeAccounting] = useState(() => item?.includeAccounting ?? true);
  const [errors, setErrors] = useState<ValidationErrors>({});

  const projectMonthlySpent = useMemo(() => {
    if (!item) {
      return 0;
    }

    const currentMonth = item.usedDate.slice(0, 7);

    return items
      .filter(
        (candidate) =>
          candidate.relatedProject === item.relatedProject &&
          candidate.usedDate.startsWith(currentMonth),
      )
      .reduce((sum, candidate) => sum + candidate.amount, 0);
  }, [item, items]);

  const employeeMonthlyTotal = useMemo(() => {
    if (!item) {
      return 0;
    }

    const currentMonth = item.usedDate.slice(0, 7);

    return items
      .filter(
        (candidate) =>
          candidate.employeeName === item.employeeName && candidate.usedDate.startsWith(currentMonth),
      )
      .reduce((sum, candidate) => sum + candidate.amount, 0);
  }, [item, items]);

  const recentSimilarExpenses = useMemo(() => {
    if (!item) {
      return [];
    }

    return buildRecentSimilarExpenses(item, items);
  }, [item, items]);

  if (!item) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="지출 상세 검토"
          description="직원이 제출한 경비 요청 내용을 확인하고 승인, 반려, 수정요청을 처리합니다."
          roles={roleViews}
          activeRole="관리자 보기"
          eyebrow="관리자 승인"
          badgeText="상세 검토"
        />

        <section className="rounded-[1.75rem] border border-slate-200/90 bg-white p-8 shadow-sm">
          <EmptyState
            className="mt-0 border-none bg-slate-50 px-0 py-0"
            title="요청 정보를 찾을 수 없습니다."
            description="선택한 요청이 없거나 mock 데이터에서 제거되었습니다."
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

  const reviewTarget = item;

  const requestedAmount = item.amount;
  const numericApprovedAmount = Number(approvedAmount);
  const hasAttachment = item.attachments.length > 0;
  const isPartialApproval =
    approvedAmount.trim().length > 0 && numericApprovedAmount > 0 && numericApprovedAmount < requestedAmount;
  const settlementTargetText =
    settlementProcessing === "정산 대상 아님" ? "정산 대상 아님" : "정산 대상";

  function handleApprovedAmountChange(value: string) {
    if (value.trim().length === 0) {
      setApprovedAmount("");
      setErrors((current) => ({ ...current, approvedAmount: undefined }));
      return;
    }

    const clampedAmount = Math.min(Number(value), requestedAmount);
    setApprovedAmount(String(clampedAmount));
    setErrors((current) => ({ ...current, approvedAmount: undefined }));
  }

  function handleSave() {
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

    updateApprovalQueueReview({
      requestNumber: reviewTarget.requestNumber,
      decision,
      approvedAmount: numericApprovedAmount,
      adminMemo,
      settlementProcessing,
      includeAccounting,
    });

    window.alert("검토 결과가 저장되었습니다.");
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="지출 상세 검토"
        description="직원이 제출한 경비 요청 내용을 확인하고 승인, 반려, 수정요청을 처리합니다."
        roles={roleViews}
        activeRole="관리자 보기"
        eyebrow="관리자 승인"
        badgeText="상세 검토"
      />

      <section className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
        <div className="space-y-6">
          <InfoCard title="기본 정보">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl bg-slate-50 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">요청번호</p>
                <p className="mt-2 text-sm font-semibold text-slate-900">{item.requestNumber}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">상태</p>
                <div className="mt-2">
                  <StatusBadge status={item.status} />
                </div>
              </div>
              <div className="rounded-2xl bg-slate-50 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">요청일</p>
                <p className="mt-2 text-sm font-semibold text-slate-900">{item.requestedAt}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">요청 직원</p>
                <p className="mt-2 text-sm font-semibold text-slate-900">{item.employeeName}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">부서</p>
                <p className="mt-2 text-sm font-semibold text-slate-900">{item.department}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">긴급 여부</p>
                <div className="mt-2">
                  <UrgencyBadge urgency={item.urgency} />
                </div>
              </div>
              <div className="rounded-2xl bg-slate-50 px-4 py-3 md:col-span-2">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">경비 제목</p>
                <p className="mt-2 text-sm font-semibold text-slate-900">{item.title}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 px-4 py-3 md:col-span-2">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">경비 유형</p>
                <p className="mt-2 text-sm font-semibold text-slate-900">{item.expenseType}</p>
              </div>
            </div>
          </InfoCard>

          <InfoCard title="사용 내역">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl bg-slate-50 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">사용일</p>
                <p className="mt-2 text-sm font-semibold text-slate-900">{item.usedDate}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">사용처</p>
                <p className="mt-2 text-sm font-semibold text-slate-900">{item.merchantName}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">사용 금액</p>
                <p className="mt-2 text-sm font-semibold text-slate-900">
                  <AmountText value={item.amount} />
                </p>
              </div>
              <div className="rounded-2xl bg-slate-50 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">결제수단</p>
                <p className="mt-2 text-sm font-semibold text-slate-900">{item.paymentMethod}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">정산 요청 여부</p>
                <p className="mt-2 text-sm font-semibold text-slate-900">{item.settlementRequest}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">참석자 또는 사용 대상</p>
                <p className="mt-2 text-sm font-semibold text-slate-900">{item.attendeeInfo}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 px-4 py-3 md:col-span-2">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">사용 목적</p>
                <p className="mt-2 text-sm leading-6 text-slate-700">{item.purpose}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 px-4 py-3 md:col-span-2">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">상세 메모</p>
                <p className="mt-2 text-sm leading-6 text-slate-700">
                  {item.detailMemo || "등록된 상세 메모가 없습니다."}
                </p>
              </div>
            </div>
          </InfoCard>

          <InfoCard title="관련 업무">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl bg-slate-50 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">관련 업무/프로젝트</p>
                <p className="mt-2 text-sm font-semibold text-slate-900">{item.relatedProject}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">예산 항목</p>
                <p className="mt-2 text-sm font-semibold text-slate-900">{item.budgetCategory}</p>
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
                      key={recentItem.requestNumber}
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
                  <p className="text-sm text-slate-500">최근 비교할 동일 유형 사용 내역이 없습니다.</p>
                )}
              </div>
            </div>
          </InfoCard>

          <InfoCard title="증빙 자료">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl bg-slate-50 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">첨부 여부</p>
                <div className="mt-2">
                  <StatusBadge status={hasAttachment ? "첨부완료" : "미첨부"} />
                </div>
              </div>
              <div className="rounded-2xl bg-slate-50 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">첨부 유형</p>
                <p className="mt-2 text-sm font-semibold text-slate-900">
                  {hasAttachment
                    ? item.attachments.map((attachment) => attachment.type).join(", ")
                    : "미첨부"}
                </p>
              </div>
            </div>

            <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-semibold text-slate-900">첨부 파일명</p>
                <div className="mt-3 space-y-2">
                  {hasAttachment ? (
                    item.attachments.map((attachment: ApprovalAttachmentFile) => (
                      <div
                        key={`${attachment.type}-${attachment.fileName}`}
                        className="rounded-2xl bg-white px-4 py-3 shadow-sm"
                      >
                        <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                          {attachment.type}
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
                        {item.attachments[0].fileName}
                      </p>
                      <p className="mt-2 text-sm text-slate-500">
                        실제 파일 미리보기는 연결하지 않고, mock 영역만 표시합니다.
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
              요청 금액과 증빙 상태를 확인한 뒤 검토 결과를 저장합니다.
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
                value={item.budgetRisk ? "주의 필요" : "안정"}
                tone={item.budgetRisk ? "warning" : "success"}
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
                  최대 입력 가능 금액: <AmountText value={requestedAmount} className="font-semibold text-slate-900" />
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
                        onChange={(event) => setDecision(event.target.value as ReviewDecision)}
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
                  onChange={(event) =>
                    setSettlementProcessing(event.target.value as SettlementProcessingOption)
                  }
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
                onClick={handleSave}
                className="inline-flex items-center justify-center rounded-2xl bg-[var(--primary)] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[var(--primary-strong)]"
              >
                처리 저장
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
                <p className="mt-1 text-sm text-slate-500">저장 전에 한 번 더 확인해주세요.</p>
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
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[var(--primary)]" strokeWidth={1.8} />
                  <span>{itemText}</span>
                </li>
              ))}
            </ul>
          </section>
        </aside>
      </section>
    </div>
  );
}
