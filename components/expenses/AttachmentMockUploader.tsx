"use client";

import { useState } from "react";

import type { AttachmentCategory } from "@/types";

type AttachmentMockUploaderProps = {
  categories: AttachmentCategory[];
  attachments: Record<AttachmentCategory, string[]>;
  onAddFiles: (category: AttachmentCategory, fileNames: string[]) => void;
};

const fieldClassName =
  "w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-[var(--primary)] focus:ring-4 focus:ring-[color:rgba(22,59,111,0.08)]";

export function AttachmentMockUploader({
  categories,
  attachments,
  onAddFiles,
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
          영수증, 카드전표, 현금영수증 등 경비 사용을 확인할 수 있는 증빙자료를 첨부해주세요.
        </p>
        <p className="mt-1 text-xs text-amber-700">
          증빙자료가 없으면 승인 또는 정산이 보류될 수 있습니다.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
        <div>
          <label htmlFor="attachment-category" className="text-sm font-semibold text-slate-900">
            증빙 유형
          </label>
          <p className="mt-1 text-xs text-slate-500">첨부하려는 자료 유형을 먼저 선택해주세요.</p>
          <select
            id="attachment-category"
            value={selectedCategory}
            onChange={(event) => setSelectedCategory(event.target.value as AttachmentCategory)}
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
            className="inline-flex cursor-pointer items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
          >
            파일 선택
          </label>
          <input
            id="attachment-file-input"
            type="file"
            multiple
            className="hidden"
            onChange={(event) => {
              const fileNames = Array.from(event.target.files ?? []).map((file) => file.name);

              if (fileNames.length > 0) {
                onAddFiles(selectedCategory, fileNames);
              }

              event.currentTarget.value = "";
            }}
          />
        </div>
      </div>

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
              <span className="shrink-0 text-xs font-medium text-slate-400">mock</span>
            </div>
          ))
        ) : (
          <p className="text-sm text-slate-400">첨부된 증빙자료가 없습니다.</p>
        )}
      </div>
    </div>
  );
}
