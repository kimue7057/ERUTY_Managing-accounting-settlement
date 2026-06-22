import type { ReactNode } from "react";

type TableColumn = {
  key: string;
  label: string;
  align?: "left" | "center" | "right";
};

type DashboardTableProps = {
  columns: TableColumn[];
  children: ReactNode;
};

const alignClassMap: Record<NonNullable<TableColumn["align"]>, string> = {
  left: "text-left",
  center: "text-center",
  right: "text-right",
};

export function DashboardTable({ columns, children }: DashboardTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200">
            {columns.map((column) => (
              <th
                key={column.key}
                className={[
                  "px-4 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400",
                  alignClassMap[column.align ?? "left"],
                ].join(" ")}
              >
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}
