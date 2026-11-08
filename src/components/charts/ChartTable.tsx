import { cx } from './cx';

/** A column of the accessible data table. */
export interface ChartTableColumn {
  key: string;
  label: string;
  /** Right-align in tabular figures. */
  numeric?: boolean;
}

/** Props for {@link ChartTable}. */
export interface ChartTableProps {
  /** Table caption, normally the chart's name. */
  caption: string;
  columns: ChartTableColumn[];
  /** Pre-formatted cell text keyed by column key. The first column is the row header. */
  rows: Array<Record<string, string>>;
  /** Render for assistive technology only (no visible output). */
  visuallyHidden?: boolean;
  id?: string;
  className?: string;
}

/**
 * The table-view twin of a chart — the WCAG-clean equivalent of every mark. Shown by the
 * chart's "Table" toggle, or rendered visually hidden when a chart has no toggle.
 */
export function ChartTable({
  caption,
  columns,
  rows,
  visuallyHidden = false,
  id,
  className,
}: ChartTableProps) {
  const [rowHeader, ...cells] = columns;
  return (
    <div id={id} className={cx(visuallyHidden ? 'sr-only' : 'w-full overflow-x-auto', className)}>
      <table className="w-full border-collapse text-left text-sm">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr className="border-b border-line">
            {columns.map((column) => (
              <th
                key={column.key}
                scope="col"
                className={cx(
                  'whitespace-nowrap px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500 first:pl-0 last:pr-0',
                  column.numeric && 'text-right',
                )}
              >
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr
              key={`${row[rowHeader?.key ?? ''] ?? ''}-${index}`}
              className="border-b border-line last:border-b-0"
            >
              {rowHeader && (
                <th scope="row" className="px-3 py-2 pl-0 font-normal text-slate-700">
                  {row[rowHeader.key]}
                </th>
              )}
              {cells.map((column) => (
                <td
                  key={column.key}
                  className={cx(
                    'whitespace-nowrap px-3 py-2 last:pr-0',
                    column.numeric ? 'text-right tabular-nums text-slate-900' : 'text-slate-700',
                  )}
                >
                  {row[column.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
