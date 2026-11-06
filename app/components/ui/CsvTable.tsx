"use client";

import { useMemo, useState } from "react";
import type { ParsedCsv, CsvMapping } from "./CsvUploader";
import { deriveColumnHref, isLinkColumn } from "@/lib/links";
import Icon from "./Icon";

type Props = {
  csv: ParsedCsv | null;
  mapping?: CsvMapping | null;
  onMappingChange?: (m: CsvMapping | null) => void;
  onChange?: (csv: ParsedCsv | null) => void;
};

export default function CsvTable({ csv, mapping, onMappingChange, onChange }: Props) {
  const [limit, setLimit] = useState<number>(100);
  const [q, setQ] = useState<string>("");
  const [editingCell, setEditingCell] = useState<{ row: number; header: string } | null>(null);
  const [newHeader, setNewHeader] = useState<string>("");
  const [showAddCol, setShowAddCol] = useState<boolean>(false);

  const rows = useMemo(() => {
    if (!csv) return [] as Array<Record<string, string>>;
    const all = csv.rows as Array<Record<string, string>>;
    if (!q) return all.slice(0, limit);
    const lower = q.toLowerCase();
    const filtered = all.filter((r) =>
      csv.headers.some((h) => String(r[h] ?? "").toLowerCase().includes(lower))
    );
    return filtered.slice(0, limit);
  }, [csv, q, limit]);

  const linkColumns = useMemo(() => {
    const set = new Set<string>();
    if (!csv) return set;
    const sample = (csv.rows as Array<Record<string, string>>).slice(0, 200);
    for (const h of csv.headers) {
      const values = sample.map((r) => String(r[h] ?? ""));
      if (isLinkColumn(h, values)) set.add(h);
    }
    return set;
  }, [csv]);

  if (!csv) {
    return (
      <div className="card border-dashed p-6 text-center text-sm text-muted">
        No recipients yet. Upload a CSV or add someone manually to review them here.
      </div>
    );
  }

  const commitCell = (rowIndex: number, header: string, value: string) => {
    const updatedRows = [...csv.rows];
    const target = { ...(updatedRows[rowIndex] as Record<string, string>) };
    target[header] = value;
    updatedRows[rowIndex] = target;
    const updatedCsv: ParsedCsv = { ...csv, rows: updatedRows };
    onChange?.(updatedCsv);
    setEditingCell(null);
  };

  const deleteColumn = (header: string) => {
    const newHeaders = csv.headers.filter((h) => h !== header);
    const newRows = csv.rows.map((r) => {
      const copy = { ...(r as Record<string, string>) };
      delete copy[header];
      return copy;
    });
    const updated: ParsedCsv = { ...csv, headers: newHeaders, rows: newRows };
    onChange?.(updated);
    // Clear mapping if affected
    if (mapping && (mapping.recipient === header || mapping.name === header || mapping.subject === header)) {
      onMappingChange?.({
        recipient: mapping.recipient === header ? "" : mapping.recipient,
        name: mapping.name === header ? "" : mapping.name,
        subject: mapping.subject === header ? null : mapping.subject,
      });
    }
  };

  const addColumn = () => {
    const headerName = newHeader.trim();
    if (!headerName || csv.headers.includes(headerName)) return;
    const newHeaders = [...csv.headers, headerName];
    const newRows = csv.rows.map((r) => ({ ...(r as Record<string, string>), [headerName]: "" }));
    const updated: ParsedCsv = { ...csv, headers: newHeaders, rows: newRows };
    onChange?.(updated);
    setNewHeader("");
    setShowAddCol(false);
  };

  const downloadCsv = () => {
    const headerLine = csv.headers.join(",");
    const lines = csv.rows.map((r) => csv.headers.map((h) => {
      const v = (r as Record<string, string>)[h] ?? "";
      const escaped = '"' + String(v).replace(/"/g, '""') + '"';
      return escaped;
    }).join(","));
    const content = [headerLine, ...lines].join("\n");
    const blob = new Blob([content], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "batchmail-modified.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="card p-4 sm:p-5 space-y-4">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
        <div className="font-medium tabular-nums">Rows: {csv.rowCount}</div>
        <label className="inline-flex items-center gap-2">
          <span className="text-muted">Search</span>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="input"
            placeholder="Filter..."
          />
        </label>
        <label className="inline-flex items-center gap-2">
          <span className="text-muted">Show</span>
          <select
            className="input"
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
          >
            {[50, 100, 200, 500].map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </label>
        <button
          type="button"
          onClick={downloadCsv}
          className="btn sm:ml-auto"
        >
          Download CSV
        </button>
      </div>

      {showAddCol && (
        <div className="notice flex flex-wrap items-center gap-3 !p-3 text-sm">
          <input
            value={newHeader}
            onChange={(e) => setNewHeader(e.target.value)}
            placeholder="New column name"
            className="input w-52"
          />
          <button
            type="button"
            onClick={addColumn}
            className="btn"
          >
            Add
          </button>
        </div>
      )}

      <div className="overflow-auto max-h-[60vh] border border-line rounded-lg">
        <table className="min-w-full text-sm">
          <thead className="sticky top-0 z-10 bg-surface-2">
            <tr>
              {csv.headers.map((h) => (
                <th key={h} className="px-3 py-2 border border-line text-left font-semibold bg-surface-2 min-w-[140px]">
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-1.5 min-w-0">
                      <span className="truncate" title={h}>{h}</span>
                      {linkColumns.has(h) && (
                        <span
                          title="Link column: values in this column are clickable links"
                          className="inline-flex flex-none items-center gap-1 rounded border border-accent-ink/40 bg-accent-soft px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-accent-ink"
                        >
                          <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="h-3 w-3"
                            aria-hidden="true"
                          >
                            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                          </svg>
                          link
                        </span>
                      )}
                    </span>
                    <button
                      type="button"
                      onClick={() => deleteColumn(h)}
                      className="btn btn-sm btn-icon btn-danger"
                      aria-label={`Delete column ${h}`}
                      title={`Delete column ${h}`}
                    >
                      <Icon name="x" />
                    </button>
                  </div>
                </th>
              ))}
              <th className="px-3 py-2 border border-line text-left font-semibold bg-surface-2">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAddCol((v) => !v)}
                    className="btn btn-sm"
                  >
                    {showAddCol ? "Cancel" : <><Icon name="plus" className="h-3 w-3" />Column</>}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const blank: Record<string, string> = {};
                      csv.headers.forEach((h) => (blank[h] = ""));
                      const updated: ParsedCsv = {
                        ...csv,
                        rows: [...csv.rows, blank],
                        rowCount: (csv.rowCount || 0) + 1,
                      };
                      onChange?.(updated);
                    }}
                    className="btn btn-sm"
                  >
                    <Icon name="plus" className="h-3 w-3" />
                    Row
                  </button>
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className="odd:bg-surface even:bg-surface-2 hover:bg-accent-soft transition-colors">
                {csv.headers.map((h) => {
                  const isEditing = editingCell && editingCell.row === i && editingCell.header === h;
                  const rawValue = String(row[h] ?? "");
                  const linkHref =
                    !isEditing && linkColumns.has(h)
                      ? deriveColumnHref(rawValue)
                      : null;
                  return (
                    <td
                      key={h}
                      title="Double-click to edit"
                      className="px-3 py-1.5 border border-line align-top max-w-[40ch] truncate cursor-pointer"
                      onDoubleClick={() => setEditingCell({ row: i, header: h })}
                    >
                      {isEditing ? (
                        <input
                          autoFocus
                          defaultValue={row[h]}
                          onBlur={(e) => commitCell(i, h, e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              commitCell(i, h, (e.target as HTMLInputElement).value);
                            } else if (e.key === "Escape") {
                              setEditingCell(null);
                            }
                          }}
                          className="input w-full !min-h-0 !py-1 text-xs"
                        />
                      ) : linkHref ? (
                        <a
                          href={linkHref}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="whitespace-pre-wrap break-words text-[13px] leading-snug text-accent-ink underline hover:text-foreground"
                        >
                          {rawValue}
                        </a>
                      ) : (
                        <span className="whitespace-pre-wrap break-words text-[13px] leading-snug">{row[h]}</span>
                      )}
                    </td>
                  );
                })}
                <td className="px-3 py-1.5 border border-line align-top">
                  <button
                    type="button"
                    onClick={() => {
                      const indexInAll = (csv.rows as Array<Record<string, string>>).indexOf(row);
                      const updatedRows = [...csv.rows];
                      if (indexInAll >= 0) {
                        updatedRows.splice(indexInAll, 1);
                      } else {
                        // fallback: remove by shallow equality on values
                        const key = JSON.stringify(row);
                        const idx = (csv.rows as Array<Record<string, string>>).findIndex(r => JSON.stringify(r) === key);
                        if (idx >= 0) updatedRows.splice(idx, 1);
                      }
                      const updated: ParsedCsv = { ...csv, rows: updatedRows, rowCount: Math.max((csv.rowCount || 1) - 1, 0) };
                      onChange?.(updated);
                    }}
                    className="btn btn-sm btn-danger"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
