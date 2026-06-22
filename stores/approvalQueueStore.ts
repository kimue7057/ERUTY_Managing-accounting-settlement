"use client";

import { useSyncExternalStore } from "react";

import { approvalQueueItems as initialApprovalQueueItems } from "@/data/mockData";
import type {
  ApprovalQueueItem,
  ReviewDecision,
  SettlementProcessingOption,
} from "@/types";

type ReviewUpdate = {
  requestNumber: string;
  decision: ReviewDecision;
  approvedAmount: number;
  adminMemo: string;
  settlementProcessing: SettlementProcessingOption;
  includeAccounting: boolean;
};

let approvalQueueState: ApprovalQueueItem[] = initialApprovalQueueItems;
const listeners = new Set<() => void>();

function emitChange() {
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return approvalQueueState;
}

export function useApprovalQueueItems() {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export function updateApprovalQueueReview(update: ReviewUpdate) {
  approvalQueueState = approvalQueueState.map((item) => {
    if (item.requestNumber !== update.requestNumber) {
      return item;
    }

    const nextStatus =
      update.decision === "승인"
        ? "승인완료"
        : update.decision === "반려"
          ? "반려"
          : "수정요청";

    return {
      ...item,
      status: nextStatus,
      reviewDecision: update.decision,
      approvedAmount: update.approvedAmount,
      adminMemo: update.adminMemo,
      settlementProcessing: update.settlementProcessing,
      includeAccounting: update.includeAccounting,
    };
  });

  emitChange();
}
