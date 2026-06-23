"use client";

import type { FormEvent } from "react";

import { AmountText } from "@/components/common/AmountText";
import { AttachmentMockUploader } from "@/components/expenses/AttachmentMockUploader";
import { ExpenseFormSection } from "@/components/expenses/ExpenseFormSection";
import { PaymentMethodNotice } from "@/components/expenses/PaymentMethodNotice";
import type {
  AttachmentCategory,
  ExpenseRequestErrors,
  ExpenseRequestFormData,
  PaymentMethod,
  SettlementRequestOption,
} from "@/types";

type ExpenseRequestFormProps = {
  formData: ExpenseRequestFormData;
  errors: ExpenseRequestErrors;
  expenseTypeOptions: Array<{ value: string; label: string }>;
  relatedWorkOptions: Array<{ value: string; label: string }>;
  attachmentCategories: AttachmentCategory[];
  isReferenceLoading?: boolean;
  isSubmitting?: boolean;
  selectedExpenseTypeLabel?: string;
  onFieldChange: <K extends keyof ExpenseRequestFormData>(
    field: K,
    value: ExpenseRequestFormData[K],
  ) => void;
  onAddAttachment: (category: AttachmentCategory, fileNames: string[]) => void;
  onCancel: () => void;
  onTemporarySave: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

const paymentMethods: PaymentMethod[] = ["개인카드", "법인카드", "현금", "계좌이체"];
const settlementOptions: SettlementRequestOption[] = ["정산 요청", "정산 요청 안 함"];

const fieldClassName =
  "mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-[var(--primary)] focus:ring-4 focus:ring-[color:rgba(22,59,111,0.08)]";

const textareaClassName = `${fieldClassName} min-h-[120px] resize-y`;

function RequiredLabel({
  htmlFor,
  label,
  helperText,
}: {
  htmlFor: string;
  label: string;
  helperText?: string;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="text-sm font-semibold text-slate-900">
        {label}
        <span className="ml-1 text-rose-500">*</span>
      </label>
      {helperText ? <p className="mt-1 text-xs text-slate-500">{helperText}</p> : null}
    </div>
  );
}

function OptionalLabel({
  htmlFor,
  label,
  helperText,
}: {
  htmlFor: string;
  label: string;
  helperText?: string;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="text-sm font-semibold text-slate-900">
        {label}
      </label>
      {helperText ? <p className="mt-1 text-xs text-slate-500">{helperText}</p> : null}
    </div>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) {
    return null;
  }

  return <p className="mt-2 text-sm text-rose-500">{message}</p>;
}

export function ExpenseRequestForm({
  formData,
  errors,
  expenseTypeOptions,
  relatedWorkOptions,
  attachmentCategories,
  isReferenceLoading = false,
  isSubmitting = false,
  selectedExpenseTypeLabel = "",
  onFieldChange,
  onAddAttachment,
  onCancel,
  onTemporarySave,
  onSubmit,
}: ExpenseRequestFormProps) {
  const amountNumber = formData.amount.trim().length > 0 ? Number(formData.amount) : null;
  const attendeeLabel = selectedExpenseTypeLabel === "식대/회의비" ? "참석자" : "사용 대상/비고";
  const attendeeHelperText =
    selectedExpenseTypeLabel === "식대/회의비"
      ? "식대 또는 회의비는 참석자 정보를 함께 적어주세요."
      : "필요한 경우 사용 대상이나 간단한 메모를 적어주세요.";
  const attendeePlaceholder =
    selectedExpenseTypeLabel === "식대/회의비"
      ? "예: 김유성, 공하연, 협력사 담당자 2명"
      : "예: 팀 공용 비품 구매 / 마케팅 행사 운영팀 사용";

  return (
    <form className="space-y-5" onSubmit={onSubmit}>
      <ExpenseFormSection
        title="경비 기본 정보"
        description="직원 경비 등록에 필요한 핵심 정보를 먼저 입력합니다."
      >
        <div className="grid gap-5 md:grid-cols-2">
          <div className="md:col-span-2">
            <RequiredLabel
              htmlFor="title"
              label="경비 제목"
              helperText="등록 내역을 바로 이해할 수 있도록 간단명료하게 작성해주세요."
            />
            <input
              id="title"
              type="text"
              value={formData.title}
              onChange={(event) => onFieldChange("title", event.target.value)}
              placeholder="예: 거래처 미팅 식대"
              className={fieldClassName}
            />
            <FieldError message={errors.title} />
          </div>

          <div>
            <RequiredLabel
              htmlFor="expenseType"
              label="경비 유형"
              helperText="식대, 교통비, 출장비 등 사용 내역에 맞는 유형을 선택해주세요."
            />
            <select
              id="expenseType"
              value={formData.expenseType}
              onChange={(event) => onFieldChange("expenseType", event.target.value)}
              disabled={isReferenceLoading || isSubmitting}
              className={fieldClassName}
            >
              <option value="">
                {isReferenceLoading ? "경비 유형을 불러오는 중입니다" : "경비 유형을 선택해주세요"}
              </option>
              {expenseTypeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <FieldError message={errors.expenseType} />
          </div>

          <div>
            <RequiredLabel
              htmlFor="usedDate"
              label="사용일"
              helperText="실제 경비가 발생한 날짜를 선택해주세요."
            />
            <input
              id="usedDate"
              type="date"
              value={formData.usedDate}
              onChange={(event) => onFieldChange("usedDate", event.target.value)}
              className={fieldClassName}
            />
            <FieldError message={errors.usedDate} />
          </div>

          <div className="md:col-span-2">
            <RequiredLabel
              htmlFor="purpose"
              label="사용 목적"
              helperText="업무 관련성이 드러나게 간단히 작성해주세요."
            />
            <textarea
              id="purpose"
              value={formData.purpose}
              onChange={(event) => onFieldChange("purpose", event.target.value)}
              placeholder="예: 콘텐츠 투자 플랫폼 협력사 미팅 진행을 위한 식대 사용"
              className={textareaClassName}
            />
            <FieldError message={errors.purpose} />
          </div>

          <div className="md:col-span-2">
            <RequiredLabel
              htmlFor="relatedProject"
              label="관련 업무/프로젝트"
              helperText="회계 용어보다 실무 기준으로 어떤 업무와 연결되는 경비인지 선택해주세요."
            />
            <select
              id="relatedProject"
              value={formData.relatedProject}
              onChange={(event) => onFieldChange("relatedProject", event.target.value)}
              disabled={isReferenceLoading || isSubmitting}
              className={fieldClassName}
            >
              <option value="">
                {isReferenceLoading
                  ? "프로젝트를 불러오는 중입니다"
                  : "관련 업무/프로젝트를 선택해주세요"}
              </option>
              {relatedWorkOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <FieldError message={errors.relatedProject} />
          </div>
        </div>
      </ExpenseFormSection>

      <ExpenseFormSection
        title="사용 내역"
        description="사용 금액, 사용처, 결제 수단 등 실제 경비 사용 정보를 입력합니다."
      >
        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <RequiredLabel
              htmlFor="amount"
              label="사용 금액"
              helperText="숫자만 입력하면 원화 형식으로 자동 정리됩니다."
            />
            <input
              id="amount"
              type="number"
              min="0"
              inputMode="numeric"
              value={formData.amount}
              onChange={(event) => onFieldChange("amount", event.target.value)}
              placeholder="예: 48000"
              className={fieldClassName}
            />
            <p className="mt-2 text-sm text-slate-500">
              원화 표기:{" "}
              {amountNumber !== null && !Number.isNaN(amountNumber) ? (
                <AmountText value={amountNumber} className="font-semibold text-slate-900" />
              ) : (
                <span className="text-slate-400">미입력</span>
              )}
            </p>
            <FieldError message={errors.amount} />
          </div>

          <div>
            <RequiredLabel
              htmlFor="merchantName"
              label="사용처"
              helperText="상호명, 서비스명, 교통 수단명 등 실제 사용처를 입력해주세요."
            />
            <input
              id="merchantName"
              type="text"
              value={formData.merchantName}
              onChange={(event) => onFieldChange("merchantName", event.target.value)}
              placeholder="예: 스타벅스 강남점 / 카카오택시 / 쿠팡 / KTX"
              className={fieldClassName}
            />
            <FieldError message={errors.merchantName} />
          </div>

          <div className="md:col-span-2">
            <p className="text-sm font-semibold text-slate-900">
              결제 수단<span className="ml-1 text-rose-500">*</span>
            </p>
            <p className="mt-1 text-xs text-slate-500">
              어떤 수단으로 경비를 결제했는지 선택해주세요.
            </p>
            <div className="mt-2 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {paymentMethods.map((method) => (
                <label
                  key={method}
                  className={[
                    "flex cursor-pointer items-center gap-3 rounded-2xl border px-4 py-3 text-sm font-medium shadow-sm transition",
                    formData.paymentMethod === method
                      ? "border-[var(--primary)] bg-[var(--primary-soft)] text-[var(--primary)]"
                      : "border-slate-200 bg-white text-slate-700 hover:border-slate-300",
                  ].join(" ")}
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    value={method}
                    checked={formData.paymentMethod === method}
                    onChange={(event) =>
                      onFieldChange("paymentMethod", event.target.value as PaymentMethod)
                    }
                    className="h-4 w-4 border-slate-300 text-[var(--primary)] focus:ring-[var(--primary)]"
                  />
                  <span>{method}</span>
                </label>
              ))}
            </div>
            <FieldError message={errors.paymentMethod} />
          </div>

          <div className="md:col-span-2">
            <OptionalLabel
              htmlFor="attendeeInfo"
              label={attendeeLabel}
              helperText={attendeeHelperText}
            />
            <input
              id="attendeeInfo"
              type="text"
              value={formData.attendeeInfo}
              onChange={(event) => onFieldChange("attendeeInfo", event.target.value)}
              placeholder={attendeePlaceholder}
              className={fieldClassName}
            />
          </div>

          <div className="md:col-span-2">
            <OptionalLabel
              htmlFor="detailMemo"
              label="사용 상세 메모"
              helperText="선택 입력 항목입니다. 상황 설명이 더 필요할 때만 작성해주세요."
            />
            <textarea
              id="detailMemo"
              value={formData.detailMemo}
              onChange={(event) => onFieldChange("detailMemo", event.target.value)}
              placeholder="예: 협력사와 콘텐츠 투자 플랫폼 정산 구조 논의"
              className={textareaClassName}
            />
          </div>
        </div>
      </ExpenseFormSection>

      <ExpenseFormSection
        title="증빙 자료"
        description="영수증, 카드전표, 교통비 증빙 등 경비 사용을 확인할 수 있는 자료를 첨부합니다."
      >
        <AttachmentMockUploader
          categories={attachmentCategories}
          attachments={formData.attachments}
          onAddFiles={onAddAttachment}
        />
      </ExpenseFormSection>

      <ExpenseFormSection
        title="정산 정보"
        description="결제 수단에 따라 월말 정산 여부와 계좌 정보를 확인합니다."
      >
        <div className="space-y-5">
          <div>
            <p className="text-sm font-semibold text-slate-900">
              정산 요청 여부<span className="ml-1 text-rose-500">*</span>
            </p>
            <p className="mt-1 text-xs text-slate-500">
              개인카드와 현금은 보통 정산 요청으로, 법인카드는 정산 요청 안 함으로 기본 설정됩니다.
            </p>
            <div className="mt-2 grid gap-3 sm:grid-cols-2">
              {settlementOptions.map((option) => (
                <label
                  key={option}
                  className={[
                    "flex cursor-pointer items-center gap-3 rounded-2xl border px-4 py-3 text-sm font-medium shadow-sm transition",
                    formData.settlementRequest === option
                      ? "border-[var(--primary)] bg-[var(--primary-soft)] text-[var(--primary)]"
                      : "border-slate-200 bg-white text-slate-700 hover:border-slate-300",
                  ].join(" ")}
                >
                  <input
                    type="radio"
                    name="settlementRequest"
                    value={option}
                    checked={formData.settlementRequest === option}
                    onChange={(event) =>
                      onFieldChange(
                        "settlementRequest",
                        event.target.value as SettlementRequestOption,
                      )
                    }
                    className="h-4 w-4 border-slate-300 text-[var(--primary)] focus:ring-[var(--primary)]"
                  />
                  <span>{option}</span>
                </label>
              ))}
            </div>
            <FieldError message={errors.settlementRequest} />
          </div>

          {formData.settlementRequest === "정산 요청" ? (
            <div>
              <OptionalLabel
                htmlFor="settlementAccount"
                label="정산 받을 계좌"
                helperText="월말 정산 지급 계좌가 필요한 경우 입력해주세요."
              />
              <input
                id="settlementAccount"
                type="text"
                value={formData.settlementAccount}
                onChange={(event) => onFieldChange("settlementAccount", event.target.value)}
                placeholder="예: 국민은행 123-456-789012 김홍옥"
                className={fieldClassName}
              />
            </div>
          ) : null}

          <PaymentMethodNotice paymentMethod={formData.paymentMethod} />
        </div>
      </ExpenseFormSection>

      <div className="rounded-[1.75rem] border border-slate-200/90 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
          >
            취소
          </button>

          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={onTemporarySave}
              disabled={isSubmitting}
              className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-100"
            >
              임시저장
            </button>
            <button
              type="submit"
              disabled={isSubmitting || isReferenceLoading}
              className="inline-flex items-center justify-center rounded-2xl bg-[var(--primary)] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[var(--primary-strong)]"
            >
              {isSubmitting ? "저장 중..." : "승인 요청"}
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}
