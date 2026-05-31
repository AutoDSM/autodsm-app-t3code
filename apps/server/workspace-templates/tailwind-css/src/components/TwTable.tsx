import type { JSX } from "react";

interface Row {
  readonly invoice: string;
  readonly status: string;
  readonly method: string;
  readonly amount: string;
}

const ROWS: ReadonlyArray<Row> = [
  { invoice: "INV001", status: "Paid", method: "Credit Card", amount: "$250.00" },
  { invoice: "INV002", status: "Pending", method: "PayPal", amount: "$150.00" },
  { invoice: "INV003", status: "Unpaid", method: "Bank Transfer", amount: "$350.00" },
  { invoice: "INV004", status: "Paid", method: "Credit Card", amount: "$450.00" },
];

export interface TwTableProps {
  readonly rows?: ReadonlyArray<Row>;
  readonly caption?: string;
}

export function TwTable(props: TwTableProps = {}): JSX.Element {
  const { rows = ROWS, caption = "A list of your recent invoices." } = props;
  return (
    <table className="w-full max-w-xl text-sm text-[var(--foreground)]">
      <caption className="mb-2 caption-bottom text-xs opacity-60">{caption}</caption>
      <thead className="border-b border-[var(--border)] text-left">
        <tr>
          <th className="py-2 pr-4 font-medium">Invoice</th>
          <th className="py-2 pr-4 font-medium">Status</th>
          <th className="py-2 pr-4 font-medium">Method</th>
          <th className="py-2 text-right font-medium">Amount</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.invoice} className="border-b border-[var(--border)] last:border-0">
            <td className="py-2 pr-4 font-medium">{row.invoice}</td>
            <td className="py-2 pr-4">{row.status}</td>
            <td className="py-2 pr-4">{row.method}</td>
            <td className="py-2 text-right tabular-nums">{row.amount}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function TwTableStriped(_props: TwTableProps = {}): JSX.Element {
  return (
    <table className="w-full max-w-xl overflow-hidden rounded-md text-sm text-[var(--foreground)]">
      <thead className="bg-[var(--muted)] text-left">
        <tr>
          <th className="px-3 py-2 font-medium">Invoice</th>
          <th className="px-3 py-2 font-medium">Status</th>
          <th className="px-3 py-2 font-medium">Method</th>
          <th className="px-3 py-2 text-right font-medium">Amount</th>
        </tr>
      </thead>
      <tbody>
        {ROWS.map((row, idx) => (
          <tr key={row.invoice} className={idx % 2 === 1 ? "bg-[var(--muted)]/40" : ""}>
            <td className="px-3 py-2 font-medium">{row.invoice}</td>
            <td className="px-3 py-2">{row.status}</td>
            <td className="px-3 py-2">{row.method}</td>
            <td className="px-3 py-2 text-right tabular-nums">{row.amount}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
