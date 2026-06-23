"use client";

import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { PageHeader } from "@/components/common/PageHeader";
import { ExpenseGuidePanel } from "@/components/expenses/ExpenseGuidePanel";
import { ExpenseRequestForm } from "@/components/expenses/ExpenseRequestForm";
import { attachmentCategories, roleViews } from "@/data/mockData";
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

type TemporaryUserSource = "employee" | "fallback_profile";

type SelectOption = {
  value: string;
  label: string;
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
      userId: string;
      projectId: string;
      categoryId: string;
      checkedAt: string;
    }
  | {
      status: "error";
      message: string;
      code: string | null;
      details: string | null;
      hint: string | null;
      checkedAt: string;
    };

type SupabaseErrorDetails = {
  message: string;
  code: string | null;
  details: string | null;
  hint: string | null;
};

type SubmitDebugState = {
  handleSubmitStarted: boolean;
  submitCount: number;
  validationPassed: boolean | null;
  validationFailedFields: string[];
  selectedProjectId: string | null;
  selectedProjectLabel: string | null;
  selectedCategoryId: string | null;
  selectedCategoryLabel: string | null;
  temporaryUserId: string | null;
  temporaryUserSource: TemporaryUserSource | null;
  insertPayload: ExpenseRequestInsertPayload | null;
  insertAttempted: boolean;
  insertSucceeded: boolean | null;
  insertedRow: InsertedExpenseRequestRow | null;
  error: SupabaseErrorDetails | null;
  lastStep: string;
  checkedAt: string | null;
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

function createInitialDebugState(): SubmitDebugState {
  return {
    handleSubmitStarted: false,
    submitCount: 0,
    validationPassed: null,
    validationFailedFields: [],
    selectedProjectId: null,
    selectedProjectLabel: null,
    selectedCategoryId: null,
    selectedCategoryLabel: null,
    temporaryUserId: null,
    temporaryUserSource: null,
    insertPayload: null,
    insertAttempted: false,
    insertSucceeded: null,
    insertedRow: null,
    error: null,
    lastStep: "대기 중",
    checkedAt: null,
  };
}

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

const paymentMethodValueMap: Record<
  PaymentMethod,
  "personal_card" | "corporate_card" | "cash" | "bank_transfer"
> = {
  개인카드: "personal_card",
  법인카드: "corporate_card",
  현금: "cash",
  계좌이체: "bank_transfer",
};

function createRequestNumber() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const random = String(Math.floor(1000 + Math.random() * 9000));

  return `EXP-${year}${month}${day}-${random}`;
}

function normalizeOptionalText(value: string) {
  return value.trim();
}

function getSupabaseErrorDetails(error: unknown): SupabaseErrorDetails {
  if (typeof error === "object" && error !== null) {
    const message =
      "message" in error && typeof error.message === "string"
        ? error.message
        : "알 수 없는 오류가 발생했습니다.";
    const code = "code" in error && typeof error.code === "string" ? error.code : null;
    const details =
      "details" in error && typeof error.details === "string" ? error.details : null;
    const hint = "hint" in error && typeof error.hint === "string" ? error.hint : null;

    return {
      message,
      code,
      details,
      hint,
    };
  }

  return {
    message: error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.",
    code: null,
    details: null,
    hint: null,
  };
}

function buildValidationDebugMessage(validationErrors: ExpenseRequestErrors) {
  const failedFields = Object.entries(validationErrors).map(
    ([field, message]) => `${field}: ${message}`,
  );

  return failedFields.join("\n");
}

export default function ExpenseRequestPage() {
  const router = useRouter();
  const [formData, setFormData] = useState<ExpenseRequestFormData>(() =>
    createInitialFormData(),
  );
  const [errors, setErrors] = useState<ExpenseRequestErrors>({});
  const [projectOptions, setProjectOptions] = useState<ProjectOptionRow[]>([]);
  const [expenseCategoryOptions, setExpenseCategoryOptions] = useState<
    ExpenseCategoryOptionRow[]
  >([]);
  const [temporaryUserPreview, setTemporaryUserPreview] = useState<TemporaryUserRow | null>(null);
  const [temporaryUserPreviewSource, setTemporaryUserPreviewSource] =
    useState<TemporaryUserSource | null>(null);
  const [referenceLoading, setReferenceLoading] = useState(true);
  const [referenceError, setReferenceError] = useState<string | null>(null);
  const [submitResult, setSubmitResult] = useState<SubmitResult | null>(null);
  const [submitDebugState, setSubmitDebugState] = useState<SubmitDebugState>(() =>
    createInitialDebugState(),
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadReferenceData() {
      setReferenceLoading(true);
      setReferenceError(null);

      if (!isSupabaseConfigured) {
        if (!isMounted) {
          return;
        }

        setReferenceError(
          "Supabase 환경변수가 설정되지 않았습니다. NEXT_PUBLIC_SUPABASE_URL 및 NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY를 확인해주세요.",
        );
        setReferenceLoading(false);
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

        const messages: string[] = [];

        if (projectsResult.error) {
          messages.push(`[projects] ${projectsResult.error.message}`);
        } else {
          setProjectOptions(projectsResult.data ?? []);
        }

        if (categoriesResult.error) {
          messages.push(`[expense_categories] ${categoriesResult.error.message}`);
        } else {
          setExpenseCategoryOptions(categoriesResult.data ?? []);
        }

        if (employeeResult.error) {
          messages.push(`[profiles:employee] ${employeeResult.error.message}`);
        }

        if (fallbackProfileResult.error) {
          messages.push(`[profiles:fallback] ${fallbackProfileResult.error.message}`);
        }

        if (!employeeResult.error || !fallbackProfileResult.error) {
          const employee = employeeResult.data?.[0] ?? null;
          const fallbackProfile = fallbackProfileResult.data?.[0] ?? null;
          const resolvedTemporaryUser = employee ?? fallbackProfile;
          const resolvedSource: TemporaryUserSource | null = employee
            ? "employee"
            : fallbackProfile
              ? "fallback_profile"
              : null;

          if (!resolvedTemporaryUser || !resolvedSource) {
            messages.push(
              "[profiles] 임시 제출에 사용할 프로필을 찾을 수 없습니다. employee 또는 첫 번째 profiles row가 필요합니다.",
            );
          } else {
            setTemporaryUserPreview(resolvedTemporaryUser);
            setTemporaryUserPreviewSource(resolvedSource);
          }
        }

        if (messages.length > 0) {
          setReferenceError(messages.join("\n"));
        }
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.";

        if (!isMounted) {
          return;
        }

        setReferenceError(message);
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

  const selectedProject = useMemo(
    () => projectOptions.find((project) => project.id === formData.relatedProject) ?? null,
    [formData.relatedProject, projectOptions],
  );

  const selectedCategory = useMemo(
    () =>
      expenseCategoryOptions.find((category) => category.id === formData.expenseType) ?? null,
    [expenseCategoryOptions, formData.expenseType],
  );

  const selectedProjectLabel = selectedProject?.name ?? "";
  const selectedExpenseTypeLabel = selectedCategory?.name ?? "";

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

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const submitStartedAt = new Date().toISOString();

    console.log("[ExpenseRequestPage] step: handleSubmit start", {
      formData,
      referenceLoading,
      referenceError,
      selectedProjectId: formData.relatedProject,
      selectedCategoryId: formData.expenseType,
      temporaryUserPreviewId: temporaryUserPreview?.id ?? null,
    });

    setSubmitResult(null);
    setSubmitDebugState((current) => ({
      ...createInitialDebugState(),
      handleSubmitStarted: true,
      submitCount: current.submitCount + 1,
      selectedProjectId: formData.relatedProject || null,
      selectedProjectLabel: selectedProject?.name ?? null,
      selectedCategoryId: formData.expenseType || null,
      selectedCategoryLabel: selectedCategory?.name ?? null,
      temporaryUserId: temporaryUserPreview?.id ?? null,
      temporaryUserSource: temporaryUserPreviewSource,
      lastStep: "handleSubmit 시작",
      checkedAt: submitStartedAt,
    }));

    const validationErrors = validateForm(formData);
    setErrors(validationErrors);

    console.log("[ExpenseRequestPage] step: validation result", validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      const validationFailureFields = Object.keys(validationErrors);
      const validationMessage = buildValidationDebugMessage(validationErrors);

      console.warn("[ExpenseRequestPage] step: validation blocked submit", validationErrors);

      setSubmitResult({
        status: "error",
        message: "필수 입력값을 확인해주세요.",
        code: "VALIDATION_ERROR",
        details: validationMessage,
        hint: "표시된 입력 오류를 수정한 뒤 다시 제출해주세요.",
        checkedAt: new Date().toISOString(),
      });
      setSubmitDebugState((current) => ({
        ...current,
        validationPassed: false,
        validationFailedFields: validationFailureFields,
        lastStep: "validation 실패",
        checkedAt: new Date().toISOString(),
      }));
      return;
    }

    setSubmitDebugState((current) => ({
      ...current,
      validationPassed: true,
      validationFailedFields: [],
      lastStep: "validation 통과",
      checkedAt: new Date().toISOString(),
    }));

    if (referenceLoading) {
      setSubmitResult({
        status: "error",
        message: "프로젝트 및 경비 유형 정보를 불러오는 중입니다. 잠시 후 다시 시도해주세요.",
        code: "REFERENCE_LOADING",
        details: null,
        hint: "기준정보 로딩이 끝난 뒤 다시 제출해주세요.",
        checkedAt: new Date().toISOString(),
      });
      setSubmitDebugState((current) => ({
        ...current,
        lastStep: "기준정보 로딩 중",
        error: {
          message: "프로젝트 및 경비 유형 정보를 불러오는 중입니다.",
          code: "REFERENCE_LOADING",
          details: null,
          hint: "기준정보 로딩이 끝난 뒤 다시 제출해주세요.",
        },
        checkedAt: new Date().toISOString(),
      }));
      return;
    }

    if (referenceError) {
      setSubmitResult({
        status: "error",
        message: referenceError,
        code: "REFERENCE_ERROR",
        details: referenceError,
        hint: "기준정보 조회 오류를 먼저 해결해주세요.",
        checkedAt: new Date().toISOString(),
      });
      setSubmitDebugState((current) => ({
        ...current,
        lastStep: "기준정보 오류",
        error: {
          message: referenceError,
          code: "REFERENCE_ERROR",
          details: referenceError,
          hint: "기준정보 조회 오류를 먼저 해결해주세요.",
        },
        checkedAt: new Date().toISOString(),
      }));
      return;
    }

    if (!isSupabaseConfigured) {
      setSubmitResult({
        status: "error",
        message:
          "Supabase 환경변수가 설정되지 않았습니다. NEXT_PUBLIC_SUPABASE_URL 및 NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY를 확인해주세요.",
        code: "SUPABASE_ENV_MISSING",
        details: null,
        hint: "환경변수를 확인한 뒤 다시 시도해주세요.",
        checkedAt: new Date().toISOString(),
      });
      setSubmitDebugState((current) => ({
        ...current,
        lastStep: "Supabase 환경변수 없음",
        error: {
          message:
            "Supabase 환경변수가 설정되지 않았습니다. NEXT_PUBLIC_SUPABASE_URL 및 NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY를 확인해주세요.",
          code: "SUPABASE_ENV_MISSING",
          details: null,
          hint: "환경변수를 확인한 뒤 다시 시도해주세요.",
        },
        checkedAt: new Date().toISOString(),
      }));
      return;
    }

    if (countAttachments(formData) === 0) {
      const shouldContinue = window.confirm(
        "증빙자료가 첨부되지 않았습니다. 증빙이 없으면 승인 또는 정산이 보류될 수 있습니다. 그래도 승인 요청을 제출하시겠습니까?",
      );

      if (!shouldContinue) {
        setSubmitDebugState((current) => ({
          ...current,
          lastStep: "사용자가 증빙 경고 확인 후 제출 취소",
          checkedAt: new Date().toISOString(),
        }));
        return;
      }
    }

    setIsSubmitting(true);

    try {
      const supabase = getSupabaseBrowserClient();

      console.log("[ExpenseRequestPage] step: resolve temporary user");

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
        console.error("[ExpenseRequestPage] employee query error", employeeResult.error);
      }

      if (fallbackProfileResult.error) {
        console.error("[ExpenseRequestPage] fallback profile query error", fallbackProfileResult.error);
      }

      const resolvedTemporaryUser =
        employeeResult.data?.[0] ?? fallbackProfileResult.data?.[0] ?? null;
      const resolvedTemporaryUserSource: TemporaryUserSource | null = employeeResult.data?.[0]
        ? "employee"
        : fallbackProfileResult.data?.[0]
          ? "fallback_profile"
          : null;

      console.log("[ExpenseRequestPage] step: temporary user resolved", {
        employeeResult: employeeResult.data?.[0] ?? null,
        fallbackProfileResult: fallbackProfileResult.data?.[0] ?? null,
        resolvedTemporaryUser,
        resolvedTemporaryUserSource,
      });

      if (!resolvedTemporaryUser || !resolvedTemporaryUserSource) {
        throw new Error(
          "제출에 사용할 user_id를 찾을 수 없습니다. profiles 테이블에 employee 또는 최소 1개의 row가 필요합니다.",
        );
      }

      setTemporaryUserPreview(resolvedTemporaryUser);
      setTemporaryUserPreviewSource(resolvedTemporaryUserSource);
      setSubmitDebugState((current) => ({
        ...current,
        temporaryUserId: resolvedTemporaryUser.id,
        temporaryUserSource: resolvedTemporaryUserSource,
        lastStep: "임시 employee user_id 조회 완료",
        checkedAt: new Date().toISOString(),
      }));

      const resolvedProject =
        projectOptions.find((project) => project.id === formData.relatedProject) ?? null;
      const resolvedCategory =
        expenseCategoryOptions.find((category) => category.id === formData.expenseType) ?? null;

      if (!resolvedProject || !resolvedCategory) {
        throw new Error(
          "선택한 project_id 또는 category_id를 기준정보에서 찾지 못했습니다. select option value가 uuid id인지 확인해주세요.",
        );
      }

      const normalizedAmount = Number(formData.amount);

      if (!Number.isFinite(normalizedAmount)) {
        throw new Error("amount를 숫자로 변환하지 못했습니다.");
      }

      const requestNo = createRequestNumber();
      const insertPayload: ExpenseRequestInsertPayload = {
        request_no: requestNo,
        user_id: resolvedTemporaryUser.id,
        project_id: resolvedProject.id,
        category_id: resolvedCategory.id,
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

      console.log("[ExpenseRequestPage] step: insert payload generated", insertPayload);

      setSubmitDebugState((current) => ({
        ...current,
        selectedProjectId: resolvedProject.id,
        selectedProjectLabel: resolvedProject.name,
        selectedCategoryId: resolvedCategory.id,
        selectedCategoryLabel: resolvedCategory.name,
        temporaryUserId: resolvedTemporaryUser.id,
        temporaryUserSource: resolvedTemporaryUserSource,
        insertPayload,
        lastStep: "insert payload 생성 완료",
        checkedAt: new Date().toISOString(),
      }));

      console.log("[ExpenseRequestPage] step: supabase insert execute");

      setSubmitDebugState((current) => ({
        ...current,
        insertAttempted: true,
        lastStep: "supabase insert 실행",
        checkedAt: new Date().toISOString(),
      }));

      const { data, error } = await supabase
        .from("expense_requests")
        .insert(insertPayload)
        .select()
        .single();

      console.log("[ExpenseRequestPage] step: insert result", {
        data,
        error: error
          ? {
              message: error.message,
              code: error.code,
              details: error.details,
              hint: error.hint,
            }
          : null,
      });

      if (error) {
        throw error;
      }

      if (!data || typeof data !== "object") {
        throw new Error("insert는 실행되었지만 생성된 row 데이터를 반환받지 못했습니다.");
      }

      const insertedRow: InsertedExpenseRequestRow = {
        id: String((data as { id?: string }).id ?? ""),
        request_no: String((data as { request_no?: string }).request_no ?? ""),
      };

      if (!insertedRow.id || !insertedRow.request_no) {
        throw new Error("생성된 row의 id 또는 request_no가 비어 있습니다.");
      }

      setFormData(createInitialFormData());
      setErrors({});
      setSubmitResult({
        status: "success",
        message: "경비 승인 요청이 제출되었습니다.",
        requestNo: insertedRow.request_no,
        createdId: insertedRow.id,
        userId: resolvedTemporaryUser.id,
        projectId: resolvedProject.id,
        categoryId: resolvedCategory.id,
        checkedAt: new Date().toISOString(),
      });
      setSubmitDebugState((current) => ({
        ...current,
        insertSucceeded: true,
        insertedRow,
        error: null,
        lastStep: "insert 성공",
        checkedAt: new Date().toISOString(),
      }));
    } catch (error) {
      const errorDetails = getSupabaseErrorDetails(error);

      console.error("[ExpenseRequestPage] step: insert exception", errorDetails);

      setSubmitResult({
        status: "error",
        message: errorDetails.message,
        code: errorDetails.code,
        details: errorDetails.details,
        hint: errorDetails.hint,
        checkedAt: new Date().toISOString(),
      });
      setSubmitDebugState((current) => ({
        ...current,
        insertSucceeded: false,
        error: errorDetails,
        lastStep: "insert 실패",
        checkedAt: new Date().toISOString(),
      }));
    } finally {
      setIsSubmitting(false);
    }
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

      {referenceError ? (
        <section className="rounded-[1.75rem] border border-rose-200 bg-rose-50 px-5 py-4 text-sm leading-6 text-rose-700 shadow-sm">
          <p className="font-semibold">Supabase 기준정보를 불러오지 못했습니다.</p>
          <p className="mt-2 whitespace-pre-wrap break-words">{referenceError}</p>
        </section>
      ) : null}

      {submitResult?.status === "success" ? (
        <section className="rounded-[1.75rem] border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm leading-6 text-emerald-800 shadow-sm">
          <p className="font-semibold">저장이 완료되었습니다.</p>
          <p className="mt-2">{submitResult.message}</p>
          <p className="mt-2">
            생성된 요청번호: <span className="font-semibold">{submitResult.requestNo}</span>
          </p>
          <p>
            생성된 row id: <span className="font-semibold">{submitResult.createdId}</span>
          </p>
          <p>
            user_id / project_id / category_id:
            {" "}
            <span className="font-semibold">
              {submitResult.userId} / {submitResult.projectId} / {submitResult.categoryId}
            </span>
          </p>
          <p>조회 시각: {submitResult.checkedAt}</p>
        </section>
      ) : null}

      {submitResult?.status === "error" ? (
        <section className="rounded-[1.75rem] border border-rose-200 bg-rose-50 px-5 py-4 text-sm leading-6 text-rose-700 shadow-sm">
          <p className="font-semibold">저장에 실패했습니다.</p>
          <p className="mt-2 whitespace-pre-wrap break-words">
            error.message: {submitResult.message}
          </p>
          <p className="mt-1 whitespace-pre-wrap break-words">
            error.code: {submitResult.code ?? "(없음)"}
          </p>
          <p className="mt-1 whitespace-pre-wrap break-words">
            error.details: {submitResult.details ?? "(없음)"}
          </p>
          <p className="mt-1 whitespace-pre-wrap break-words">
            error.hint: {submitResult.hint ?? "(없음)"}
          </p>
          <p className="mt-1">조회 시각: {submitResult.checkedAt}</p>
        </section>
      ) : null}

      <section className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
        <ExpenseRequestForm
          formData={formData}
          errors={errors}
          expenseTypeOptions={expenseTypeSelectOptions}
          relatedWorkOptions={projectSelectOptions}
          attachmentCategories={attachmentCategories}
          onFieldChange={updateField}
          onAddAttachment={handleAddAttachment}
          onCancel={handleCancel}
          onTemporarySave={handleTemporarySave}
          onSubmit={handleSubmit}
          isReferenceLoading={referenceLoading}
          isSubmitting={isSubmitting}
          selectedExpenseTypeLabel={selectedExpenseTypeLabel}
        />

        <ExpenseGuidePanel
          formData={formData}
          expenseTypeLabel={selectedExpenseTypeLabel}
          relatedProjectLabel={selectedProjectLabel}
        />
      </section>

      <section className="rounded-[1.75rem] border border-slate-200/90 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-950">제출 디버그 패널</h3>
            <p className="mt-1 text-sm text-slate-500">
              승인 요청 제출 과정 전체를 화면에서 바로 확인할 수 있도록 단계별 상태를 표시합니다.
            </p>
          </div>
          <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">
            마지막 단계: {submitDebugState.lastStep}
          </span>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
              handleSubmit 실행 여부
            </p>
            <p className="mt-2 text-sm font-semibold text-slate-900">
              {submitDebugState.handleSubmitStarted ? "실행됨" : "미실행"}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              제출 시도 횟수: {submitDebugState.submitCount}회
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
              validation 통과 여부
            </p>
            <p className="mt-2 text-sm font-semibold text-slate-900">
              {submitDebugState.validationPassed === null
                ? "아직 확인 전"
                : submitDebugState.validationPassed
                  ? "통과"
                  : "실패"}
            </p>
            <p className="mt-1 whitespace-pre-wrap break-words text-xs text-slate-500">
              실패 필드:{" "}
              {submitDebugState.validationFailedFields.length > 0
                ? submitDebugState.validationFailedFields.join(", ")
                : "(없음)"}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
              임시 user_id
            </p>
            <p className="mt-2 break-all text-sm font-semibold text-slate-900">
              {submitDebugState.temporaryUserId ?? "(없음)"}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              source: {submitDebugState.temporaryUserSource ?? "(없음)"}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
              선택된 project_id
            </p>
            <p className="mt-2 break-all text-sm font-semibold text-slate-900">
              {submitDebugState.selectedProjectId ?? "(없음)"}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {submitDebugState.selectedProjectLabel ?? "(라벨 없음)"}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
              선택된 category_id
            </p>
            <p className="mt-2 break-all text-sm font-semibold text-slate-900">
              {submitDebugState.selectedCategoryId ?? "(없음)"}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {submitDebugState.selectedCategoryLabel ?? "(라벨 없음)"}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
              insert 성공 여부
            </p>
            <p className="mt-2 text-sm font-semibold text-slate-900">
              {submitDebugState.insertSucceeded === null
                ? "아직 확인 전"
                : submitDebugState.insertSucceeded
                  ? "성공"
                  : "실패"}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              insert 실행 여부: {submitDebugState.insertAttempted ? "실행됨" : "미실행"}
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-4 xl:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
              insert 성공 결과
            </p>
            <p className="mt-2 break-all text-sm text-slate-700">
              row id:{" "}
              <span className="font-semibold text-slate-900">
                {submitDebugState.insertedRow?.id ?? "(없음)"}
              </span>
            </p>
            <p className="mt-1 break-all text-sm text-slate-700">
              request_no:{" "}
              <span className="font-semibold text-slate-900">
                {submitDebugState.insertedRow?.request_no ?? "(없음)"}
              </span>
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
              insert 실패 정보
            </p>
            <p className="mt-2 whitespace-pre-wrap break-words text-sm text-slate-700">
              error.message:{" "}
              <span className="font-semibold text-slate-900">
                {submitDebugState.error?.message ?? "(없음)"}
              </span>
            </p>
            <p className="mt-1 whitespace-pre-wrap break-words text-sm text-slate-700">
              error.code:{" "}
              <span className="font-semibold text-slate-900">
                {submitDebugState.error?.code ?? "(없음)"}
              </span>
            </p>
            <p className="mt-1 whitespace-pre-wrap break-words text-sm text-slate-700">
              error.details:{" "}
              <span className="font-semibold text-slate-900">
                {submitDebugState.error?.details ?? "(없음)"}
              </span>
            </p>
            <p className="mt-1 whitespace-pre-wrap break-words text-sm text-slate-700">
              error.hint:{" "}
              <span className="font-semibold text-slate-900">
                {submitDebugState.error?.hint ?? "(없음)"}
              </span>
            </p>
          </div>
        </div>

        <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-950 px-4 py-4 text-sm text-slate-100">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <p className="font-semibold">insert payload raw JSON</p>
            <p className="text-xs text-slate-400">
              updated at: {submitDebugState.checkedAt ?? "(없음)"}
            </p>
          </div>
          <pre className="mt-3 overflow-x-auto whitespace-pre-wrap break-all text-xs leading-6 text-slate-200">
            {JSON.stringify(submitDebugState.insertPayload, null, 2) ?? "null"}
          </pre>
        </div>
      </section>
    </div>
  );
}
