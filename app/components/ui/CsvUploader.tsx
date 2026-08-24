"use client";

import Papa from "papaparse";
import { useRef, useState, useCallback } from "react";

export type ParsedCsv = {
  headers: string[];
  rows: Array<Record<string, string>>;
  rowCount: number;
};

export type CsvMapping = {
  recipient: string; // column key for email address
  name: string; // column key for recipient name
  subject?: string | null; // optional column key for subject
};

type Props = {
  onParsed: (result: { csv: ParsedCsv; mapping: CsvMapping }) => void;
  currentMapping?: CsvMapping;
};

const guessRecipient = (headers: string[]) =>
  headers.find((h) => /^(email|e-mail|recipient|to|address)$/i.test(h)) || headers[0] || "";

const guessName = (headers: string[]) =>
  headers.find((h) => /^(name|full[_\s-]?name|first[_\s-]?name)$/i.test(h)) || headers[0] || "";

const guessSubject = (headers: string[]) =>
  headers.find((h) => /^(subject|title|headline|topic)$/i.test(h)) || null;

const DEFAULT_HEADERS = ["email", "name"];

export default function CsvUploader({ onParsed, currentMapping }: Props) {
  const [csv, setCsv] = useState<ParsedCsv | null>(null);
  const [mapping, setMapping] = useState<CsvMapping | null>(currentMapping ?? null);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>("");
  const [dragActive, setDragActive] = useState<boolean>(false);
  const [showManualEntry, setShowManualEntry] = useState<boolean>(false);
  const [manualRow, setManualRow] = useState<Record<string, string>>({});
  const fileRef = useRef<HTMLInputElement | null>(null);

  const handleFile = useCallback((file: File) => {
    setError(null);
    setFileName(file.name);
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h: string) => h.trim(),
      complete: (results: Papa.ParseResult<Record<string, string>>) => {
        const rows = (results.data || []).filter(Boolean) as Array<Record<string, string>>;
        const headers = (results.meta.fields || []).map((h) => String(h));
        if (headers.length === 0) {
          setError("No headers found. Ensure the first row contains column names.");
          return;
        }
        const parsed: ParsedCsv = { headers, rows, rowCount: rows.length };
        setCsv(parsed);
        const nextMapping: CsvMapping = {
          recipient: mapping?.recipient || guessRecipient(headers),
          name: mapping?.name || guessName(headers),
          subject: mapping?.subject ?? guessSubject(headers),
        };
        setMapping(nextMapping);
        onParsed({ csv: parsed, mapping: nextMapping });
      },
      error: (err: unknown) => {
        const msg = (typeof err === "object" && err && "message" in err)
          ? String((err as { message?: string }).message || "Failed to parse CSV")
          : "Failed to parse CSV";
        setError(msg);
      },
    });
  }, [mapping, onParsed]);

  const onChangeSelect = (key: keyof CsvMapping, value: string) => {
    if (!csv) return;
    const next = { ...(mapping || { recipient: "", name: "", subject: null }), [key]: value || null } as CsvMapping;
    setMapping(next);
    onParsed({ csv, mapping: next });
  };

  const initializeManualEntry = () => {
    if (!csv) {
      // Create a new CSV structure with default headers
      const headers = DEFAULT_HEADERS;
      const parsed: ParsedCsv = { headers, rows: [], rowCount: 0 };
      setCsv(parsed);
      const nextMapping: CsvMapping = {
        recipient: "email",
        name: "name",
        subject: null,
      };
      setMapping(nextMapping);
      setManualRow({ email: "", name: "" });
    } else {
      // Use existing headers
      const newRow: Record<string, string> = {};
      csv.headers.forEach((h) => (newRow[h] = ""));
      setManualRow(newRow);
    }
    setShowManualEntry(true);
  };

  const addManualRow = () => {
    const headers = csv?.headers || DEFAULT_HEADERS;
    const currentMapping = mapping || { recipient: "email", name: "name", subject: null };
    
    // Validate that recipient (email) is filled
    const recipientKey = currentMapping.recipient || "email";
    if (!manualRow[recipientKey]?.trim()) {
      setError("Email/recipient field is required.");
      return;
    }

    const newRows = [...(csv?.rows || []), { ...manualRow }];
    const parsed: ParsedCsv = {
      headers,
      rows: newRows,
      rowCount: newRows.length,
    };
    setCsv(parsed);
    onParsed({ csv: parsed, mapping: currentMapping });
    
    // Reset manual row for next entry
    const newRow: Record<string, string> = {};
    headers.forEach((h) => (newRow[h] = ""));
    setManualRow(newRow);
    setError(null);
  };

  const cancelManualEntry = () => {
    setShowManualEntry(false);
    setManualRow({});
    setError(null);
  };

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type.includes("csv") || file.name.endsWith(".csv")) {
        handleFile(file);
      } else {
        setError("Only .csv files are supported.");
      }
    }
  }, [handleFile]);

  const onDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
    else if (e.type === "dragleave") setDragActive(false);
  }, []);

  return (
    <div className="rounded-lg border border-gray-200 p-4 space-y-4">
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">1) Upload CSV or Add Manually</h2>
            <p className="text-sm opacity-80">Provide a CSV with a header row, drag & drop, or add recipients manually.</p>
          </div>
          <div className="flex items-center gap-2">
            <input
              ref={fileRef}
              id="csv-file-input"
              type="file"
              accept=".csv,text/csv"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFile(file);
              }}
              className="sr-only"
            />
            <label
              htmlFor="csv-file-input"
              className="inline-flex items-center gap-2 rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium shadow-sm cursor-pointer hover:bg-gray-50 focus-within:ring-2 focus-within:ring-[#049fd9]"
            >
              <span className="inline-block">{fileName || "Choose CSV"}</span>
            </label>
            <button
              type="button"
              onClick={initializeManualEntry}
              className="rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium shadow-sm hover:bg-gray-50"
            >
              + Add Manually
            </button>
            {csv && (
              <button
                type="button"
                onClick={() => {
                  if (fileRef.current) fileRef.current.value = "";
                  setCsv(null);
                  setMapping(null);
                  setError(null);
                  setFileName("");
                  setShowManualEntry(false);
                  setManualRow({});
                }}
                className="rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium shadow-sm hover:bg-gray-50"
              >
                Reset
              </button>
            )}
          </div>
        </div>
        <div
          onDragEnter={onDrag}
          onDragOver={onDrag}
          onDragLeave={onDrag}
          onDrop={onDrop}
          className={`group relative rounded-md border border-dashed p-6 text-center transition-colors ${dragActive ? "border-[#049fd9] bg-[#ebf6fc] dark:bg-[#10263f]" : "border-gray-200"}`}
        >
          <p className="text-sm">{dragActive ? "Release to upload CSV" : "Drag & drop your recipient CSV here, or use the buttons above."}</p>
        </div>
      </div>

      {error && <div className="text-sm text-red-600">{error}</div>}

      {/* Manual Entry Table */}
      {showManualEntry && (
        <div className="space-y-3">
          <div className="overflow-x-auto border border-gray-200 rounded-lg">
            <table className="w-full text-sm">
              <tbody>
                {/* Existing rows */}
                {csv?.rows.map((row, rowIndex) => (
                  <tr key={rowIndex} className="border-b border-gray-200">
                    {(csv?.headers || DEFAULT_HEADERS).map((header) => (
                      <td key={header} className="px-3 py-2 text-gray-900 border-r border-gray-200 last:border-r-0">
                        {row[header] || ""}
                      </td>
                    ))}
                    <td className="px-3 py-2 text-right border-l border-gray-200">
                      <button
                        type="button"
                        onClick={() => {
                          const newRows = csv.rows.filter((_, i) => i !== rowIndex);
                          const parsed: ParsedCsv = {
                            headers: csv.headers,
                            rows: newRows,
                            rowCount: newRows.length,
                          };
                          setCsv(parsed);
                          if (mapping) onParsed({ csv: parsed, mapping });
                        }}
                        className="rounded border border-gray-200 bg-white px-2 py-1 text-xs font-medium hover:bg-gray-50"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
                {/* Input row for adding new entry */}
                <tr>
                  {(csv?.headers || DEFAULT_HEADERS).map((header) => (
                    <td key={header} className="px-3 py-2 border-r border-gray-200 last:border-r-0">
                      <input
                        type={header.toLowerCase().includes("email") ? "email" : "text"}
                        value={manualRow[header] || ""}
                        onChange={(e) => setManualRow((prev) => ({ ...prev, [header]: e.target.value }))}
                        placeholder={header.toLowerCase().includes("email") ? "email@example.com" : `Enter ${header}`}
                        className="w-full rounded border border-gray-200 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-[#049fd9]"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            addManualRow();
                          }
                        }}
                      />
                    </td>
                  ))}
                  <td className="px-3 py-2 border-l border-gray-200">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={cancelManualEntry}
                        className="rounded border border-gray-200 bg-white px-2 py-1 text-xs font-medium hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={addManualRow}
                        className="rounded border border-gray-200 bg-white px-2 py-1 text-xs font-medium hover:bg-gray-50"
                      >
                        + Row
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <div className="text-xs text-gray-500">
            {csv?.rowCount ? `${csv.rowCount} recipient${csv.rowCount !== 1 ? "s" : ""} added` : "No recipients yet"} — Press Enter or click <span className="font-mono">+ Row</span> to add
          </div>
        </div>
      )}

      {csv && (
        <div className="space-y-4">
          <h3 className="text-sm font-medium">Map Columns</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <label className="text-sm flex flex-col gap-1">
              <span className="text-xs font-medium opacity-80">Recipient column</span>
              <select
                className="w-full rounded-md border px-2 py-1.5 text-sm bg-white border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#049fd9]"
                value={mapping?.recipient || ""}
                onChange={(e) => onChangeSelect("recipient", e.target.value)}
              >
                {csv.headers.map((h) => (
                  <option value={h} key={h}>{h}</option>
                ))}
              </select>
            </label>
            <label className="text-sm flex flex-col gap-1">
              <span className="text-xs font-medium opacity-80">Name column</span>
              <select
                className="w-full rounded-md border px-2 py-1.5 text-sm bg-white border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#049fd9]"
                value={mapping?.name || ""}
                onChange={(e) => onChangeSelect("name", e.target.value)}
              >
                {csv.headers.map((h) => (
                  <option value={h} key={h}>{h}</option>
                ))}
              </select>
            </label>
            <label className="text-sm flex flex-col gap-1">
              <span className="text-xs font-medium opacity-80">Subject column (optional)</span>
              <select
                className="w-full rounded-md border px-2 py-1.5 text-sm bg-white border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#049fd9]"
                value={mapping?.subject || ""}
                onChange={(e) => onChangeSelect("subject", e.target.value)}
              >
                <option value="">— None —</option>
                {csv.headers.map((h) => (
                  <option value={h} key={h}>{h}</option>
                ))}
              </select>
            </label>
          </div>
          <div className="text-xs opacity-80">Rows parsed: {csv.rowCount}</div>
        </div>
      )}
    </div>
  );
}
