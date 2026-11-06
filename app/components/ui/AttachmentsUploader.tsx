"use client";

import { normalizeNameKey } from "@/lib/normalizeName";
import { useCallback, useMemo, useRef, useState } from "react";
import type { ParsedCsv, CsvMapping } from "./CsvUploader";
import Icon from "./Icon";

export type AttachmentEntry = {
  filename: string;
  contentBase64: string;
  contentType?: string;
  sizeBytes?: number;
};
export type AttachIndex = Record<string, AttachmentEntry[]>; // key: normalized name (lowercase, trimmed)

type Props = {
  csv: ParsedCsv | null;
  mapping: CsvMapping | null;
  value: AttachIndex;
  onChange: (next: AttachIndex) => void;
};

export default function AttachmentsUploader({ csv, mapping, value, onChange }: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileBaseName = useCallback((name: string) => {
    const idx = name.lastIndexOf('.');
    return idx > 0 ? name.slice(0, idx) : name;
  }, []);
  const fileToBase64 = useCallback(async (file: File) => {
    const arrayBuffer = await file.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    const chunkSize = 0x8000;
    let binary = "";
    for (let i = 0; i < bytes.length; i += chunkSize) {
      binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
    }
    return btoa(binary);
  }, []);

  const rowsNameSet = useMemo(() => {
    if (!csv || !mapping) return new Set<string>();
    const s = new Set<string>();
    (csv.rows as Array<Record<string, string>>).forEach((r) =>
      s.add(normalizeNameKey(String(r[mapping.name] || "")))
    );
    return s;
  }, [csv, mapping]);

  const computed = useMemo(() => {
    const files = Object.values(value).reduce((acc, arr) => acc + arr.length, 0);
    let matched = 0;
    const unmatched: string[] = [];
    const matchedPairs: Array<{ name: string; files: string[] }> = [];
    
    for (const [key, arr] of Object.entries(value)) {
      if (rowsNameSet.has(key)) {
        matched += arr.length;
        // Find the original name from CSV
        const originalName = csv?.rows.find(
          (r) => normalizeNameKey(String(r[mapping?.name || ""] || "")) === key
        )?.[mapping?.name || ""] || key;
        matchedPairs.push({ name: String(originalName), files: arr.map((a) => a.filename) });
      } else {
        unmatched.push(...arr.map((a) => a.filename));
      }
    }
    return { files, matched, unmatched: files - matched, unmatchedFiles: unmatched, matchedPairs };
  }, [value, rowsNameSet, csv, mapping]);

  const largePdfDetected = useMemo(() => {
    const min = 1024 * 1024;
    const max = 2 * 1024 * 1024;
    return Object.values(value).some((arr) =>
      Array.isArray(arr)
        ? arr.some((entry) => {
            if (!entry) return false;
            const size = entry.sizeBytes ?? 0;
            const filename = entry.filename?.toLowerCase() || "";
            const mime = (entry.contentType || "").toLowerCase();
            const isPdf = mime.includes("pdf") || filename.endsWith(".pdf");
            return Boolean(isPdf && size >= min && size <= max);
          })
        : false
    );
  }, [value]);

  const onUpload = async (files: FileList | null, source?: HTMLInputElement | null) => {
    if (!files || files.length === 0) return;
    setUploadError(null);
    setIsUploading(true);
    const next: AttachIndex = { ...value };
    const failed: string[] = [];
    try {
      for (const file of Array.from(files)) {
        try {
          const contentBase64 = await fileToBase64(file);
          const normalized = normalizeNameKey(fileBaseName(file.name));
          const entry: AttachmentEntry = {
            filename: file.name,
            contentBase64,
            contentType: file.type || undefined,
            sizeBytes: typeof file.size === "number" ? file.size : undefined,
          };
          next[normalized] = [...(next[normalized] || []), entry];
        } catch {
          failed.push(file.name || "(unknown)");
        }
      }

      if (failed.length) {
        setUploadError(`Failed: ${failed.slice(0, 6).join(", ")}${failed.length > 6 ? "…" : ""}`);
      }
      onChange(next);
    } finally {
      setIsUploading(false);
      if (source) source.value = "";
    }
  };

  const clearAll = () => {
    onChange({});
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div className="card p-4 sm:p-5 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Attachments (optional)</h2>
          <p className="text-sm text-muted">File base name must match the CSV <strong className="font-semibold text-foreground">Name</strong> column (case-insensitive). Multiple files per name are allowed.</p>
        </div>
        <div className="flex items-center gap-2">
          <label className="btn">
            <input
              ref={inputRef}
              type="file"
              multiple
              accept="*/*"
              className="sr-only"
              onChange={(e) => onUpload(e.target.files, e.target)}
            />
            <Icon name="paperclip" />
            {isUploading ? "Uploading…" : "Choose files…"}
          </label>
          <button type="button" onClick={clearAll} disabled={computed.files === 0} className="btn">Clear</button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 tabular-nums">
        <span className="chip">Total {computed.files}</span>
        <span className="chip chip-accent">Matched {computed.matched}</span>
        <span className={`chip ${computed.unmatched > 0 ? "chip-danger" : ""}`}>Unmatched {computed.unmatched}</span>
      </div>

      {/* Matched pairs table */}
      {computed.matchedPairs.length > 0 && (
        <details className="text-xs" open>
          <summary className="font-medium text-accent-ink">View matched attachments ({computed.matched} files)</summary>
          <div className="mt-2 overflow-x-auto border border-line rounded-lg max-h-48 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface-2 sticky top-0">
                <tr>
                  <th className="px-3 py-2 text-left font-medium text-muted border-b border-line">Name</th>
                  <th className="px-3 py-2 text-left font-medium text-muted border-b border-line">Attachments</th>
                </tr>
              </thead>
              <tbody>
                {computed.matchedPairs.map((pair, i) => (
                  <tr key={i} className="border-b border-line last:border-b-0">
                    <td className="px-3 py-2 align-top whitespace-nowrap">
                      <span className="inline-flex items-center gap-1.5">
                        <Icon name="check" className="w-3.5 h-3.5 text-accent-ink" />
                        {pair.name}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-muted">
                      <div className="flex flex-wrap gap-1">
                        {pair.files.map((file, j) => (
                          <span key={j} className="inline-flex items-center gap-1 rounded bg-surface-3 px-1.5 py-0.5 text-xs">
                            <Icon name="file" className="w-3 h-3 text-subtle" />
                            {file}
                          </span>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      )}

      {computed.unmatchedFiles.length > 0 && (
        <details className="text-xs">
          <summary className="font-medium text-danger">View unmatched files ({computed.unmatched} files)</summary>
          <div className="mt-2 space-y-1 max-h-32 overflow-y-auto">
            {computed.unmatchedFiles.slice(0, 30).map((f, i) => (
              <div key={i} className="notice notice-danger flex items-center gap-2 !py-1">
                <Icon name="alert" className="w-3 h-3" />
                <span className="truncate">{f}</span>
                <span className="text-[10px] ml-auto flex-shrink-0">No matching name in CSV</span>
              </div>
            ))}
            {computed.unmatchedFiles.length > 30 && (
              <p className="text-danger pl-5">…and {computed.unmatchedFiles.length - 30} more</p>
            )}
          </div>
        </details>
      )}

      {uploadError && (
        <div role="alert" className="notice notice-danger">
          {uploadError}
        </div>
      )}

      {largePdfDetected && (
        <div className="notice notice-warn">
          Large 1-2 MB PDF attachments detected. Batch sending will be limited to 1 email per send to stay under attachment limits.
        </div>
      )}
    </div>
  );
}
