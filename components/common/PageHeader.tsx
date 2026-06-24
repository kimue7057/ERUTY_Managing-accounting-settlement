"use client";

import { Bell, ChevronDown, ShieldCheck } from "lucide-react";

import { useAuth } from "@/components/auth/AuthProvider";
import type { RoleView } from "@/types";
import {
  getUserInitials,
  mapAuthRoleLabel,
  mapAuthRoleToView,
} from "@/utils/auth";

type PageHeaderProps = {
  title: string;
  description: string;
  roles: RoleView[];
  activeRole: RoleView;
  eyebrow?: string;
  badgeText?: string;
};

export function PageHeader({
  title,
  description,
  roles,
  activeRole,
  eyebrow = "관리자 포털",
  badgeText,
}: PageHeaderProps) {
  const { profile } = useAuth();
  const profileRoleView = profile ? mapAuthRoleToView(profile.role) : null;
  const resolvedActiveRole =
    profileRoleView && roles.includes(profileRoleView) ? profileRoleView : activeRole;
  const profileMeta = [profile?.department, profile?.position || (profile ? mapAuthRoleLabel(profile.role) : "")]
    .filter((value) => value && value.trim().length > 0)
    .join(" · ");

  return (
    <header className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
      <div>
        <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-500 shadow-sm">
          {eyebrow}
        </span>
        <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">{title}</h2>
        <p className="mt-2 text-sm text-slate-500">{description}</p>
      </div>

      <div className="flex flex-col gap-3 xl:items-end">
        {badgeText ? (
          <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700 shadow-sm">
            {badgeText}
          </span>
        ) : null}

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex items-center gap-1 rounded-2xl border border-slate-200 bg-white p-1 shadow-sm">
            <span className="flex items-center gap-2 px-3 text-sm font-medium text-slate-500">
              <ShieldCheck className="h-4 w-4 text-[var(--primary)]" strokeWidth={1.9} />
              권한 보기
            </span>
            {roles.map((role) => (
              <button
                key={role}
                type="button"
                aria-pressed={role === resolvedActiveRole}
                className={[
                  "rounded-xl px-3 py-2 text-sm font-medium transition",
                  role === resolvedActiveRole
                    ? "bg-[var(--primary)] text-white shadow-sm"
                    : "text-slate-500 hover:bg-slate-100 hover:text-slate-900",
                ].join(" ")}
              >
                {role}
              </button>
            ))}
          </div>

          <button
            type="button"
            className="relative inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:text-slate-900"
            aria-label="알림"
          >
            <Bell className="h-5 w-5" strokeWidth={1.9} />
            <span className="absolute right-3 top-3 h-2.5 w-2.5 rounded-full bg-rose-500" />
          </button>

          <button
            type="button"
            className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-left shadow-sm transition hover:border-slate-300"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--primary-soft)] text-sm font-semibold text-[var(--primary)]">
              {getUserInitials(profile?.name)}
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">
                {profile?.name ?? "로그인 사용자"}
              </p>
              <p className="text-xs text-slate-500">
                {profileMeta || "사용자 정보 불러오는 중"}
              </p>
            </div>
            <ChevronDown className="h-4 w-4 text-slate-400" strokeWidth={1.9} />
          </button>
        </div>
      </div>
    </header>
  );
}
