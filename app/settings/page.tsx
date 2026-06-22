"use client";

import { useState } from "react";
import {
  FolderKanban,
  Settings2,
  ShieldCheck,
  Users,
  WalletCards,
} from "lucide-react";

import { AmountText } from "@/components/common/AmountText";
import { DashboardTable } from "@/components/common/DashboardTable";
import { PageHeader } from "@/components/common/PageHeader";
import { StatusBadge } from "@/components/common/StatusBadge";
import {
  initialSettlementPolicySettings,
  roleViews,
  settingsAccounts,
  settingsExpenseTypes,
  settingsProjects,
  settingsUsers,
} from "@/data/mockData";
import type {
  AccountManagementItem,
  ExpenseTypeManagementItem,
  ProjectManagementItem,
  SettlementPolicySettings,
  UserManagementItem,
  UserManagementRole,
} from "@/types";

type SettingsTabKey =
  | "users"
  | "projects"
  | "expense-types"
  | "accounts"
  | "settlement-policy";

const tabs: Array<{ key: SettingsTabKey; label: string }> = [
  { key: "users", label: "사용자 관리" },
  { key: "projects", label: "프로젝트 관리" },
  { key: "expense-types", label: "경비 유형 관리" },
  { key: "accounts", label: "계좌 관리" },
  { key: "settlement-policy", label: "정산 정책" },
];

const userColumns = [
  { key: "name", label: "이름" },
  { key: "email", label: "이메일" },
  { key: "department", label: "부서" },
  { key: "role", label: "권한", align: "center" as const },
  { key: "status", label: "상태", align: "center" as const },
  { key: "manage", label: "관리", align: "center" as const },
];

const projectColumns = [
  { key: "projectName", label: "프로젝트명" },
  { key: "totalBudget", label: "총예산", align: "right" as const },
  { key: "startDate", label: "시작일" },
  { key: "endDate", label: "종료일" },
  { key: "owner", label: "담당자" },
  { key: "status", label: "상태", align: "center" as const },
];

const accountColumns = [
  { key: "accountName", label: "계좌명" },
  { key: "bankName", label: "은행명" },
  { key: "accountNumber", label: "계좌번호" },
  { key: "currentBalance", label: "현재 잔액", align: "right" as const },
  { key: "enabled", label: "사용 여부", align: "center" as const },
];

const userRoleToneMap: Record<UserManagementRole, string> = {
  직원: "border-slate-200 bg-slate-100 text-slate-700",
  관리자: "border-[color:rgba(22,59,111,0.14)] bg-[var(--primary-soft)] text-[var(--primary)]",
};

function ToneBadge({ children, className }: { children: React.ReactNode; className: string }) {
  return (
    <span
      className={[
        "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold",
        className,
      ].join(" ")}
    >
      {children}
    </span>
  );
}

function Toggle({
  enabled,
  onToggle,
  enabledLabel = "활성",
  disabledLabel = "비활성",
}: {
  enabled: boolean;
  onToggle: () => void;
  enabledLabel?: string;
  disabledLabel?: string;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={enabled}
      className={[
        "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition",
        enabled
          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
          : "border-slate-300 bg-slate-100 text-slate-600",
      ].join(" ")}
    >
      <span
        className={[
          "h-2.5 w-2.5 rounded-full",
          enabled ? "bg-emerald-500" : "bg-slate-400",
        ].join(" ")}
      />
      {enabled ? enabledLabel : disabledLabel}
    </button>
  );
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTabKey>("users");
  const [users, setUsers] = useState<UserManagementItem[]>(settingsUsers);
  const [projects] = useState<ProjectManagementItem[]>(settingsProjects);
  const [expenseTypes, setExpenseTypes] =
    useState<ExpenseTypeManagementItem[]>(settingsExpenseTypes);
  const [accounts, setAccounts] = useState<AccountManagementItem[]>(settingsAccounts);
  const [settlementPolicy, setSettlementPolicy] =
    useState<SettlementPolicySettings>(initialSettlementPolicySettings);

  const handleToggleUserStatus = (userId: string) => {
    setUsers((current) =>
      current.map((user) =>
        user.id === userId
          ? { ...user, status: user.status === "활성" ? "비활성" : "활성" }
          : user,
      ),
    );
  };

  const handleToggleUserRole = (userId: string) => {
    setUsers((current) =>
      current.map((user) =>
        user.id === userId
          ? { ...user, role: user.role === "관리자" ? "직원" : "관리자" }
          : user,
      ),
    );
  };

  const handleToggleExpenseType = (itemId: string) => {
    setExpenseTypes((current) =>
      current.map((item) => (item.id === itemId ? { ...item, enabled: !item.enabled } : item)),
    );
  };

  const handleToggleAccount = (accountId: string) => {
    setAccounts((current) =>
      current.map((account) =>
        account.id === accountId ? { ...account, enabled: !account.enabled } : account,
      ),
    );
  };

  const renderUsersTab = () => (
    <section className="rounded-[1.75rem] border border-slate-200/90 bg-white p-5 shadow-sm">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-slate-950">사용자 관리</h3>
        <p className="mt-1 text-sm text-slate-500">
          내부 사용자 계정의 권한과 사용 상태를 관리하는 mock UI입니다.
        </p>
      </div>

      <DashboardTable columns={userColumns}>
        {users.map((user) => (
          <tr key={user.id} className="border-b border-slate-100 last:border-b-0">
            <td className="px-4 py-4 font-medium text-slate-900">{user.name}</td>
            <td className="px-4 py-4 text-slate-600">{user.email}</td>
            <td className="px-4 py-4 text-slate-700">{user.department}</td>
            <td className="px-4 py-4 text-center">
              <ToneBadge className={userRoleToneMap[user.role]}>{user.role}</ToneBadge>
            </td>
            <td className="px-4 py-4 text-center">
              <StatusBadge status={user.status} />
            </td>
            <td className="px-4 py-4">
              <div className="flex justify-center gap-2">
                <button
                  type="button"
                  onClick={() => handleToggleUserRole(user.id)}
                  className="inline-flex rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
                >
                  권한 변경
                </button>
                <button
                  type="button"
                  onClick={() => handleToggleUserStatus(user.id)}
                  className="inline-flex rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
                >
                  상태 전환
                </button>
              </div>
            </td>
          </tr>
        ))}
      </DashboardTable>
    </section>
  );

  const renderProjectsTab = () => (
    <section className="rounded-[1.75rem] border border-slate-200/90 bg-white p-5 shadow-sm">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-slate-950">프로젝트 관리</h3>
        <p className="mt-1 text-sm text-slate-500">
          프로젝트 기본 정보와 예산 운영 기준이 되는 프로젝트 메타데이터를 확인합니다.
        </p>
      </div>

      <DashboardTable columns={projectColumns}>
        {projects.map((project) => (
          <tr key={project.id} className="border-b border-slate-100 last:border-b-0">
            <td className="px-4 py-4 font-medium text-slate-900">{project.projectName}</td>
            <td className="px-4 py-4 text-right font-medium text-slate-900">
              <AmountText value={project.totalBudget} />
            </td>
            <td className="px-4 py-4 text-slate-600">
              <time dateTime={project.startDate}>{project.startDate}</time>
            </td>
            <td className="px-4 py-4 text-slate-600">
              <time dateTime={project.endDate}>{project.endDate}</time>
            </td>
            <td className="px-4 py-4 text-slate-700">{project.owner}</td>
            <td className="px-4 py-4 text-center">
              <StatusBadge status={project.status} />
            </td>
          </tr>
        ))}
      </DashboardTable>
    </section>
  );

  const renderExpenseTypesTab = () => (
    <section className="rounded-[1.75rem] border border-slate-200/90 bg-white p-5 shadow-sm">
      <div className="mb-5">
        <h3 className="text-lg font-semibold text-slate-950">경비 유형 관리</h3>
        <p className="mt-1 text-sm text-slate-500">
          실제 저장 없이 경비 유형의 활성/비활성 상태를 화면에서 바로 토글할 수 있습니다.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {expenseTypes.map((item) => (
          <div
            key={item.id}
            className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-4 shadow-sm"
          >
            <div>
              <p className="text-sm font-semibold text-slate-900">{item.label}</p>
              <p className="mt-1 text-xs text-slate-500">
                {item.enabled ? "지출 작성 시 선택 가능" : "목록에서 숨김 처리"}
              </p>
            </div>
            <Toggle enabled={item.enabled} onToggle={() => handleToggleExpenseType(item.id)} />
          </div>
        ))}
      </div>
    </section>
  );

  const renderAccountsTab = () => (
    <section className="rounded-[1.75rem] border border-slate-200/90 bg-white p-5 shadow-sm">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-slate-950">계좌 관리</h3>
        <p className="mt-1 text-sm text-slate-500">
          자금 현황과 월말 정산에 반영되는 계좌 정보와 사용 여부를 관리합니다.
        </p>
      </div>

      <DashboardTable columns={accountColumns}>
        {accounts.map((account) => (
          <tr key={account.id} className="border-b border-slate-100 last:border-b-0">
            <td className="px-4 py-4 font-medium text-slate-900">{account.accountName}</td>
            <td className="px-4 py-4 text-slate-700">{account.bankName}</td>
            <td className="px-4 py-4 font-mono text-sm text-slate-600">{account.accountNumber}</td>
            <td className="px-4 py-4 text-right font-medium text-slate-900">
              <AmountText value={account.currentBalance} />
            </td>
            <td className="px-4 py-4 text-center">
              <div className="flex justify-center">
                <Toggle
                  enabled={account.enabled}
                  onToggle={() => handleToggleAccount(account.id)}
                  enabledLabel="사용중"
                  disabledLabel="중지"
                />
              </div>
            </td>
          </tr>
        ))}
      </DashboardTable>
    </section>
  );

  const renderSettlementPolicyTab = () => (
    <section className="rounded-[1.75rem] border border-slate-200/90 bg-white p-5 shadow-sm">
      <div className="mb-5">
        <h3 className="text-lg font-semibold text-slate-950">정산 정책</h3>
        <p className="mt-1 text-sm text-slate-500">
          경비 승인과 월말 정산에 적용될 기본 정책을 mock form으로 설정합니다.
        </p>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <div>
          <label htmlFor="pre-approval-amount" className="text-sm font-semibold text-slate-900">
            사전 승인 필수 금액
          </label>
          <input
            id="pre-approval-amount"
            type="number"
            value={settlementPolicy.preApprovalRequiredAmount}
            onChange={(event) =>
              setSettlementPolicy((current) => ({
                ...current,
                preApprovalRequiredAmount: Number(event.target.value),
              }))
            }
            className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-[var(--primary)] focus:ring-4 focus:ring-[color:rgba(22,59,111,0.08)]"
          />
        </div>

        <div>
          <label htmlFor="proof-required" className="text-sm font-semibold text-slate-900">
            증빙 필수 여부
          </label>
          <select
            id="proof-required"
            value={settlementPolicy.proofRequired ? "필수" : "선택"}
            onChange={(event) =>
              setSettlementPolicy((current) => ({
                ...current,
                proofRequired: event.target.value === "필수",
              }))
            }
            className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-[var(--primary)] focus:ring-4 focus:ring-[color:rgba(22,59,111,0.08)]"
          >
            <option value="필수">필수</option>
            <option value="선택">선택</option>
          </select>
        </div>

        <div>
          <label htmlFor="closing-day" className="text-sm font-semibold text-slate-900">
            월말 마감일
          </label>
          <input
            id="closing-day"
            type="text"
            value={settlementPolicy.monthEndClosingDay}
            onChange={(event) =>
              setSettlementPolicy((current) => ({
                ...current,
                monthEndClosingDay: event.target.value,
              }))
            }
            className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-[var(--primary)] focus:ring-4 focus:ring-[color:rgba(22,59,111,0.08)]"
          />
        </div>

        <div>
          <label htmlFor="payout-day" className="text-sm font-semibold text-slate-900">
            정산 지급일
          </label>
          <input
            id="payout-day"
            type="text"
            value={settlementPolicy.settlementPayoutDay}
            onChange={(event) =>
              setSettlementPolicy((current) => ({
                ...current,
                settlementPayoutDay: event.target.value,
              }))
            }
            className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-[var(--primary)] focus:ring-4 focus:ring-[color:rgba(22,59,111,0.08)]"
          />
        </div>

        <div>
          <label htmlFor="missing-proof-policy" className="text-sm font-semibold text-slate-900">
            증빙 미첨부 시 처리 방식
          </label>
          <select
            id="missing-proof-policy"
            value={settlementPolicy.missingProofHandling}
            onChange={(event) =>
              setSettlementPolicy((current) => ({
                ...current,
                missingProofHandling: event.target.value as SettlementPolicySettings["missingProofHandling"],
              }))
            }
            className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-[var(--primary)] focus:ring-4 focus:ring-[color:rgba(22,59,111,0.08)]"
          >
            <option value="정산 보류">정산 보류</option>
            <option value="추가 소명 요청">추가 소명 요청</option>
            <option value="반려 처리">반려 처리</option>
          </select>
        </div>

        <div>
          <label htmlFor="exclude-corporate-card" className="text-sm font-semibold text-slate-900">
            법인카드 정산 제외 여부
          </label>
          <select
            id="exclude-corporate-card"
            value={settlementPolicy.excludeCorporateCardSettlement ? "제외" : "포함"}
            onChange={(event) =>
              setSettlementPolicy((current) => ({
                ...current,
                excludeCorporateCardSettlement: event.target.value === "제외",
              }))
            }
            className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-[var(--primary)] focus:ring-4 focus:ring-[color:rgba(22,59,111,0.08)]"
          >
            <option value="제외">제외</option>
            <option value="포함">포함</option>
          </select>
        </div>
      </div>
    </section>
  );

  return (
    <div className="space-y-8">
      <PageHeader
        title="설정"
        description="시스템 기본 설정과 관리 기준을 탭별로 확인하고 변경하는 UI입니다."
        roles={roleViews}
        activeRole="관리자 보기"
        eyebrow="시스템 설정"
        badgeText="운영 기준 관리"
      />

      <section className="rounded-[1.75rem] border border-slate-200/90 bg-[var(--card-secondary)] p-5 shadow-sm">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-950">설정 탭</h3>
            <p className="mt-1 text-sm text-slate-500">
              사용자, 프로젝트, 경비 유형, 계좌, 정산 정책을 탭 단위로 관리할 수 있습니다.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={[
                  "rounded-2xl px-4 py-2.5 text-sm font-semibold transition",
                  activeTab === tab.key
                    ? "bg-[var(--primary)] text-white shadow-sm"
                    : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900",
                ].join(" ")}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {activeTab === "users" ? renderUsersTab() : null}
      {activeTab === "projects" ? renderProjectsTab() : null}
      {activeTab === "expense-types" ? renderExpenseTypesTab() : null}
      {activeTab === "accounts" ? renderAccountsTab() : null}
      {activeTab === "settlement-policy" ? renderSettlementPolicyTab() : null}

      <section className="rounded-[1.75rem] border border-slate-200/90 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--primary-soft)] text-[var(--primary)]">
              {activeTab === "users" ? (
                <Users className="h-5 w-5" strokeWidth={1.8} />
              ) : activeTab === "projects" ? (
                <FolderKanban className="h-5 w-5" strokeWidth={1.8} />
              ) : activeTab === "accounts" ? (
                <WalletCards className="h-5 w-5" strokeWidth={1.8} />
              ) : activeTab === "settlement-policy" ? (
                <ShieldCheck className="h-5 w-5" strokeWidth={1.8} />
              ) : (
                <Settings2 className="h-5 w-5" strokeWidth={1.8} />
              )}
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">변경사항 저장</p>
              <p className="mt-1 text-sm text-slate-500">
                이번 단계에서는 실제 저장 없이 현재 탭의 변경사항을 mock alert로만 처리합니다.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => window.alert("설정이 저장되었습니다.")}
            className="inline-flex items-center justify-center rounded-2xl bg-[var(--primary)] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:opacity-95"
          >
            변경사항 저장
          </button>
        </div>
      </section>
    </div>
  );
}
