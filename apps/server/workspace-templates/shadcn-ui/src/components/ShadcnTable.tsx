import type { JSX } from "react";

interface TableRow {
  readonly invoice: string;
  readonly status: string;
  readonly method: string;
  readonly amount: string;
}

const DEFAULT_ROWS: readonly TableRow[] = [
  { invoice: "INV001", status: "Paid", method: "Credit Card", amount: "$250.00" },
  { invoice: "INV002", status: "Pending", method: "PayPal", amount: "$150.00" },
  { invoice: "INV003", status: "Unpaid", method: "Bank Transfer", amount: "$350.00" },
  { invoice: "INV004", status: "Paid", method: "Credit Card", amount: "$450.00" },
];

export interface ShadcnTableProps {
  readonly rows?: readonly TableRow[];
  readonly striped?: boolean;
  readonly caption?: string;
}

export function ShadcnTable(props: ShadcnTableProps): JSX.Element {
  const {
    rows = DEFAULT_ROWS,
    striped = false,
    caption = "A list of your recent invoices.",
  } = props;
  return (
    <div className="w-full overflow-hidden rounded-md border border-[var(--border)]">
      <table className="w-full text-sm text-[var(--foreground)]">
        <caption className="border-b border-[var(--border)] px-4 py-2 text-left text-xs opacity-60">
          {caption}
        </caption>
        <thead className="bg-[var(--muted)]">
          <tr>
            <th className="px-4 py-2 text-left font-medium">Invoice</th>
            <th className="px-4 py-2 text-left font-medium">Status</th>
            <th className="px-4 py-2 text-left font-medium">Method</th>
            <th className="px-4 py-2 text-right font-medium">Amount</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={row.invoice}
              className={`border-t border-[var(--border)] ${
                striped && i % 2 === 1 ? "bg-[var(--muted)]" : ""
              }`}
            >
              <td className="px-4 py-2 font-medium">{row.invoice}</td>
              <td className="px-4 py-2">{row.status}</td>
              <td className="px-4 py-2">{row.method}</td>
              <td className="px-4 py-2 text-right">{row.amount}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export const ShadcnTableStriped = (props: Omit<ShadcnTableProps, "striped">): JSX.Element => (
  <ShadcnTable {...props} striped />
);
