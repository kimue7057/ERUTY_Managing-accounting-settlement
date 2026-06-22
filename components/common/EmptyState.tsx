import { Inbox } from "lucide-react";

type EmptyStateProps = {
  title: string;
  description: string;
  className?: string;
};

export function EmptyState({
  title,
  description,
  className = "",
}: EmptyStateProps) {
  return (
    <div
      className={[
        "mt-6 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center",
        className,
      ].join(" ")}
    >
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-slate-400 shadow-sm">
        <Inbox className="h-5 w-5" strokeWidth={1.8} />
      </div>
      <p className="mt-4 text-sm font-medium text-slate-700">{title}</p>
      <p className="mt-2 text-sm text-slate-500">{description}</p>
    </div>
  );
}
