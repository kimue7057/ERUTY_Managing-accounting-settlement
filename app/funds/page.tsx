"use client";

import {
  BadgeCheck,
  Building2,
  CreditCard,
  Landmark,
  WalletCards,
} from "lucide-react";

import { EmptyState } from "@/components/common/EmptyState";
import { PageHeader } from "@/components/common/PageHeader";
import { StatCard } from "@/components/common/StatCard";
import { roleViews } from "@/data/uiOptions";
import { isSupabaseConfigured } from "@/lib/supabase/client";

function PlaceholderValue() {
  return <span className="text-xl font-semibold text-slate-400">연결 전</span>;
}

export default function FundsPage() {
  const summaryCards = [
    {
      id: "total-balance",
      title: "전체 계좌 잔액",
      description: "계좌 잔액 테이블이 아직 연결되지 않았습니다.",
      icon: <WalletCards className="h-5 w-5" strokeWidth={1.8} />,
    },
    {
      id: "approved-unpaid",
      title: "승인 후 미지급 금액",
      description: "출납 확정 테이블 연결 후 실제 값으로 표시됩니다.",
      icon: <BadgeCheck className="h-5 w-5" strokeWidth={1.8} />,
    },
    {
      id: "settlement-due",
      title: "직원 정산 예정액",
      description: "정산 집계 데이터와 연결되면 자동 계산됩니다.",
      icon: <CreditCard className="h-5 w-5" strokeWidth={1.8} />,
    },
    {
      id: "fixed-cost",
      title: "고정비 예정액",
      description: "고정비 테이블이 아직 연결되지 않았습니다.",
      icon: <Building2 className="h-5 w-5" strokeWidth={1.8} />,
    },
    {
      id: "available-cash",
      title: "실질 가용 자금",
      description: "계좌 및 예정 출금 테이블 연결 후 계산됩니다.",
      icon: <Landmark className="h-5 w-5" strokeWidth={1.8} />,
    },
  ];

  return (
    <div className="space-y-8">
      <PageHeader
        title="회사 자금 현황"
        description="회사 전체 자금 상태를 확인하는 화면입니다. 실제 계좌 테이블 연결 전까지는 빈 상태로 표시합니다."
        roles={roleViews}
        activeRole="대표 보기"
        eyebrow="자금 모니터링"
        badgeText="계좌 테이블 연결 전"
      />

      {!isSupabaseConfigured ? (
        <section className="rounded-[1.75rem] border border-rose-200 bg-rose-50 px-5 py-4 text-sm leading-6 text-rose-700 shadow-sm">
          <p className="font-semibold">Supabase 연결 정보가 설정되지 않았습니다.</p>
          <p className="mt-2">
            환경변수가 없으면 이후 자금 현황 테이블을 연결하더라도 데이터를 조회할 수 없습니다.
          </p>
        </section>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {summaryCards.map((summary) => (
          <StatCard
            key={summary.id}
            title={summary.title}
            description={summary.description}
            value={<PlaceholderValue />}
            icon={summary.icon}
          />
        ))}
      </section>

      <section className="rounded-[1.75rem] border border-slate-200/90 bg-[var(--card-secondary)] p-5 shadow-sm">
        <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-4 text-sm leading-6 text-slate-600 shadow-sm">
          <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[var(--primary-soft)] text-[var(--primary)]">
            <Landmark className="h-5 w-5" strokeWidth={1.8} />
          </div>
          <div>
            <p className="font-semibold text-slate-900">실제 자금 테이블 연결 전 안내</p>
            <p className="mt-1">
              현재 화면은 mock 데이터를 사용하지 않습니다. 계좌별 잔액, 입출금 내역, 자금 조정 내역을
              담는 Supabase 테이블이 준비되면 실제 데이터만 표시하도록 연결할 수 있습니다.
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-[1.75rem] border border-slate-200/90 bg-white p-5 shadow-sm">
        <div>
          <h3 className="text-lg font-semibold text-slate-950">계좌별 자금 현황</h3>
          <p className="mt-1 text-sm text-slate-500">
            운영자금 계좌, 사업비 계좌, 법인카드 결제 계좌 등은 관련 테이블 연결 후 표시됩니다.
          </p>
        </div>

        <EmptyState
          title="표시할 계좌 데이터가 없습니다."
          description="현재 프로젝트에는 실제 자금 계좌 테이블이 아직 연결되지 않았습니다."
        />
      </section>

      <section className="rounded-[1.75rem] border border-slate-200/90 bg-white p-5 shadow-sm">
        <div>
          <h3 className="text-lg font-semibold text-slate-950">자금 출납 내역</h3>
          <p className="mt-1 text-sm text-slate-500">
            입금, 출금, 이체, 조정 이력은 출납 테이블 연결 후 실제 데이터만 조회합니다.
          </p>
        </div>

        <EmptyState
          title="표시할 출납 내역이 없습니다."
          description="mock fallback 없이 빈 상태로 유지하고 있습니다. 자금 거래 테이블 연결 후 다시 표시됩니다."
        />
      </section>
    </div>
  );
}
