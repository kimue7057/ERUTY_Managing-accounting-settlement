type ProgressTone = "primary" | "warning" | "danger" | "success" | "risk";

type ProgressBarProps = {
  label: string;
  value: number;
  max?: number;
  rightText?: string;
  description?: string;
  tone?: ProgressTone;
};

const toneClassMap: Record<ProgressTone, string> = {
  primary: "bg-[var(--primary)]",
  warning: "bg-amber-500",
  danger: "bg-rose-500",
  success: "bg-emerald-500",
  risk: "bg-orange-500",
};

export function ProgressBar({
  label,
  value,
  max = 100,
  rightText,
  description,
  tone = "primary",
}: ProgressBarProps) {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

  return (
    <div className="space-y-2.5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-slate-900">{label}</p>
          {description ? <p className="mt-1 text-xs text-slate-500">{description}</p> : null}
        </div>
        {rightText ? (
          <span className="shrink-0 text-sm font-semibold text-slate-700">{rightText}</span>
        ) : null}
      </div>

      <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
        <div
          className={["h-full rounded-full transition-[width]", toneClassMap[tone]].join(" ")}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
