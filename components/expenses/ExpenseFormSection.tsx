import type { ReactNode } from "react";

type ExpenseFormSectionProps = {
  title: string;
  description: string;
  badge?: ReactNode;
  children: ReactNode;
};

export function ExpenseFormSection({
  title,
  description,
  badge,
  children,
}: ExpenseFormSectionProps) {
  return (
    <section className="rounded-[1.75rem] border border-slate-200/90 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-3 border-b border-slate-100 pb-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-950">{title}</h3>
          <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p>
        </div>
        {badge ? <div className="shrink-0">{badge}</div> : null}
      </div>

      <div className="mt-5">{children}</div>
    </section>
  );
}
