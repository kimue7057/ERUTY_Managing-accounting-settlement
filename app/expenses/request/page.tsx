"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { PageHeader } from "@/components/common/PageHeader";
import { ExpenseGuidePanel } from "@/components/expenses/ExpenseGuidePanel";
import { ExpenseRequestForm } from "@/components/expenses/ExpenseRequestForm";
import {
  attachmentCategories,
  expenseTypeOptions,
  relatedWorkOptions,
  roleViews,
} from "@/data/mockData";
import type {
  AttachmentCategory,
  ExpenseRequestErrors,
  ExpenseRequestFieldKey,
  ExpenseRequestFormData,
  PaymentMethod,
  SettlementRequestOption,
} from "@/types";

function createInitialAttachments(): Record<AttachmentCategory, string[]> {
  return attachmentCategories.reduce(
    (acc, category) => ({
      ...acc,
      [category]: [],
    }),
    {} as Record<AttachmentCategory, string[]>,
  );
}

const initialFormData: ExpenseRequestFormData = {
  title: "",
  expenseType: "",
  usedDate: "",
  purpose: "",
  relatedProject: "",
  amount: "",
  merchantName: "",
  paymentMethod: "",
  attendeeInfo: "",
  detailMemo: "",
  settlementRequest: "",
  settlementAccount: "",
  attachments: createInitialAttachments(),
};

const requiredFieldMessages: Record<ExpenseRequestFieldKey, string> = {
  title: "경비 제목을 입력해주세요.",
  expenseType: "경비 유형을 선택해주세요.",
  usedDate: "사용일을 선택해주세요.",
  purpose: "사용 목적을 입력해주세요.",
  relatedProject: "관련 업무/프로젝트를 선택해주세요.",
  amount: "사용 금액을 입력해주세요.",
  merchantName: "사용처를 입력해주세요.",
  paymentMethod: "결제 수단을 선택해주세요.",
  settlementRequest: "정산 요청 여부를 선택해주세요.",
};

function getDefaultSettlementRequest(
  paymentMethod: PaymentMethod | "",
): SettlementRequestOption | "" {
  if (paymentMethod === "개인카드" || paymentMethod === "현금") {
    return "정산 요청";
  }

  if (paymentMethod === "법인카드" || paymentMethod === "계좌이체") {
    return "정산 요청 안 함";
  }

  return "";
}

function countAttachments(formData: ExpenseRequestFormData) {
  return Object.values(formData.attachments).reduce((count, files) => count + files.length, 0);
}

function validateForm(formData: ExpenseRequestFormData) {
  const nextErrors: ExpenseRequestErrors = {};

  (Object.keys(requiredFieldMessages) as ExpenseRequestFieldKey[]).forEach((field) => {
    const value = formData[field];

    if (typeof value === "string" && value.trim().length === 0) {
      nextErrors[field] = requiredFieldMessages[field];
    }
  });

  if (formData.amount.trim().length > 0 && Number(formData.amount) <= 0) {
    nextErrors.amount = "0원보다 큰 금액을 입력해주세요.";
  }

  return nextErrors;
}

export default function ExpenseRequestPage() {
  const router = useRouter();
  const [formData, setFormData] = useState(initialFormData);
  const [errors, setErrors] = useState<ExpenseRequestErrors>({});

  function updateField<K extends keyof ExpenseRequestFormData>(
    field: K,
    value: ExpenseRequestFormData[K],
  ) {
    setFormData((current) => {
      if (field === "paymentMethod") {
        const nextSettlementRequest = getDefaultSettlementRequest(value as PaymentMethod | "");

        return {
          ...current,
          paymentMethod: value as ExpenseRequestFormData["paymentMethod"],
          settlementRequest: nextSettlementRequest,
          settlementAccount:
            nextSettlementRequest === "정산 요청" ? current.settlementAccount : "",
        };
      }

      if (field === "settlementRequest") {
        return {
          ...current,
          settlementRequest: value as ExpenseRequestFormData["settlementRequest"],
          settlementAccount: value === "정산 요청" ? current.settlementAccount : "",
        };
      }

      return {
        ...current,
        [field]: value,
      };
    });

    if (field in errors || field === "paymentMethod" || field === "settlementRequest") {
      setErrors((current) => {
        const nextErrors = { ...current };
        if (field === "paymentMethod") {
          delete nextErrors.paymentMethod;
          delete nextErrors.settlementRequest;
        } else {
          delete nextErrors[field as ExpenseRequestFieldKey];
        }
        return nextErrors;
      });
    }
  }

  function handleAddAttachment(category: AttachmentCategory, fileNames: string[]) {
    setFormData((current) => ({
      ...current,
      attachments: {
        ...current.attachments,
        [category]: [...current.attachments[category], ...fileNames],
      },
    }));
  }

  function handleCancel() {
    router.push("/");
  }

  function handleTemporarySave() {
    window.alert("경비 내역이 임시 저장되었습니다.");
  }

  function handleSubmit() {
    const validationErrors = validateForm(formData);
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    if (countAttachments(formData) === 0) {
      const shouldContinue = window.confirm(
        "증빙자료가 첨부되지 않았습니다. 증빙이 없으면 승인 또는 정산이 보류될 수 있습니다. 그래도 승인 요청을 제출하시겠습니까?",
      );

      if (!shouldContinue) {
        return;
      }
    }

    window.alert("경비 승인 요청이 제출되었습니다.");
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="지출 기안 작성"
        description="식대, 교통비, 출장비, 소모품비 등 회사 경비 사용 내역을 등록하고 승인 요청을 제출합니다."
        roles={roleViews}
        activeRole="직원 보기"
        eyebrow="경비 등록"
        badgeText="경비 사용 승인"
      />

      <section className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
        <ExpenseRequestForm
          formData={formData}
          errors={errors}
          expenseTypeOptions={expenseTypeOptions}
          relatedWorkOptions={relatedWorkOptions}
          attachmentCategories={attachmentCategories}
          onFieldChange={updateField}
          onAddAttachment={handleAddAttachment}
          onCancel={handleCancel}
          onTemporarySave={handleTemporarySave}
          onSubmit={handleSubmit}
        />

        <ExpenseGuidePanel formData={formData} />
      </section>
    </div>
  );
}
