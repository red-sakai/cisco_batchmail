"use client";

import { normalizeNameKey } from "@/lib/normalizeName";
import { useCallback, useMemo, useRef, useState } from "react";
import type { ParsedCsv, CsvMapping } from "./CsvUploader";

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
    <div className="rounded-lg border border-gray-200 p-4 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-medium">2) Upload Attachments (optional)</h2>
          <p className="text-xs opacity-80">File base name must match the CSV <strong>Name</strong> column (case-insensitive). Multiple files per name are allowed.</p>
        </div>
        <div className="flex items-center gap-2">
          <label className="px-3 py-1 rounded border border-gray-200 text-sm bg-white text-gray-900 hover:bg-gray-50 cursor-pointer">
            <input
              ref={inputRef}
              type="file"
              multiple
              accept="*/*"
              className="hidden"
              onChange={(e) => onUpload(e.target.files, e.target)}
            />
            {isUploading ? "Uploading…" : "Choose files…"}
          </label>
          <button type="button" onClick={clearAll} disabled={computed.files === 0} className="px-3 py-1 rounded border border-gray-200 text-sm bg-white hover:bg-gray-50 disabled:opacity-50">Clear</button>
        </div>
      </div>

      <div className="text-xs flex flex-wrap gap-3">
        <span className="opacity-70">Summary:</span>
  <span><strong>Total:</strong> {computed.files}</span>
  <span className="text-[#0071a4] dark:text-[#7dd3fc]"><strong>Matched:</strong> {computed.matched}</span>
  <span className="text-red-700"><strong>Unmatched:</strong> {computed.unmatched}</span>
      </div>

      {/* Matched pairs table */}
      {computed.matchedPairs.length > 0 && (
        <details className="text-xs" open>
          <summary className="cursor-pointer font-medium text-[#0071a4] dark:text-[#7dd3fc]">View matched attachments ({computed.matched} files)</summary>
          <div className="mt-2 overflow-x-auto border border-gray-200 rounded-lg max-h-48 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="px-3 py-2 text-left font-medium text-gray-700 border-b border-gray-200">Name</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-700 border-b border-gray-200">Attachments</th>
                </tr>
              </thead>
              <tbody>
                {computed.matchedPairs.map((pair, i) => (
                  <tr key={i} className="border-b border-gray-200 last:border-b-0">
                    <td className="px-3 py-2 text-gray-900 align-top whitespace-nowrap">
                      <span className="inline-flex items-center gap-1.5">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5 text-[#049fd9] dark:text-[#38bdf8] flex-shrink-0">
                          <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                        </svg>
                        {pair.name}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-gray-700">
                      <div className="flex flex-wrap gap-1">
                        {pair.files.map((file, j) => (
                          <span key={j} className="inline-flex items-center gap-1 rounded bg-gray-100 px-1.5 py-0.5 text-xs">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3 text-gray-400">
                              <path d="M3 3.5A1.5 1.5 0 014.5 2h6.879a1.5 1.5 0 011.06.44l4.122 4.12A1.5 1.5 0 0117 7.622V16.5a1.5 1.5 0 01-1.5 1.5h-11A1.5 1.5 0 013 16.5v-13z" />
                            </svg>
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
          <summary className="cursor-pointer font-medium text-red-700">View unmatched files ({computed.unmatched} files)</summary>
          <div className="mt-2 space-y-1 max-h-32 overflow-y-auto">
            {computed.unmatchedFiles.slice(0, 30).map((f, i) => (
              <div key={i} className="flex items-center gap-2 rounded border border-red-200 bg-red-50 px-2 py-1">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3 text-red-400 flex-shrink-0">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                </svg>
                <span className="text-red-700 truncate">{f}</span>
                <span className="text-red-500 text-[10px] ml-auto flex-shrink-0">No matching name in CSV</span>
              </div>
            ))}
            {computed.unmatchedFiles.length > 30 && (
              <p className="text-red-600 pl-5">…and {computed.unmatchedFiles.length - 30} more</p>
            )}
          </div>
        </details>
      )}

      {uploadError && (
        <div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2">
          {uploadError}
        </div>
      )}

      {largePdfDetected && (
        <div className="text-xs text-yellow-800 bg-yellow-50 border border-yellow-200 rounded px-3 py-2">
          Large 1-2 MB PDF attachments detected. Batch sending will be limited to 1 email per send to stay under attachment limits.
        </div>
      )}
    </div>
  );
}
