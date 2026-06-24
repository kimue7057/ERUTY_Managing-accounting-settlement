import type { AttachmentCategory, RoleView } from "@/types";

export const roleViews: RoleView[] = ["직원 보기", "관리자 보기", "대표 보기"];

export const attachmentCategories: AttachmentCategory[] = [
  "영수증",
  "카드전표",
  "현금영수증",
  "간이영수증",
  "교통비 증빙",
  "기타 증빙",
];

export const expenseHistoryStatusOptions = [
  "전체",
  "승인대기",
  "승인완료",
  "수정요청",
  "반려",
  "보류",
  "정산대기",
  "정산완료",
  "지급완료",
] as const;

export const expenseHistoryTypeOptions = [
  "전체",
  "식대/회의비",
  "교통비",
  "출장비",
  "소모품비",
  "서버/소프트웨어비",
  "기타",
] as const;
