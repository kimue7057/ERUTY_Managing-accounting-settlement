import { formatKrw } from "@/utils/format";

type AmountTextProps = {
  value: number;
  className?: string;
};

export function AmountText({ value, className = "" }: AmountTextProps) {
  return <span className={className}>{formatKrw(value)}</span>;
}
