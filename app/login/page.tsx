"use client";

import type { FormEvent } from "react";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { LockKeyhole, LogIn, Mail } from "lucide-react";

import { useAuth } from "@/components/auth/AuthProvider";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { resolveAuthorizedPath } from "@/utils/auth";

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { error, isAuthenticated, isLoading, profile, signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const redirectTo = useMemo(
    () => searchParams.get("redirect"),
    [searchParams],
  );

  useEffect(() => {
    if (isLoading || !isAuthenticated || !profile) {
      return;
    }

    router.replace(resolveAuthorizedPath(profile.role, redirectTo));
  }, [isAuthenticated, isLoading, profile, redirectTo, router]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitError(null);

    if (email.trim().length === 0 || password.trim().length === 0) {
      setSubmitError("이메일과 비밀번호를 모두 입력해주세요.");
      return;
    }

    setIsSubmitting(true);
    const signInError = await signIn(email.trim(), password);

    if (signInError) {
      setSubmitError(signInError);
      setIsSubmitting(false);
      return;
    }

    setIsSubmitting(false);
  }

  return (
    <main className="min-h-screen bg-slate-100 px-5 py-10">
      <div className="mx-auto grid min-h-[calc(100vh-5rem)] w-full max-w-6xl gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(420px,0.95fr)]">
        <section className="rounded-[2rem] bg-[var(--primary)] p-8 text-white shadow-sm lg:p-10">
          <span className="inline-flex rounded-full bg-white/12 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-white/80">
            Finance ERP
          </span>
          <h1 className="mt-6 text-4xl font-semibold tracking-tight">ERUTY 자금관리 시스템</h1>
          <p className="mt-4 max-w-xl text-sm leading-7 text-slate-100/85">
            Supabase Auth 로그인 후 지출 기안, 승인, 정산, 회계 자료, 자금과 프로젝트 예산까지
            실제 데이터 기준으로 이어서 작업할 수 있습니다.
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {[
              "직원은 본인 경비 요청과 정산 상태를 확인합니다.",
              "관리자는 승인, 자금, 회계, 예산 화면에 접근할 수 있습니다.",
              "profiles.id는 auth.users.id와 동일해야 합니다.",
              "회원가입은 만들지 않고 관리자 사전 생성 계정을 사용합니다.",
            ].map((item) => (
              <div key={item} className="rounded-[1.5rem] border border-white/10 bg-white/10 px-4 py-4 text-sm leading-6 text-white/85">
                {item}
              </div>
            ))}
          </div>
        </section>

        <section className="flex items-center">
          <div className="w-full rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm lg:p-10">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
                로그인
              </p>
              <h2 className="mt-3 text-3xl font-semibold text-slate-950">계정으로 시작하기</h2>
              <p className="mt-3 text-sm leading-6 text-slate-500">
                Supabase Auth에 미리 생성된 이메일과 비밀번호로 로그인해주세요.
              </p>
            </div>

            {!isSupabaseConfigured ? (
              <section className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-4 text-sm leading-6 text-rose-700">
                <p className="font-semibold">Supabase 연결 정보가 없습니다.</p>
                <p className="mt-2">
                  `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`를 확인해주세요.
                </p>
              </section>
            ) : null}

            {submitError || error ? (
              <section className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-4 text-sm leading-6 text-rose-700">
                <p className="font-semibold">로그인에 실패했습니다.</p>
                <p className="mt-2 whitespace-pre-wrap break-words">{submitError ?? error}</p>
              </section>
            ) : null}

            <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
              <div>
                <label htmlFor="login-email" className="text-sm font-semibold text-slate-900">
                  이메일
                </label>
                <div className="relative mt-2">
                  <Mail className="pointer-events-none absolute left-4 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-slate-400" strokeWidth={1.8} />
                  <input
                    id="login-email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="name@company.com"
                    className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-[var(--primary)] focus:ring-4 focus:ring-[color:rgba(22,59,111,0.08)]"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="login-password" className="text-sm font-semibold text-slate-900">
                  비밀번호
                </label>
                <div className="relative mt-2">
                  <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-slate-400" strokeWidth={1.8} />
                  <input
                    id="login-password"
                    type="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="비밀번호를 입력하세요"
                    className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-[var(--primary)] focus:ring-4 focus:ring-[color:rgba(22,59,111,0.08)]"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={!isSupabaseConfigured || isSubmitting || isLoading}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[var(--primary)] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[var(--primary-strong)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <LogIn className="h-4 w-4" strokeWidth={1.8} />
                {isSubmitting || isLoading ? "로그인 중..." : "로그인"}
              </button>
            </form>
          </div>
        </section>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-slate-100 px-5 py-10">
          <div className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-2xl items-center justify-center">
            <section className="w-full rounded-[2rem] border border-slate-200 bg-white p-8 text-center shadow-sm">
              <h1 className="text-2xl font-semibold text-slate-950">로그인 화면을 준비하고 있습니다.</h1>
              <p className="mt-3 text-sm leading-6 text-slate-500">
                인증 상태와 이동 경로 정보를 불러오는 중입니다.
              </p>
            </section>
          </div>
        </main>
      }
    >
      <LoginPageContent />
    </Suspense>
  );
}
