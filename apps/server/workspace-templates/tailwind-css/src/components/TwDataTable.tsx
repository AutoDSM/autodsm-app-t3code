import type { JSX } from "react";

interface Row {
  readonly id: string;
  readonly name: string;
  readonly status: "Active" | "Paused" | "Failed" | "Pending";
  readonly amount: string;
}

const ROWS: ReadonlyArray<Row> = [
  { id: "INV-001", name: "Aurora export", status: "Active", amount: "$250.00" },
  { id: "INV-002", name: "Token sync", status: "Pending", amount: "$150.00" },
  { id: "INV-003", name: "Theme audit", status: "Failed", amount: "$350.00" },
  { id: "INV-004", name: "Brand kit", status: "Active", amount: "$450.00" },
];

const STATUS_TONE: Record<Row["status"], string> = {
  Active: "bg-green-100 text-green-800",
  Paused: "bg-slate-100 text-slate-800",
  Failed: "bg-red-100 text-red-800",
  Pending: "bg-amber-100 text-amber-800",
};

export interface TwDataTableProps {
  readonly rows?: ReadonlyArray<Row>;
}

export function TwDataTable(props: TwDataTableProps = {}): JSX.Element {
  const { rows = ROWS } = props;
  return (
    <div className="w-full max-w-2xl overflow-hidden rounded-lg border border-[var(--border)]">
      <table className="w-full text-sm text-[var(--foreground)]">
        <thead className="bg-[var(--muted)] text-left text-xs uppercase tracking-wide opacity-80">
          <tr>
            <th className="px-4 py-2 font-medium">Invoice</th>
            <th className="px-4 py-2 font-medium">Name</th>
            <th className="px-4 py-2 font-medium">Status</th>
            <th className="px-4 py-2 text-right font-medium">Amount</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--border)]">
          {rows.map((row) => (
            <tr key={row.id}>
              <td className="px-4 py-2 font-medium">{row.id}</td>
              <td className="px-4 py-2">{row.name}</td>
              <td className="px-4 py-2">
                <span
                  className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_TONE[row.status]}`}
                >
                  {row.status}
                </span>
              </td>
              <td className="px-4 py-2 text-right tabular-nums">{row.amount}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
