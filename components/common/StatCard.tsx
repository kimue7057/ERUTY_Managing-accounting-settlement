import type { ReactNode } from "react";

type StatCardProps = {
  title: string;
  description: string;
  value: ReactNode;
  icon: ReactNode;
};

export function StatCard({ title, description, value, icon }: StatCardProps) {
  return (
    <article className="rounded-[1.75rem] border border-slate-200/90 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <div className="text-[1.65rem] font-semibold tracking-tight text-slate-950">{value}</div>
        </div>

        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[var(--primary-soft)] text-[var(--primary)]">
          {icon}
        </div>
      </div>

      <p className="mt-4 text-sm leading-6 text-slate-500">{description}</p>
    </article>
  );
}
