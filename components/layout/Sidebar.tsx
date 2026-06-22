"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import {
  ClipboardCheck,
  CreditCard,
  Files,
  FolderKanban,
  LayoutDashboard,
  NotebookPen,
  ReceiptText,
  Settings2,
  WalletCards,
} from "lucide-react";

type SidebarItem = {
  label: string;
  icon: LucideIcon;
  href?: string;
  matches: (pathname: string) => boolean;
};

const sidebarItems: SidebarItem[] = [
  {
    label: "대시보드",
    icon: LayoutDashboard,
    href: "/",
    matches: (pathname) => pathname === "/",
  },
  {
    label: "지출 기안 작성",
    icon: NotebookPen,
    href: "/expenses/request",
    matches: (pathname) => pathname.startsWith("/expenses/request"),
  },
  {
    label: "내 지출 내역",
    icon: ReceiptText,
    href: "/expenses/history",
    matches: (pathname) => pathname.startsWith("/expenses/history"),
  },
  {
    label: "승인 대기함",
    icon: ClipboardCheck,
    href: "/approvals/pending",
    matches: (pathname) => pathname.startsWith("/approvals/pending"),
  },
  {
    label: "자금 현황",
    icon: WalletCards,
    href: "/funds",
    matches: (pathname) => pathname.startsWith("/funds"),
  },
  {
    label: "프로젝트 예산",
    icon: FolderKanban,
    href: "/projects/budget",
    matches: (pathname) => pathname.startsWith("/projects/budget"),
  },
  {
    label: "월말 정산",
    icon: CreditCard,
    href: "/settlements/monthly",
    matches: (pathname) => pathname.startsWith("/settlements/monthly"),
  },
  {
    label: "회계 자료",
    icon: Files,
    href: "/accounting/materials",
    matches: (pathname) => pathname.startsWith("/accounting/materials"),
  },
  {
    label: "설정",
    icon: Settings2,
    href: "/settings",
    matches: (pathname) => pathname.startsWith("/settings"),
  },
];

function itemClassName(isActive: boolean) {
  return [
    "flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-medium transition",
    isActive
      ? "bg-[var(--primary)] text-white shadow-sm"
      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
  ].join(" ");
}

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-72 shrink-0 border-r border-slate-200/80 bg-white/85 px-5 py-6 backdrop-blur lg:flex lg:flex-col">
      <div className="rounded-3xl border border-slate-200 bg-[var(--primary)] p-5 text-white shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/14 text-lg font-semibold">
            ER
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.28em] text-white/70">
              Finance ERP
            </p>
            <h1 className="mt-1 text-lg font-semibold">ERUTY 자금관리 시스템</h1>
          </div>
        </div>

        <p className="mt-4 text-sm leading-6 text-slate-100/80">
          지출 기안, 승인, 정산 흐름을 한 화면에서 관리하는 사내 자금 운영 포털입니다.
        </p>
      </div>

      <nav className="mt-6 flex-1 space-y-1.5">
        {sidebarItems.map((item) => {
          const Icon = item.icon;
          const isActive = item.matches(pathname);

          if (item.href) {
            return (
              <Link
                key={item.label}
                href={item.href}
                className={itemClassName(isActive)}
                aria-current={isActive ? "page" : undefined}
              >
                <Icon className="h-5 w-5" strokeWidth={1.8} />
                <span>{item.label}</span>
              </Link>
            );
          }

          return (
            <button
              key={item.label}
              type="button"
              className={itemClassName(false)}
              aria-disabled="true"
            >
              <Icon className="h-5 w-5" strokeWidth={1.8} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="rounded-3xl border border-slate-200 bg-[var(--card-secondary)] p-4 shadow-sm">
        <p className="text-sm font-semibold text-slate-900">10단계 프로토타입</p>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          승인, 자금, 예산, 정산, 회계 자료에 이어 시스템 운영 설정 화면까지 모두 이어서 확인할 수 있습니다.
        </p>
      </div>
    </aside>
  );
}
