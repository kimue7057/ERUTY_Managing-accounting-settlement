"use client";

import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { PageHeader } from "@/components/common/PageHeader";
import { ExpenseGuidePanel } from "@/components/expenses/ExpenseGuidePanel";
import { ExpenseRequestForm } from "@/components/expenses/ExpenseRequestForm";
import { attachmentCategories, roleViews } from "@/data/uiOptions";
import {
  getSupabaseBrowserClient,
  isSupabaseConfigured,
} from "@/lib/supabase/client";
import type {
  AttachmentCategory,
  ExpenseRequestErrors,
  ExpenseRequestFieldKey,
  ExpenseRequestFormData,
  PaymentMethod,
  SettlementRequestOption,
} from "@/types";
import type { DbAttachmentFileType } from "@/utils/expenseRequests";
import { getUserFacingSupabaseMessage } from "@/utils/userFacingError";

type ProjectOptionRow = {
  id: string;
  name: string;
  status: string;
};

type ExpenseCategoryOptionRow = {
  id: string;
  name: string;
  is_active: boolean;
};

type TemporaryUserRow = {
  id: string;
  name: string;
  role: string;
  is_active: boolean;
};

type SelectOption = {
  value: string;
  label: string;
};

type PendingAttachmentFile = {
  id: string;
  category: AttachmentCategory;
  file: File;
};

type ExpenseRequestInsertPayload = {
  request_no: string;
  user_id: string;
  project_id: string;
  category_id: string;
  title: string;
  purpose: string;
  expense_date: string;
  vendor: string;
  amount: number;
  payment_method: "personal_card" | "corporate_card" | "cash" | "bank_transfer";
  settlement_requested: boolean;
  status: "submitted";
  evidence_status: "none";
  requested_at: string;
  attendees?: string;
  memo?: string;
};

type InsertedExpenseRequestRow = {
  id: string;
  request_no: string;
};

type SubmitResult =
  | {
      status: "success";
      message: string;
      requestNo: string;
      createdId: string;
    }
  | {
      status: "error";
      message: string;
    };

type AttachmentSelectionState = {
  tone: "info" | "warning" | "error";
  message: string;
  details?: string[];
};

type AttachmentUploadState = {
  phase: "uploading" | "success" | "partial" | "error";
  message: string;
  uploadedCount: number;
  failedCount: number;
  details?: string[];
  checkedAt: string;
};

type AttachmentUploadResult = {
  phase: "success" | "partial" | "error";
  uploadedCount: number;
  failedCount: number;
  details: string[];
};

type ExpenseAttachmentInsertPayload = {
  expense_request_id: string;
  file_type: DbAttachmentFileType;
  file_name: string;
  file_path: string;
  uploaded_by: string;
};

type SupabaseErrorLike = {
  message: string;
};

const expenseEvidenceBucketName = "expense-evidence";
const maxAttachmentFileSizeBytes = 10 * 1024 * 1024;
const allowedAttachmentExtensions = new Set(["jpg", "jpeg", "png", "pdf"]);

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

const paymentMethodValueMap: Record<
  PaymentMethod,
  "personal_card" | "corporate_card" | "cash" | "bank_transfer"
> = {
  개인카드: "personal_card",
  법인카드: "corporate_card",
  현금: "cash",
  계좌이체: "bank_transfer",
};

function createInitialAttachments(): Record<AttachmentCategory, string[]> {
  return attachmentCategories.reduce(
    (acc, category) => ({
      ...acc,
      [category]: [],
    }),
    {} as Record<AttachmentCategory, string[]>,
  );
}

function createInitialFormData(): ExpenseRequestFormData {
  return {
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
}

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

function countAttachments(formData: ExpenseRequestFormData) {
  return Object.values(formData.attachments).reduce((count, files) => count + files.length, 0);
}

function createRequestNumber() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const random = String(Math.floor(1000 + Math.random() * 9000));

  return `EXP-${year}${month}${day}-${random}`;
}

function normalizeOptionalText(value: string) {
  const trimmedValue = value.trim();
  return trimmedValue.length > 0 ? trimmedValue : undefined;
}

function getAttachmentFileExtension(fileName: string) {
  const fileNameParts = fileName.toLowerCase().split(".");
  return fileNameParts.length > 1 ? fileNameParts[fileNameParts.length - 1] : "";
}

function normalizeStorageFileName(fileName: string) {
  const normalized = fileName.replace(/[\\/\u0000-\u001f\u007f]/g, "_").trim();
  return normalized.length > 0 ? normalized : `expense-evidence-${Date.now()}`;
}

function mapAttachmentCategoryToDbFileType(category: AttachmentCategory): DbAttachmentFileType {
  switch (category) {
    case "영수증":
      return "receipt";
    case "카드전표":
      return "card_slip";
    case "현금영수증":
      return "cash_receipt";
    case "간이영수증":
      return "simple_receipt";
    case "교통비 증빙":
      return "transport_receipt";
    case "기타 증빙":
    default:
      return "other";
  }
}

async function resolveTemporaryUser() {
  const supabase = getSupabaseBrowserClient();

  const [employeeResult, fallbackProfileResult] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, name, role, is_active")
      .eq("role", "employee")
      .eq("is_active", true)
      .order("created_at", { ascending: true })
      .limit(1),
    supabase
      .from("profiles")
      .select("id, name, role, is_active")
      .order("created_at", { ascending: true })
      .limit(1),
  ]);

  if (employeeResult.error) {
    throw employeeResult.error;
  }

  if (fallbackProfileResult.error) {
    throw fallbackProfileResult.error;
  }

  return employeeResult.data?.[0] ?? fallbackProfileResult.data?.[0] ?? null;
}

async function uploadEvidenceAttachments({
  expenseRequestId,
  uploadedBy,
  attachments,
}: {
  expenseRequestId: string;
  uploadedBy: string;
  attachments: PendingAttachmentFile[];
}): Promise<AttachmentUploadResult> {
  const supabase = getSupabaseBrowserClient();
  const details: string[] = [];
  let uploadedCount = 0;
  let statusUpdateFailed = false;

  for (const attachment of attachments) {
    const safeFileName = normalizeStorageFileName(attachment.file.name);
    const filePath = `expense-requests/${expenseRequestId}/${safeFileName}`;

    const { error: storageError } = await supabase.storage
      .from(expenseEvidenceBucketName)
      .upload(filePath, attachment.file, {
        cacheControl: "3600",
        upsert: false,
        contentType: attachment.file.type || undefined,
      });

    if (storageError) {
      details.push(`[${attachment.file.name}] 파일 업로드에 실패했습니다.`);
      continue;
    }

    const attachmentPayload: ExpenseAttachmentInsertPayload = {
      expense_request_id: expenseRequestId,
      file_type: mapAttachmentCategoryToDbFileType(attachment.category),
      file_name: attachment.file.name,
      file_path: filePath,
      uploaded_by: uploadedBy,
    };

    const { error: attachmentInsertError } = await supabase
      .from("expense_attachments")
      .insert(attachmentPayload);

    if (attachmentInsertError) {
      details.push(`[${attachment.file.name}] 첨부 정보 저장에 실패했습니다.`);
      await supabase.storage.from(expenseEvidenceBucketName).remove([filePath]);
      continue;
    }

    uploadedCount += 1;
  }

  if (uploadedCount > 0) {
    const { error: evidenceStatusUpdateError } = await supabase
      .from("expense_requests")
      .update({ evidence_status: "attached" })
      .eq("id", expenseRequestId);

    statusUpdateFailed = Boolean(evidenceStatusUpdateError);

    if (statusUpdateFailed) {
      details.push("증빙 상태 업데이트에 실패했습니다.");
    }
  }

  const failedCount = attachments.length - uploadedCount + (statusUpdateFailed ? 1 : 0);

  return {
    phase: failedCount === 0 ? "success" : uploadedCount > 0 ? "partial" : "error",
    uploadedCount,
    failedCount,
    details,
  };
}

export default function ExpenseRequestPage() {
  const router = useRouter();
  const [formData, setFormData] = useState<ExpenseRequestFormData>(() => createInitialFormData());
  const [errors, setErrors] = useState<ExpenseRequestErrors>({});
  const [projectOptions, setProjectOptions] = useState<ProjectOptionRow[]>([]);
  const [expenseCategoryOptions, setExpenseCategoryOptions] = useState<
    ExpenseCategoryOptionRow[]
  >([]);
  const [temporaryUserPreview, setTemporaryUserPreview] = useState<TemporaryUserRow | null>(null);
  const [pendingAttachmentFiles, setPendingAttachmentFiles] = useState<PendingAttachmentFile[]>([]);
  const [attachmentSelectionState, setAttachmentSelectionState] =
    useState<AttachmentSelectionState | null>(null);
  const [attachmentUploadState, setAttachmentUploadState] = useState<AttachmentUploadState | null>(
    null,
  );
  const [referenceLoading, setReferenceLoading] = useState(true);
  const [referenceError, setReferenceError] = useState<string | null>(null);
  const [submitResult, setSubmitResult] = useState<SubmitResult | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadReferenceData() {
      setReferenceLoading(true);
      setReferenceError(null);

      if (!isSupabaseConfigured) {
        if (isMounted) {
          setReferenceError("Supabase 연결 정보가 설정되지 않았습니다.");
          setReferenceLoading(false);
        }
        return;
      }

      try {
        const supabase = getSupabaseBrowserClient();
        const [projectsResult, categoriesResult, employeeResult, fallbackProfileResult] =
          await Promise.all([
            supabase
              .from("projects")
              .select("id, name, status")
              .eq("status", "active")
              .order("created_at", { ascending: true }),
            supabase
              .from("expense_categories")
              .select("id, name, is_active")
              .eq("is_active", true)
              .order("created_at", { ascending: true }),
            supabase
              .from("profiles")
              .select("id, name, role, is_active")
              .eq("role", "employee")
              .eq("is_active", true)
              .order("created_at", { ascending: true })
              .limit(1),
            supabase
              .from("profiles")
              .select("id, name, role, is_active")
              .order("created_at", { ascending: true })
              .limit(1),
          ]);

        if (!isMounted) {
          return;
        }

        if (projectsResult.error || categoriesResult.error) {
          setReferenceError("기준 정보를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.");
          return;
        }

        setProjectOptions(projectsResult.data ?? []);
        setExpenseCategoryOptions(categoriesResult.data ?? []);

        const previewUser =
          employeeResult.data?.[0] ??
          fallbackProfileResult.data?.[0] ??
          null;

        setTemporaryUserPreview(previewUser);
      } catch {
        if (isMounted) {
          setReferenceError("기준 정보를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.");
        }
      } finally {
        if (isMounted) {
          setReferenceLoading(false);
        }
      }
    }

    void loadReferenceData();

    return () => {
      isMounted = false;
    };
  }, []);

  const projectSelectOptions = useMemo<SelectOption[]>(
    () =>
      projectOptions.map((project) => ({
        value: project.id,
        label: project.name,
      })),
    [projectOptions],
  );

  const expenseTypeSelectOptions = useMemo<SelectOption[]>(
    () =>
      expenseCategoryOptions.map((category) => ({
        value: category.id,
        label: category.name,
      })),
    [expenseCategoryOptions],
  );

  const selectedProjectLabel = useMemo(
    () => projectOptions.find((project) => project.id === formData.relatedProject)?.name ?? "",
    [formData.relatedProject, projectOptions],
  );

  const selectedExpenseTypeLabel = useMemo(
    () =>
      expenseCategoryOptions.find((category) => category.id === formData.expenseType)?.name ?? "",
    [expenseCategoryOptions, formData.expenseType],
  );

  function updateField<K extends keyof ExpenseRequestFormData>(
    field: K,
    value: ExpenseRequestFormData[K],
  ) {
    setSubmitResult(null);

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

  function handleAddAttachment(category: AttachmentCategory, files: File[]) {
    setSubmitResult(null);
    setAttachmentUploadState(null);

    const acceptedItems: PendingAttachmentFile[] = [];
    const acceptedFileNames: string[] = [];
    const rejectedDetails: string[] = [];
    const existingNames = new Set(
      pendingAttachmentFiles.map((item) => item.file.name.toLowerCase()),
    );

    files.forEach((file, index) => {
      const normalizedName = file.name.toLowerCase();
      const extension = getAttachmentFileExtension(file.name);

      if (existingNames.has(normalizedName)) {
        rejectedDetails.push(`${file.name}: 동일한 파일명은 한 번만 첨부할 수 있습니다.`);
        return;
      }

      if (!allowedAttachmentExtensions.has(extension)) {
        rejectedDetails.push(`${file.name}: jpg, png, pdf 파일만 업로드할 수 있습니다.`);
        return;
      }

      if (file.size > maxAttachmentFileSizeBytes) {
        rejectedDetails.push(`${file.name}: 파일 크기는 10MB 이하여야 합니다.`);
        return;
      }

      existingNames.add(normalizedName);
      acceptedItems.push({
        id: `${Date.now()}-${index}-${file.name}`,
        category,
        file,
      });
      acceptedFileNames.push(file.name);
    });

    if (acceptedItems.length > 0) {
      setPendingAttachmentFiles((current) => [...current, ...acceptedItems]);
      setFormData((current) => ({
        ...current,
        attachments: {
          ...current.attachments,
          [category]: [...current.attachments[category], ...acceptedFileNames],
        },
      }));
    }

    if (acceptedItems.length > 0 && rejectedDetails.length === 0) {
      setAttachmentSelectionState({
        tone: "info",
        message: `${acceptedItems.length}개의 파일을 첨부 대기 목록에 추가했습니다.`,
        details: acceptedFileNames,
      });
      return;
    }

    if (acceptedItems.length > 0) {
      setAttachmentSelectionState({
        tone: "warning",
        message: `${acceptedItems.length}개의 파일은 추가했고 일부 파일은 제외했습니다.`,
        details: rejectedDetails,
      });
      return;
    }

    setAttachmentSelectionState({
      tone: "error",
      message: "선택한 파일을 추가하지 못했습니다.",
      details: rejectedDetails,
    });
  }

  function handleCancel() {
    router.push("/");
  }

  function handleTemporarySave() {
    window.alert("경비 작성 내용이 임시 저장되었습니다.");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitResult(null);
    setAttachmentUploadState(null);

    const validationErrors = validateForm(formData);
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      setSubmitResult({
        status: "error",
        message: "필수 입력 항목을 확인해주세요.",
      });
      return;
    }

    if (referenceLoading) {
      setSubmitResult({
        status: "error",
        message: "기준 정보를 불러오는 중입니다. 잠시 후 다시 시도해주세요.",
      });
      return;
    }

    if (referenceError) {
      setSubmitResult({
        status: "error",
        message: referenceError,
      });
      return;
    }

    if (!isSupabaseConfigured) {
      setSubmitResult({
        status: "error",
        message: "Supabase 연결 정보가 설정되지 않았습니다.",
      });
      return;
    }

    if (countAttachments(formData) === 0) {
      const shouldContinue = window.confirm(
        "증빙 자료가 첨부되지 않았습니다. 승인 또는 정산이 보류될 수 있습니다. 그래도 제출하시겠습니까?",
      );

      if (!shouldContinue) {
        return;
      }
    }

    setIsSubmitting(true);

    try {
      const supabase = getSupabaseBrowserClient();
      const resolvedTemporaryUser =
        temporaryUserPreview ?? (await resolveTemporaryUser());

      if (!resolvedTemporaryUser?.id) {
        throw { message: "임시 제출에 사용할 프로필을 찾지 못했습니다." } satisfies SupabaseErrorLike;
      }

      const selectedProject = projectOptions.find((project) => project.id === formData.relatedProject);
      const selectedCategory = expenseCategoryOptions.find(
        (category) => category.id === formData.expenseType,
      );

      if (!selectedProject || !selectedCategory) {
        throw { message: "프로젝트 또는 경비 유형을 다시 선택해주세요." } satisfies SupabaseErrorLike;
      }

      const normalizedAmount = Number(formData.amount);

      if (!Number.isFinite(normalizedAmount)) {
        throw { message: "사용 금액을 다시 확인해주세요." } satisfies SupabaseErrorLike;
      }

      const insertPayload: ExpenseRequestInsertPayload = {
        request_no: createRequestNumber(),
        user_id: resolvedTemporaryUser.id,
        project_id: selectedProject.id,
        category_id: selectedCategory.id,
        title: formData.title.trim(),
        purpose: formData.purpose.trim(),
        expense_date: formData.usedDate,
        vendor: formData.merchantName.trim(),
        amount: normalizedAmount,
        payment_method: paymentMethodValueMap[formData.paymentMethod as PaymentMethod],
        settlement_requested: formData.settlementRequest === "정산 요청",
        status: "submitted",
        evidence_status: "none",
        requested_at: new Date().toISOString(),
      };

      const attendees = normalizeOptionalText(formData.attendeeInfo);
      const memo = normalizeOptionalText(formData.detailMemo);

      if (attendees) {
        insertPayload.attendees = attendees;
      }

      if (memo) {
        insertPayload.memo = memo;
      }

      const { data, error } = await supabase
        .from("expense_requests")
        .insert(insertPayload)
        .select("id, request_no")
        .single();

      if (error || !data) {
        throw error ?? { message: "경비 요청 저장에 실패했습니다." };
      }

      const insertedRow = data as InsertedExpenseRequestRow;
      let successMessage = "경비 승인 요청이 제출되었습니다.";

      if (pendingAttachmentFiles.length > 0) {
        const startedAt = new Date().toISOString();

        setAttachmentUploadState({
          phase: "uploading",
          message: `증빙 파일 ${pendingAttachmentFiles.length}건을 업로드하고 있습니다.`,
          uploadedCount: 0,
          failedCount: 0,
          checkedAt: startedAt,
        });

        const uploadResult = await uploadEvidenceAttachments({
          expenseRequestId: insertedRow.id,
          uploadedBy: resolvedTemporaryUser.id,
          attachments: pendingAttachmentFiles,
        });

        const checkedAt = new Date().toISOString();
        const uploadMessage =
          uploadResult.phase === "success"
            ? `증빙 파일 ${uploadResult.uploadedCount}건 업로드를 완료했습니다.`
            : uploadResult.phase === "partial"
              ? "증빙 파일 일부만 업로드되었습니다. 누락된 파일을 다시 확인해주세요."
              : "증빙 파일 업로드에 실패했습니다.";

        setAttachmentUploadState({
          phase: uploadResult.phase,
          message: uploadMessage,
          uploadedCount: uploadResult.uploadedCount,
          failedCount: uploadResult.failedCount,
          details: uploadResult.details,
          checkedAt,
        });

        successMessage =
          uploadResult.phase === "success"
            ? "경비 승인 요청이 제출되었고 증빙 파일 업로드도 완료되었습니다."
            : uploadResult.phase === "partial"
              ? "경비 승인 요청은 제출되었고 증빙 파일 일부만 업로드되었습니다."
              : "경비 승인 요청은 제출되었지만 증빙 파일 업로드에는 실패했습니다.";
      }

      setFormData(createInitialFormData());
      setPendingAttachmentFiles([]);
      setAttachmentSelectionState(null);
      setErrors({});
      setSubmitResult({
        status: "success",
        message: successMessage,
        requestNo: insertedRow.request_no,
        createdId: insertedRow.id,
      });
    } catch (error) {
      setSubmitResult({
        status: "error",
        message: getUserFacingSupabaseMessage(
          error,
          "경비 요청을 저장하지 못했습니다. 잠시 후 다시 시도해주세요.",
        ),
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="지출 기안 작성"
        description="식대, 교통비, 출장비, 소모품비 등 사내 경비 사용 내역을 등록하고 승인 요청을 제출합니다."
        roles={roleViews}
        activeRole="직원 보기"
        eyebrow="경비 등록"
        badgeText="경비 사용 승인"
      />

      {referenceError ? (
        <section className="rounded-[1.75rem] border border-rose-200 bg-rose-50 px-5 py-4 text-sm leading-6 text-rose-700 shadow-sm">
          <p className="font-semibold">기준 정보를 불러오지 못했습니다.</p>
          <p className="mt-2">{referenceError}</p>
        </section>
      ) : null}

      {submitResult?.status === "success" ? (
        <section className="rounded-[1.75rem] border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm leading-6 text-emerald-800 shadow-sm">
          <p className="font-semibold">제출이 완료되었습니다.</p>
          <p className="mt-2">{submitResult.message}</p>
          <p className="mt-2">
            요청번호: <span className="font-semibold">{submitResult.requestNo}</span>
          </p>
        </section>
      ) : null}

      {submitResult?.status === "error" ? (
        <section className="rounded-[1.75rem] border border-rose-200 bg-rose-50 px-5 py-4 text-sm leading-6 text-rose-700 shadow-sm">
          <p className="font-semibold">제출에 실패했습니다.</p>
          <p className="mt-2">{submitResult.message}</p>
        </section>
      ) : null}

      <section className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
        <ExpenseRequestForm
          formData={formData}
          errors={errors}
          expenseTypeOptions={expenseTypeSelectOptions}
          relatedWorkOptions={projectSelectOptions}
          attachmentCategories={attachmentCategories}
          isReferenceLoading={referenceLoading}
          isSubmitting={isSubmitting}
          selectedExpenseTypeLabel={selectedExpenseTypeLabel}
          attachmentSelectionState={attachmentSelectionState}
          attachmentUploadState={attachmentUploadState}
          onFieldChange={updateField}
          onAddAttachment={handleAddAttachment}
          onCancel={handleCancel}
          onTemporarySave={handleTemporarySave}
          onSubmit={handleSubmit}
        />

        <ExpenseGuidePanel
          formData={formData}
          expenseTypeLabel={selectedExpenseTypeLabel}
          relatedProjectLabel={selectedProjectLabel}
        />
      </section>
    </div>
  );
}
