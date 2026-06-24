"use client";

import { useState } from "react";

import type { AttachmentCategory } from "@/types";

type AttachmentMockUploaderProps = {
  categories: AttachmentCategory[];
  attachments: Record<AttachmentCategory, string[]>;
  onAddFiles: (category: AttachmentCategory, files: File[]) => void;
  isDisabled?: boolean;
  selectionState?: {
    tone: "info" | "warning" | "error";
    message: string;
    details?: string[];
  } | null;
  uploadState?: {
    phase: "uploading" | "success" | "partial" | "error";
    message: string;
    uploadedCount: number;
    failedCount: number;
    details?: string[];
    checkedAt: string;
  } | null;
};

const fieldClassName =
  "w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-[var(--primary)] focus:ring-4 focus:ring-[color:rgba(22,59,111,0.08)]";

function InlineNotice({
  title,
  message,
  details,
  tone,
}: {
  title: string;
  message: string;
  details?: string[];
  tone: "info" | "warning" | "error" | "success";
}) {
  const toneClassName =
    tone === "success"
      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
      : tone === "warning"
        ? "border-amber-200 bg-amber-50 text-amber-800"
        : tone === "error"
          ? "border-rose-200 bg-rose-50 text-rose-700"
          : "border-sky-200 bg-sky-50 text-sky-800";

  return (
    <div className={["rounded-2xl border px-4 py-3 text-sm shadow-sm", toneClassName].join(" ")}>
      <p className="font-semibold">{title}</p>
      <p className="mt-1 leading-6">{message}</p>
      {details && details.length > 0 ? (
        <div className="mt-2 space-y-1 text-xs leading-5">
          {details.map((detail, index) => (
            <p key={`${detail}-${index}`} className="break-words">
              {detail}
            </p>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function AttachmentMockUploader({
  categories,
  attachments,
  onAddFiles,
  isDisabled = false,
  selectionState = null,
  uploadState = null,
}: AttachmentMockUploaderProps) {
  const [selectedCategory, setSelectedCategory] = useState<AttachmentCategory>(categories[0]);

  const attachmentEntries = Object.entries(attachments).flatMap(([category, files]) =>
    files.map((fileName, index) => ({
      category: category as AttachmentCategory,
      fileName,
      key: `${category}-${fileName}-${index}`,
    })),
  );

  return (
    <div className="space-y-4 rounded-[1.5rem] border border-dashed border-slate-300 bg-slate-50/70 p-4">
      <div>
        <p className="text-sm font-medium text-slate-700">
          영수증, 카드전표, PDF 증빙 자료를 첨부해서 승인 검토와 정산 확인에 필요한 근거를 남겨주세요.
        </p>
        <p className="mt-1 text-xs text-amber-700">
          허용 파일 형식은 `jpg`, `jpeg`, `png`, `pdf`이고 파일은 최대 10MB까지 업로드할 수 있습니다.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
        <div>
          <label htmlFor="attachment-category" className="text-sm font-semibold text-slate-900">
            첨부 유형
          </label>
          <p className="mt-1 text-xs text-slate-500">첨부하려는 자료 유형을 먼저 선택해주세요.</p>
          <select
            id="attachment-category"
            value={selectedCategory}
            onChange={(event) => setSelectedCategory(event.target.value as AttachmentCategory)}
            disabled={isDisabled}
            className={`mt-2 ${fieldClassName}`}
          >
            {categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor="attachment-file-input"
            className={[
              "inline-flex items-center justify-center rounded-2xl border px-4 py-3 text-sm font-medium shadow-sm transition",
              isDisabled
                ? "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400"
                : "cursor-pointer border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50",
            ].join(" ")}
          >
            파일 선택
          </label>
          <input
            id="attachment-file-input"
            type="file"
            multiple
            accept=".jpg,.jpeg,.png,.pdf"
            disabled={isDisabled}
            className="hidden"
            onChange={(event) => {
              const files = Array.from(event.target.files ?? []);

              if (files.length > 0) {
                onAddFiles(selectedCategory, files);
              }

              event.currentTarget.value = "";
            }}
          />
        </div>
      </div>

      {selectionState ? (
        <InlineNotice
          title="첨부 파일 선택 상태"
          message={selectionState.message}
          details={selectionState.details}
          tone={selectionState.tone}
        />
      ) : null}

      {uploadState ? (
        <InlineNotice
          title={
            uploadState.phase === "uploading"
              ? "증빙 업로드 진행 중"
              : uploadState.phase === "success"
                ? "증빙 업로드 완료"
                : uploadState.phase === "partial"
                  ? "증빙 업로드 일부 실패"
                  : "증빙 업로드 실패"
          }
          message={`${uploadState.message} 성공 ${uploadState.uploadedCount}건 / 실패 ${uploadState.failedCount}건`}
          details={uploadState.details}
          tone={
            uploadState.phase === "uploading"
              ? "info"
              : uploadState.phase === "success"
                ? "success"
                : uploadState.phase === "partial"
                  ? "warning"
                  : "error"
          }
        />
      ) : null}

      <div className="space-y-2">
        {attachmentEntries.length > 0 ? (
          attachmentEntries.map((attachment) => (
            <div
              key={attachment.key}
              className="flex items-center justify-between gap-3 rounded-2xl bg-white px-4 py-3 text-sm shadow-sm"
            >
              <div className="min-w-0">
                <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                  {attachment.category}
                </span>
                <p className="mt-2 truncate text-slate-700">{attachment.fileName}</p>
              </div>
              <span className="shrink-0 text-xs font-medium text-slate-400">업로드 대기</span>
            </div>
          ))
        ) : (
          <p className="text-sm text-slate-400">첨부 대기 중인 증빙 파일이 없습니다.</p>
        )}
      </div>
    </div>
  );
}
