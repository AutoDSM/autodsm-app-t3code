import type { JSX } from "react";

interface DataRow {
  readonly id: string;
  readonly status: string;
  readonly email: string;
  readonly amount: string;
}

const DEFAULT_ROWS: readonly DataRow[] = [
  { id: "m5gr84i9", status: "Success", email: "ken99@yahoo.com", amount: "$316.00" },
  { id: "3u1reuv4", status: "Success", email: "abe45@gmail.com", amount: "$242.00" },
  { id: "derv1ws0", status: "Processing", email: "monserrat44@gmail.com", amount: "$837.00" },
  { id: "5kma53ae", status: "Failed", email: "carmella@hotmail.com", amount: "$721.00" },
];

export interface ShadcnDataTableProps {
  readonly rows?: readonly DataRow[];
}

export function ShadcnDataTable(props: ShadcnDataTableProps): JSX.Element {
  const rows = props.rows ?? DEFAULT_ROWS;
  return (
    <div className="w-full overflow-hidden rounded-md border border-[var(--border)]">
      <div className="flex items-center justify-between border-b border-[var(--border)] bg-[var(--background)] px-4 py-2">
        <input
          type="text"
          placeholder="Filter emails…"
          className="rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-1.5 text-sm text-[var(--foreground)] outline-none"
        />
        <button
          type="button"
          className="rounded-md border border-[var(--border)] px-3 py-1.5 text-sm text-[var(--foreground)]"
        >
          Columns
        </button>
      </div>
      <table className="w-full text-sm text-[var(--foreground)]">
        <thead className="bg-[var(--muted)]">
          <tr>
            <th className="px-4 py-2 text-left font-medium">
              <input type="checkbox" aria-label="Select all" />
            </th>
            <th className="px-4 py-2 text-left font-medium">Status</th>
            <th className="px-4 py-2 text-left font-medium">Email</th>
            <th className="px-4 py-2 text-right font-medium">Amount</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-t border-[var(--border)]">
              <td className="px-4 py-2">
                <input type="checkbox" aria-label={`Select ${row.id}`} />
              </td>
              <td className="px-4 py-2 capitalize">{row.status}</td>
              <td className="px-4 py-2">{row.email}</td>
              <td className="px-4 py-2 text-right font-medium">{row.amount}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="flex items-center justify-between border-t border-[var(--border)] px-4 py-2 text-sm text-[var(--foreground)] opacity-70">
        <span>0 of {rows.length} row(s) selected.</span>
        <div className="flex gap-2">
          <button
            type="button"
            className="rounded-md border border-[var(--border)] px-3 py-1 text-xs"
          >
            Previous
          </button>
          <button
            type="button"
            className="rounded-md border border-[var(--border)] px-3 py-1 text-xs"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
