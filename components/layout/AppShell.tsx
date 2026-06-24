"use client";

import { useEffect } from "react";
import type { PropsWithChildren } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ArrowRight, LogIn, ShieldAlert } from "lucide-react";

import { useAuth } from "@/components/auth/AuthProvider";
import { Sidebar } from "@/components/layout/Sidebar";
import {
  canAccessPath,
  getDefaultAuthorizedPath,
  getPathAccessReason,
} from "@/utils/auth";

function FullPageMessage({
  title,
  description,
  actionLabel,
  onAction,
}: {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center px-5 py-10">
      <section className="w-full max-w-xl rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-950">{title}</h1>
        <p className="mt-3 text-sm leading-6 text-slate-500">{description}</p>
        {actionLabel && onAction ? (
          <button
            type="button"
            onClick={onAction}
            className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-[var(--primary)] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[var(--primary-strong)]"
          >
            <ArrowRight className="h-4 w-4" strokeWidth={1.8} />
            {actionLabel}
          </button>
        ) : null}
      </section>
    </main>
  );
}

export function AppShell({ children }: PropsWithChildren) {
  const pathname = usePathname();
  const router = useRouter();
  const { error, isAuthenticated, isLoading, profile, signOut } = useAuth();

  const isLoginPage = pathname === "/login";

  useEffect(() => {
    if (isLoginPage || isLoading) {
      return;
    }

    if (!isAuthenticated) {
      router.replace(`/login?redirect=${encodeURIComponent(pathname)}`);
    }
  }, [isAuthenticated, isLoading, isLoginPage, pathname, router]);

  if (isLoginPage) {
    return <>{children}</>;
  }

  if (isLoading) {
    return (
      <FullPageMessage
        title="로그인 상태를 확인하고 있습니다."
        description="Supabase Auth 세션과 사용자 프로필 정보를 불러오는 중입니다."
      />
    );
  }

  if (!isAuthenticated) {
    return (
      <FullPageMessage
        title="로그인 화면으로 이동하고 있습니다."
        description="서비스를 사용하려면 먼저 로그인해야 합니다."
      />
    );
  }

  if (!profile) {
    return (
      <FullPageMessage
        title="사용자 프로필을 찾을 수 없습니다."
        description={
          error ??
          "로그인된 계정과 연결된 profiles 정보가 없습니다. profiles.id가 auth.users.id와 같은지 확인해주세요."
        }
        actionLabel="다시 로그인"
        onAction={() => {
          void signOut();
          router.replace("/login");
        }}
      />
    );
  }

  if (!profile.isActive) {
    return (
      <FullPageMessage
        title="비활성화된 계정입니다."
        description="현재 계정은 사용이 중지되어 있습니다. 관리자에게 문의해주세요."
        actionLabel="로그아웃"
        onAction={() => {
          void signOut();
          router.replace("/login");
        }}
      />
    );
  }

  if (!canAccessPath(profile.role, pathname)) {
    return (
      <div className="min-h-screen">
        <div className="mx-auto flex min-h-screen max-w-[1920px]">
          <Sidebar />
          <main className="min-w-0 flex-1">
            <div className="min-h-screen px-5 py-5 sm:px-6 lg:px-8 lg:py-6 xl:px-10">
              <section className="rounded-[1.75rem] border border-amber-200 bg-amber-50 px-6 py-6 text-amber-800 shadow-sm">
                <div className="flex items-start gap-3">
                  <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0" strokeWidth={1.9} />
                  <div>
                    <p className="font-semibold">접근 권한이 없습니다.</p>
                    <p className="mt-2 text-sm leading-6">
                      {getPathAccessReason(pathname)}
                    </p>
                    <button
                      type="button"
                      onClick={() => router.replace(getDefaultAuthorizedPath(profile.role))}
                      className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-amber-800 shadow-sm transition hover:bg-amber-100"
                    >
                      <LogIn className="h-4 w-4" strokeWidth={1.8} />
                      접근 가능한 화면으로 이동
                    </button>
                  </div>
                </div>
              </section>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="mx-auto flex min-h-screen max-w-[1920px]">
        <Sidebar />
        <main className="min-w-0 flex-1">
          <div className="min-h-screen px-5 py-5 sm:px-6 lg:px-8 lg:py-6 xl:px-10">{children}</div>
        </main>
      </div>
    </div>
  );
}
