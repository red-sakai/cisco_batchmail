"use client";

import { normalizeNameKey } from "@/lib/normalizeName";
import { getEnvStatusAction } from "@/app/actions/env";
import { sendBatchAction } from "@/app/actions/send";
import Image from "next/image";
import nunjucks from "nunjucks";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { CsvMapping, ParsedCsv } from "./CsvUploader";
// email editing is performed in the Template tab
import type { AttachIndex } from "./AttachmentsUploader";
import VariablePicker from "./VariablePicker";

const SENDER_LABEL = "Cisco NetConnect PUP – Manila";

function StatCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string | number;
  sub?: string;
}) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white px-3 py-2.5">
      <div className="text-xl font-semibold text-gray-900 tabular-nums leading-tight">
        {value}
      </div>
      <div className="text-xs font-medium text-gray-700">{label}</div>
      {sub && <div className="text-[11px] text-gray-500">{sub}</div>}
    </div>
  );
}

function CheckChip({
  done,
  loading = false,
  label,
  pendingLabel,
}: {
  done: boolean;
  loading?: boolean;
  label: string;
  pendingLabel?: string;
}) {
  const pending = pendingLabel ?? label;
  return (
    <li
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 ${
        done
          ? "border-[#049fd9]/30 dark:border-[#38bdf8]/40 bg-[#ebf6fc] dark:bg-[#10263f] text-[#0071a4] dark:text-[#7dd3fc]"
          : loading
          ? "border-gray-200 bg-gray-50 text-gray-500"
          : "border-yellow-300 bg-yellow-50 text-yellow-800"
      }`}
    >
      {done ? (
        <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5" aria-hidden="true">
          <path
            fillRule="evenodd"
            d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
            clipRule="evenodd"
          />
        </svg>
      ) : (
        <svg viewBox="0 0 20 20" fill="currentColor" className={`h-3.5 w-3.5 ${loading ? "animate-pulse" : ""}`} aria-hidden="true">
          <path
            fillRule="evenodd"
            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z"
            clipRule="evenodd"
          />
        </svg>
      )}
      <span className="font-medium">{done ? label : pending}</span>
    </li>
  );
}

const PREVIEW_RESET_STYLE =
  "<style>html,body{margin:0!important;padding:0!important;background-color:transparent!important;}</style>";

const normalizePreviewHtml = (html: string) => {
  const trimmed = (html || "").trim();
  if (!trimmed) {
    return `<!DOCTYPE html><html><head>${PREVIEW_RESET_STYLE}</head><body></body></html>`;
  }
  if (/<head[\s>]/i.test(trimmed)) {
    return trimmed.replace(/<head([^>]*)>/i, (_, attrs = "") => `<head${attrs}>${PREVIEW_RESET_STYLE}`);
  }
  if (/<html[\s>]/i.test(trimmed)) {
    return trimmed.replace(
      /<html([^>]*)>/i,
      (_, attrs = "") => `<html${attrs}><head>${PREVIEW_RESET_STYLE}</head>`
    );
  }
  return `<!DOCTYPE html><html><head>${PREVIEW_RESET_STYLE}</head><body>${trimmed}</body></html>`;
};

type Props = {
  csv: ParsedCsv | null;
  mapping: CsvMapping | null;
  template: string;
  onExportJson: (render: (row: Record<string, string>) => string) => void;
  subjectTemplate?: string;
  onSubjectChange?: (next: string) => void;
  attachmentsByName?: AttachIndex;
};

export default function PreviewPane({
  csv,
  mapping,
  template,
  onExportJson,
  subjectTemplate = "",
  onSubjectChange,
  attachmentsByName,
}: Props) {
  const [showSendModal, setShowSendModal] = useState(false);
  const [sendModalLogs, setSendModalLogs] = useState<
    Array<{
      to: string;
      status: string;
      subject?: string;
      error?: string;
      messageId?: string;
      response?: string;
      accepted?: string[];
      rejected?: string[];
      attachments?: number;
      timestamp?: string;
    }>
  >([]);
  const [sendModalSummary, setSendModalSummary] = useState<{
    sent: number;
    failed: number;
  }>({ sent: 0, failed: 0 });
  const [sendModalTotal, setSendModalTotal] = useState<number | null>(null);
  const [currentBatchIndex, setCurrentBatchIndex] = useState<number>(0);
  const [batchAssignments, setBatchAssignments] = useState<
    Array<{ batch: number; recipients: string[] }>
  >([]);
  const [isSending, setIsSending] = useState(false);
  const [cooldownSec, setCooldownSec] = useState(0);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  // User-selectable batch size (3 or 4)
  const [batchSize, setBatchSize] = useState<number>(4);
  const [previewRowIndex, setPreviewRowIndex] = useState<number>(0);
  const ready = !!csv && !!mapping && !!template?.trim();
  const [envOk, setEnvOk] = useState<boolean | null>(null);
  const [missing, setMissing] = useState<string[]>([]);
  const subjectInputRef = useRef<HTMLInputElement | null>(null);

  const refreshEnvStatus = useCallback(async () => {
    const d = await getEnvStatusAction();
    setEnvOk(!!d.ok);
    setMissing(Array.isArray(d.missing) ? d.missing : []);
  }, []);

  useEffect(() => {
    let mounted = true;
    refreshEnvStatus()
      .catch(() => {
        if (!mounted) return;
        setEnvOk(false);
        setMissing(["SENDER_EMAIL", "SENDER_APP_PASSWORD", "SENDER_NAME"]);
      });
    return () => {
      mounted = false;
    };
  }, [refreshEnvStatus]);

  // Cooldown timer: when cooldownSec > 0, tick down every second
  useEffect(() => {
    if (cooldownSec <= 0) return;
    const id = setInterval(() => {
      setCooldownSec((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => clearInterval(id);
  }, [cooldownSec]);

  const renderRow = useCallback(
    (row: Record<string, string>) => {
      if (!mapping) return template;
      // Build context with all CSV fields, and standard aliases name/recipient.
      const ctx: Record<string, unknown> = { ...row };
      ctx.name = row[mapping.name];
      ctx.recipient = row[mapping.recipient];
      try {
        // Render using nunjucks (Jinja compatible)
        return nunjucks.renderString(template, ctx);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        return `<!-- Render error: ${msg} -->\n` + template;
      }
    },
    [mapping, template]
  );

  const previewHtml = useMemo(() => {
    if (!csv || !mapping) return normalizePreviewHtml(template);
    const row = csv.rows[previewRowIndex];
    const html = row ? renderRow(row) : template;
    return normalizePreviewHtml(html);
  }, [csv, mapping, template, previewRowIndex, renderRow]);

  const recipients = useMemo(() => {
    if (!csv || !mapping) return [] as string[];
    return (csv.rows as Array<Record<string, string>>)
      .filter((r) => r[mapping.recipient])
      .map((r) => String(r[mapping.recipient]));
  }, [csv, mapping]);

  const requiresSingleBatch = useMemo(() => {
    if (!attachmentsByName) return false;
    const min = 1024 * 1024;
    const max = 2 * 1024 * 1024;
    return Object.values(attachmentsByName).some((entries) =>
      Array.isArray(entries)
        ? entries.some((entry) => {
            if (!entry) return false;
            const size = entry.sizeBytes ?? 0;
            const filename = entry.filename?.toLowerCase() || "";
            const mime = (entry.contentType || "").toLowerCase();
            const isPdf = mime.includes("pdf") || filename.endsWith(".pdf");
            return Boolean(isPdf && size >= min && size <= max);
          })
        : false
    );
  }, [attachmentsByName]);

  const attachmentsPresent = useMemo(() => {
    if (!attachmentsByName) return false;
    return Object.values(attachmentsByName).some(
      (arr) => Array.isArray(arr) && arr.length > 0
    );
  }, [attachmentsByName]);

  const maxBatchSize = requiresSingleBatch ? 1 : attachmentsPresent ? 3 : 4;
  const limitedToThree = !requiresSingleBatch && attachmentsPresent;

  useEffect(() => {
    if (batchSize > maxBatchSize) {
      setBatchSize(maxBatchSize);
    }
  }, [maxBatchSize, batchSize]);

  // Preview batches (size = batchSize) so user can see grouping before sending
  const batchPreview = useMemo(() => {
    const list: Array<{ batch: number; recipients: string[] }> = [];
    if (!recipients || recipients.length === 0) return list;
    const SIZE = Math.max(1, Math.min(batchSize, maxBatchSize));
    for (let i = 0; i < recipients.length; i += SIZE) {
      list.push({
        batch: i / SIZE + 1,
        recipients: recipients.slice(i, i + SIZE),
      });
    }
    return list;
  }, [recipients, batchSize, maxBatchSize]);

  const availableVars = useMemo(() => {
    const s = new Set<string>();
    if (csv?.headers) csv.headers.forEach((h) => s.add(h));
    if (mapping) {
      s.add("name");
      s.add("recipient");
    }
    return Array.from(s);
  }, [csv, mapping]);

  const attachmentsByRecipient = useMemo(() => {
    if (!csv || !mapping || !attachmentsByName) return new Map<string, string[]>();
    const map = new Map<string, string[]>();
    for (const row of csv.rows as Array<Record<string, string>>) {
      const email = row[mapping.recipient];
      const nameVal = row[mapping.name];
      if (!email || !nameVal) continue;
      const normalized = normalizeNameKey(nameVal.toString());
      const entries = attachmentsByName[normalized];
      if (!entries || entries.length === 0) continue;
      const files = entries
        .filter(Boolean)
        .map((entry) => entry.filename || "Attachment");
      if (files.length > 0) map.set(String(email), files);
    }
    return map;
  }, [csv, mapping, attachmentsByName]);
  const usedSubjectVars = useMemo(() => {
    const vars = new Set<string>();
    const re = /\{\{\s*([a-zA-Z_][\w\.]*)\s*\}\}/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(subjectTemplate || ""))) vars.add(m[1]);
    return Array.from(vars);
  }, [subjectTemplate]);

  const usedBodyVars = useMemo(() => {
    const vars = new Set<string>();
    const re = /\{\{\s*([a-zA-Z_][\w\.]*)\s*\}\}/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(template || ""))) vars.add(m[1]);
    return Array.from(vars);
  }, [template]);

  const allUsed = useMemo(
    () => Array.from(new Set([...usedSubjectVars, ...usedBodyVars])),
    [usedSubjectVars, usedBodyVars]
  );
  const invalidUsed = useMemo(
    () => allUsed.filter((v) => !availableVars.includes(v)),
    [allUsed, availableVars]
  );

  const insertSubjectVariable = useCallback(
    (variable: string) => {
      if (!onSubjectChange) return;
      const addition = `{{ ${variable} }}`;
      const value = subjectTemplate ?? "";
      const input = subjectInputRef.current;
      if (!input) {
        onSubjectChange(`${value}${addition}`);
        return;
      }
      const start = input.selectionStart ?? value.length;
      const end = input.selectionEnd ?? value.length;
      const next = value.slice(0, start) + addition + value.slice(end);
      onSubjectChange(next);
      requestAnimationFrame(() => {
        input.focus();
        const caret = start + addition.length;
        input.setSelectionRange(caret, caret);
      });
    },
    [onSubjectChange, subjectTemplate]
  );

  const doSendEmails = useCallback(async () => {
    if (!ready || !csv || !mapping) return;
    const allRows = csv.rows.filter((r) => r[mapping.recipient]);
    const total = allRows.length;
    const BATCH_SIZE = Math.max(1, Math.min(batchSize, maxBatchSize));
    setShowSendModal(true);
    setSendModalLogs([]);
    setSendModalSummary({ sent: 0, failed: 0 });
    setSendModalTotal(total);
    // Compute and expose batch groupings for UI
    const assignments: Array<{ batch: number; recipients: string[] }> = [];
    for (let i = 0; i < total; i += BATCH_SIZE) {
      const recips = allRows
        .slice(i, i + BATCH_SIZE)
        .map((r) => String(r[mapping.recipient]));
      assignments.push({ batch: i / BATCH_SIZE + 1, recipients: recips });
    }
    setBatchAssignments(assignments);
    try {
      setIsSending(true);
      for (let start = 0; start < total; start += BATCH_SIZE) {
        setCurrentBatchIndex(start / BATCH_SIZE);
        const batch = allRows.slice(start, start + BATCH_SIZE);
        const body = {
          rows: batch,
          mapping,
          template,
          subjectTemplate: subjectTemplate?.trim() || undefined,
          attachmentsByName,
          delayMs: 2000,
          jitterMs: 250,
        };
        const res = await sendBatchAction(body);
        const items =
          "items" in res && Array.isArray(res.items) ? res.items : undefined;
        if (!items) {
          // mark whole batch as failed when the server could not return per-recipient results
          for (const r of batch) {
            const to = String(r[mapping.recipient] || "");
            setSendModalLogs((prev) => [
              ...prev,
              {
                to,
                status: "error",
                error: "error" in res ? res.error || "Batch failed" : "Batch failed",
                attachments: 0,
                timestamp: new Date().toISOString(),
              },
            ]);
          }
          setSendModalSummary((prev) => ({
            sent: prev.sent,
            failed: prev.failed + batch.length,
          }));
          continue;
        }
        setSendModalLogs((prev) => [
          ...prev,
          ...items.map((obj) => ({
            to: obj.to,
            status: obj.status,
            subject: obj.subject,
            error: obj.error,
            messageId: obj.messageId,
            response: obj.response,
            accepted: obj.accepted,
            rejected: obj.rejected,
            attachments: obj.attachments,
            timestamp: obj.timestamp,
          })),
        ]);
        setSendModalSummary((prev) => ({
          sent: prev.sent + (res.sent || 0),
          failed: prev.failed + (res.failed || 0),
        }));
        // small pause between batches
        await new Promise((r) => setTimeout(r, 200));
      }
    } catch (e) {
      alert(`Send error: ${(e as Error).message}`);
    } finally {
      setIsSending(false);
      setCooldownSec(5);
    }
  }, [
    ready,
    csv,
    mapping,
    template,
    subjectTemplate,
    attachmentsByName,
    batchSize,
    maxBatchSize,
  ]);

  const attachmentFileCount = useMemo(
    () =>
      Object.values(attachmentsByName || {}).reduce(
        (n, arr) => n + (Array.isArray(arr) ? arr.length : 0),
        0
      ),
    [attachmentsByName]
  );

  const currentRow =
    csv && mapping ? csv.rows[previewRowIndex] : undefined;
  const currentRecipientName = currentRow
    ? currentRow[mapping!.name]
    : undefined;
  const currentRecipientEmail = currentRow
    ? currentRow[mapping!.recipient]
    : undefined;

  const sendBlocker =
    !csv || !mapping
      ? "Upload a recipient list in Step 1."
      : !template?.trim()
      ? "Choose a message template in Step 2."
      : envOk === false
      ? `Missing sender credentials: ${missing.join(", ")}.`
      : null;

  const canSend = ready && envOk !== false && !isSending && cooldownSec === 0;

  return (
    <>
      <div className="space-y-4">
        {/* Readiness overview */}
        <section className="card p-4 sm:p-5 space-y-4" id="tutorial-env-controls">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <h2 className="text-lg font-medium">Review &amp; Send</h2>
              <p className="text-sm text-gray-600">
                One last look before your emails go out.
              </p>
            </div>
            <span className="inline-flex items-center gap-2 rounded-md border border-gray-200 bg-white px-2 py-1">
              <Image
                src="/cisco-logo.jpg"
                alt="Cisco"
                width={64}
                height={24}
                className="h-6 w-auto rounded-sm border border-gray-200 bg-white p-px"
              />
              <span className="text-xs font-medium text-gray-700">
                Sending as {SENDER_LABEL}
              </span>
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard label="Recipients" value={recipients.length} />
            <StatCard
              label="Batches"
              value={batchPreview.length}
              sub={`up to ${Math.max(1, Math.min(batchSize, maxBatchSize))} per batch`}
            />
            <StatCard
              label="Attachments"
              value={attachmentFileCount}
              sub={attachmentsPresent ? "matched by name" : "none"}
            />
            <StatCard label="Sender" value="CNCP · Manila" sub="Gmail relay" />
          </div>

          <ul className="flex flex-wrap gap-2 text-xs">
            <CheckChip
              done={!!csv && !!mapping}
              label="Recipient list ready"
              pendingLabel="Add a CSV in Step 1"
            />
            <CheckChip
              done={!!template?.trim()}
              label="Message template ready"
              pendingLabel="Pick a template in Step 2"
            />
            <CheckChip
              done={envOk === true}
              loading={envOk === null}
              label="Sender credentials OK"
              pendingLabel={
                envOk === false
                  ? `Missing: ${missing.join(", ")}`
                  : "Checking…"
              }
            />
          </ul>
        </section>

        {!ready && (
          <section className="card p-6 text-center space-y-2">
            <p className="text-base font-semibold text-gray-900">
              Almost there
            </p>
            <p className="text-sm text-gray-600 max-w-md mx-auto">
              {sendBlocker} Once that&rsquo;s done, your live preview, batch
              plan, and send controls will appear here.
            </p>
          </section>
        )}

        {ready && csv && mapping && (
          <>
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 items-start">
          {/* Left rail: subject + recipients */}
          <div className="lg:col-span-2 space-y-4">
            <section
              className="card p-4 space-y-3"
              id="tutorial-subject-editor"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="text-sm font-medium">Subject line</div>
                <VariablePicker
                  variables={availableVars}
                  label="Insert variable"
                  onInsert={(v) => insertSubjectVariable(v)}
                />
              </div>
              <input
                ref={subjectInputRef}
                value={subjectTemplate}
                onChange={(e) => onSubjectChange?.(e.target.value)}
                placeholder="e.g. Your certificate for {{ event }}"
                className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#049fd9]"
              />
              {allUsed.length > 0 && (
                <div className="text-xs flex flex-wrap gap-2">
                  <span className="text-gray-500">Variables used:</span>
                  {allUsed.map((v) => (
                    <span
                      key={v}
                      className={`px-2 py-0.5 rounded border ${
                        availableVars.includes(v)
                          ? "bg-[#ebf6fc] dark:bg-[#10263f] border-[#049fd9]/30 dark:border-[#38bdf8]/40 text-[#0071a4] dark:text-[#7dd3fc]"
                          : "bg-red-50 border-red-200 text-red-800"
                      }`}
                    >
                      {`{{ ${v} }}`}
                    </span>
                  ))}
                </div>
              )}
              {invalidUsed.length > 0 && (
                <div className="text-xs text-red-700">
                  Unknown variables: {invalidUsed.join(", ")} (not found in CSV
                  headers)
                </div>
              )}
            </section>

            <section
              className="card overflow-hidden"
              id="tutorial-recipient-list"
            >
              <div className="px-4 py-2.5 text-sm font-medium bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                <span>Recipients</span>
                <span className="text-xs font-normal text-gray-600">
                  {recipients.length} total
                </span>
              </div>
              <div className="max-h-80 overflow-auto text-xs">
                {recipients.length === 0 && (
                  <div className="p-3 text-gray-500">
                    No recipients found in this CSV.
                  </div>
                )}
                <ul className="divide-y divide-gray-100">
                  {recipients.map((email, idx) => (
                    <li key={`${email}-${idx}`} className="px-4 py-1.5">
                      <button
                        type="button"
                        onClick={() => setPreviewRowIndex(idx)}
                        className={`w-full text-left truncate hover:text-[#0071a4] dark:hover:text-[#7dd3fc] ${
                          idx === previewRowIndex
                            ? "font-semibold text-[#0071a4] dark:text-[#7dd3fc]"
                            : ""
                        }`}
                        title="Preview this recipient"
                      >
                        {email}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          </div>

          {/* Right: live preview */}
          <div className="lg:col-span-3 space-y-4">
            <section className="card overflow-hidden" id="tutorial-preview-frame">
              <div className="px-4 py-2.5 text-sm font-medium bg-gray-50 border-b border-gray-200 flex items-center justify-between gap-2 flex-wrap">
                <span>Live preview</span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    aria-label="Previous recipient"
                    onClick={() => setPreviewRowIndex((p) => Math.max(0, p - 1))}
                    disabled={previewRowIndex === 0}
                    className="h-7 w-7 rounded-full border border-gray-200 bg-white text-sm leading-none hover:bg-gray-50 disabled:opacity-40"
                  >
                    ‹
                  </button>
                  <span className="text-xs font-normal text-gray-600 tabular-nums">
                    {previewRowIndex + 1} / {csv.rowCount}
                  </span>
                  <button
                    type="button"
                    aria-label="Next recipient"
                    onClick={() =>
                      setPreviewRowIndex((p) =>
                        Math.min(csv.rowCount - 1, p + 1)
                      )
                    }
                    disabled={previewRowIndex >= csv.rowCount - 1}
                    className="h-7 w-7 rounded-full border border-gray-200 bg-white text-sm leading-none hover:bg-gray-50 disabled:opacity-40"
                  >
                    ›
                  </button>
                </div>
              </div>
              <div className="px-4 pt-3 space-y-2">
                {currentRecipientEmail && (
                  <div className="text-xs text-gray-600 flex items-center gap-1.5 flex-wrap">
                    <span className="font-medium text-gray-800">
                      {currentRecipientName || "(no name)"}
                    </span>
                    <span className="text-gray-400">·</span>
                    <span>{currentRecipientEmail}</span>
                  </div>
                )}
              {/* Attachments for current preview row */}
              {(() => {
                if (!csv || !mapping) return null;
                const row = csv.rows[previewRowIndex];
                if (!row) return null;
                const email = row[mapping.recipient];
                const attachments = email ? attachmentsByRecipient.get(String(email)) : null;
                if (!attachments || attachments.length === 0) {
                  return (
                    <div className="text-xs text-gray-500 flex items-center gap-1.5">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                        <path fillRule="evenodd" d="M15.621 4.379a3 3 0 00-4.242 0l-7 7a3 3 0 004.241 4.243h.001l.497-.5a.75.75 0 011.064 1.057l-.498.501-.002.002a4.5 4.5 0 01-6.364-6.364l7-7a4.5 4.5 0 016.368 6.36l-3.455 3.553A2.625 2.625 0 119.52 9.52l3.45-3.451a.75.75 0 111.061 1.06l-3.45 3.451a1.125 1.125 0 001.587 1.595l3.454-3.553a3 3 0 000-4.242z" clipRule="evenodd" />
                      </svg>
                      No attachments for this recipient
                    </div>
                  );
                }
                return (
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <table className="w-full text-xs">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 py-1.5 text-left font-medium text-gray-700 border-b border-gray-200">Attachments ({attachments.length})</th>
                        </tr>
                      </thead>
                      <tbody>
                        {attachments.map((file, idx) => (
                          <tr key={idx} className="border-b border-gray-200 last:border-b-0">
                            <td className="px-3 py-1.5 text-gray-700">
                              <span className="inline-flex items-center gap-1.5">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5 text-gray-400 flex-shrink-0">
                                  <path d="M3 3.5A1.5 1.5 0 014.5 2h6.879a1.5 1.5 0 011.06.44l4.122 4.12A1.5 1.5 0 0117 7.622V16.5a1.5 1.5 0 01-1.5 1.5h-11A1.5 1.5 0 013 16.5v-13z" />
                                </svg>
                                {file}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              })()}
              <iframe
                srcDoc={previewHtml}
                title="Email preview"
                className="w-full h-96 rounded-md border border-gray-200 bg-white"
                sandbox="allow-scripts"
              />
            </div>
            </section>
          </div>
        </div>
          </>
        )}

        {/* Delivery pace & batch plan */}
        {batchPreview.length > 0 && (
        <section className="card p-4 space-y-3" id="tutorial-batch-preview">
            <div className="text-sm font-medium flex items-center gap-2 flex-wrap">
              <span>Delivery pace</span>
              <span className="text-xs font-normal text-gray-600">
                {batchPreview.length} batch{batchPreview.length !== 1 ? "es" : ""} ·{" "}
                {recipients.length} recipient{recipients.length !== 1 ? "s" : ""}
              </span>
            </div>
            {/* Batch size selector */}
            <div className="flex items-center gap-3 text-xs flex-wrap">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="opacity-70">Batch size:</span>
                {[1, 3, 4].map((size) => {
                  const disabled =
                    (requiresSingleBatch && size !== 1) ||
                    (limitedToThree && size === 4);
                  return (
                    <label
                      key={size}
                      className={`inline-flex items-center gap-1 cursor-pointer ${
                        disabled ? "opacity-40 cursor-not-allowed" : ""
                      }`}
                    >
                      <input
                        type="radio"
                        name="batchSize"
                        value={size}
                        checked={batchSize === size}
                        onChange={() => setBatchSize(size)}
                        className="accent-[#049fd9]"
                        disabled={disabled}
                      />
                      <span>{size}</span>
                    </label>
                  );
                })}
              </div>
              <div className="text-[11px] text-gray-600">
                {requiresSingleBatch ? (
                  <span className="text-yellow-800">
                    Large 1-2 MB PDF attachments detected. Sending is locked
                    to 1 email per batch.
                  </span>
                ) : attachmentsPresent ? (
                  <span>
                    <strong>Tip:</strong> Attachments detected. Sending is
                    capped at <strong>3 per batch</strong> to reduce payload
                    size.
                  </span>
                ) : (
                  <span>
                    <strong>Tip:</strong> No attachments detected. You can use
                    <strong> 4 per batch</strong> for faster overall sending.
                  </span>
                )}
              </div>
            </div>
            <details className="text-xs">
              <summary className="cursor-pointer select-none font-medium text-gray-700 hover:text-[#0071a4] dark:hover:text-[#7dd3fc]">
                View batch breakdown
              </summary>
              <div className="mt-2 max-h-48 overflow-auto bg-gray-50 border border-gray-200 rounded-md">
              <ul className="divide-y divide-gray-200">
                {batchPreview.map((b) => (
                  <li key={`batch-${b.batch}`} className="px-3 py-2 space-y-1">
                    <div className="font-medium text-gray-800">Batch {b.batch}</div>
                    <div className="text-gray-700 space-y-1">
                      {b.recipients.map((email) => {
                        const attachments = attachmentsByRecipient.get(email) || [];
                        return (
                          <div
                            key={`${b.batch}-${email}`}
                            className="flex flex-wrap gap-1 items-center"
                          >
                            <span className="wrap-break-word">{email}</span>
                            {attachments.length > 0 && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 border rounded bg-white">
                                📎
                                <span>
                                  {attachments.length} file
                                  {attachments.length > 1 ? "s" : ""}
                                </span>
                                <span className="text-gray-500">
                                  ({attachments.slice(0, 2).join(", ")}
                                  {attachments.length > 2
                                    ? ` +${attachments.length - 2}`
                                    : ""})
                                </span>
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </li>
                ))}
              </ul>
              </div>
            </details>
            <div className="text-[11px] text-gray-600">
              Emails are sent sequentially with a jittered ~2s delay per email to
              reduce throttling and avoid serverless timeouts.
            </div>
          </section>
        )}

        {/* Action bar */}
        <section
          className={`card p-3 flex flex-wrap items-center justify-between gap-3 ${
            ready ? "sticky bottom-4 z-30 shadow-lg" : ""
          }`}
        >
          <p className="text-sm min-w-0">
            {ready ? (
              <>
                <span className="font-semibold text-gray-900">
                  Ready to send {recipients.length} email
                  {recipients.length !== 1 ? "s" : ""}
                </span>{" "}
                <span className="text-gray-600">
                  in {batchPreview.length} batch
                  {batchPreview.length !== 1 ? "es" : ""} as {SENDER_LABEL}.
                </span>
              </>
            ) : (
              <span className="text-gray-600">{sendBlocker}</span>
            )}
          </p>
          <div className="flex items-center gap-2 ml-auto">
            <button
              type="button"
              disabled={!ready}
              onClick={() => ready && onExportJson((row) => renderRow(row))}
              title={ready ? undefined : "Finish the steps above first"}
              className={`px-4 py-2 rounded-md border text-sm font-medium ${
                ready
                  ? "border-[#0d274d] dark:border-[#38bdf8] text-[#0d274d] dark:text-[#7dd3fc] bg-white hover:bg-[#ebf6fc] dark:bg-transparent"
                  : "border-gray-200 text-gray-500 opacity-60 cursor-not-allowed"
              }`}
            >
              Export JSON
            </button>
            <button
              type="button"
              disabled={!canSend}
              onClick={() => {
                if (!canSend || !csv || !mapping) return;
                try {
                  setShowConfirmModal(true);
                } catch (e) {
                  alert(`Send error: ${(e as Error).message}`);
                }
              }}
              title={
                !ready
                  ? sendBlocker || undefined
                  : envOk === false
                  ? "Resolve sender credentials first"
                  : undefined
              }
              className={`px-5 py-2 rounded-md text-sm font-semibold text-white transition ${
                canSend
                  ? "bg-[#049fd9] dark:bg-[#38bdf8] border border-[#0071a4] dark:border-[#049fd9] hover:bg-[#0071a4] dark:hover:bg-[#049fd9] shadow-sm"
                  : "bg-gray-400/70 border border-gray-300 cursor-not-allowed opacity-80"
              } ${isSending ? "cursor-wait" : ""}`}
            >
              {isSending ? (
                <span className="inline-flex items-center gap-2">
                  <svg
                    className="animate-spin h-4 w-4"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                    />
                  </svg>
                  Sending…
                </span>
              ) : cooldownSec > 0 ? (
                `Wait ${cooldownSec}s`
              ) : (
                <>
                  Send {recipients.length} email{recipients.length !== 1 ? "s" : ""}
                  <span aria-hidden="true" className="ml-1">
                    →
                  </span>
                </>
              )}
            </button>
          </div>
        </section>
      </div>
      {showSendModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white w-full max-w-3xl rounded shadow-lg">
            <div className="px-4 py-3 border-b flex items-center justify-between">
              <div className="text-sm font-medium">
                {isSending ? "Sending… Live Log" : "Send Summary"}
              </div>
              <button
                className="text-xs px-2 py-1 border rounded"
                onClick={() => setShowSendModal(false)}
              >
                Close
              </button>
            </div>
            <div className="p-4 space-y-3">
              <div className="text-xs flex gap-4 items-center">
                <span>
                  <strong>Sent:</strong> {sendModalSummary.sent}
                </span>
                <span>
                  <strong>Failed:</strong> {sendModalSummary.failed}
                </span>
                {typeof sendModalTotal === "number" && (
                  <span>
                    <strong>Remaining:</strong>{" "}
                    {Math.max(
                      0,
                      sendModalTotal -
                        (sendModalSummary.sent + sendModalSummary.failed)
                    )}
                  </span>
                )}
                {isSending && (
                  <span className="opacity-70 animate-pulse">In Progress…</span>
                )}
              </div>
              {typeof sendModalTotal === "number" && (
                <div className="w-full h-2 bg-gray-200 rounded">
                  <div
                    className="h-2 bg-[#049fd9] dark:bg-[#38bdf8] rounded"
                    style={{
                      width: `${Math.min(
                        100,
                        Math.floor(
                          ((sendModalSummary.sent + sendModalSummary.failed) /
                            (sendModalTotal || 1)) *
                            100
                        )
                      )}%`,
                    }}
                  />
                </div>
              )}
              {/* Batch overview */}
              {batchAssignments.length > 0 && (
                <div className="border rounded p-2 bg-gray-50 text-xs">
                  <div className="mb-1 font-medium">Batches</div>
                  <div className="flex flex-col gap-1 max-h-32 overflow-auto">
                    {batchAssignments.map((b, idx) => (
                      <div
                        key={idx}
                        className={`flex gap-2 items-start ${
                          idx === currentBatchIndex ? "text-[#0071a4] dark:text-[#7dd3fc] font-medium" : ""
                        }`}
                      >
                        <span className="min-w-[60px] inline-block">
                          Batch {b.batch}:
                        </span>
                        <span className="flex-1 wrap-break-word">
                          {b.recipients.join(", ")}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {isSending && (
                <div className="text-xs text-gray-600 bg-yellow-50 border border-yellow-200 rounded p-2">
                  Sending is paced with a ~2 second delay per email to reduce
                  the risk of provider throttling, rate limits, or spam
                  detection. This helps keep delivery reliable when sending to
                  many recipients.
                </div>
              )}
              <div className="max-h-72 overflow-auto border rounded text-xs font-mono bg-white">
                <table className="min-w-full text-xs">
                  <thead className="sticky top-0 bg-gray-50">
                    <tr>
                      <th className="text-left px-2 py-1 border">Recipient</th>
                      <th className="text-left px-2 py-1 border">Status</th>
                      <th className="text-left px-2 py-1 border">Time</th>
                      <th className="text-left px-2 py-1 border">Subject</th>
                      <th className="text-left px-2 py-1 border">
                        Attachments
                      </th>
                      <th className="text-left px-2 py-1 border">
                        Message / Error
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {sendModalLogs.map((l, i) => (
                      <tr key={i} className="odd:bg-white even:bg-gray-50">
                        <td className="px-2 py-1 border whitespace-pre-wrap wrap-break-word">
                          {l.to}
                        </td>
                        <td
                          className={`px-2 py-1 border ${
                            l.status === "sent"
                              ? "text-green-700"
                              : "text-red-700"
                          }`}
                        >
                          {l.status}
                        </td>
                        <td className="px-2 py-1 border whitespace-pre-wrap wrap-break-word">
                          {l.timestamp
                            ? new Date(l.timestamp).toLocaleTimeString()
                            : ""}
                        </td>
                        <td className="px-2 py-1 border whitespace-pre-wrap wrap-break-word">
                          {l.subject || ""}
                        </td>
                        <td className="px-2 py-1 border">
                          {typeof l.attachments === "number"
                            ? l.attachments
                            : ""}
                        </td>
                        <td className="px-2 py-1 border whitespace-pre-wrap wrap-break-word">
                          {l.error ||
                            l.response ||
                            l.messageId ||
                            (l.accepted?.length
                              ? `accepted: ${l.accepted.join(", ")}`
                              : l.rejected?.length
                              ? `rejected: ${l.rejected.join(", ")}`
                              : "")}
                        </td>
                      </tr>
                    ))}
                    {isSending && sendModalLogs.length === 0 && (
                      <tr>
                        <td
                          colSpan={5}
                          className="px-2 py-4 text-center text-gray-500"
                        >
                          Starting…
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded shadow-lg w-full max-w-md p-5 space-y-4">
            <div className="flex items-center gap-3">
              <Image
                src="/cisco-logo.jpg"
                alt="Cisco"
                width={64}
                height={32}
                className="h-8 w-auto rounded border border-gray-200 bg-white p-px"
              />
              <h3 className="text-sm font-medium">Confirm Send</h3>
            </div>
            <p className="text-sm">
              You are using the <strong>{SENDER_LABEL}</strong> sender identity
              to send these emails. Are you sure you want to proceed?
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="px-3 py-1 border rounded text-sm bg-white hover:bg-gray-50"
                disabled={isSending}
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  setShowConfirmModal(false);
                  await doSendEmails();
                }}
                className="px-3 py-1 border rounded text-sm bg-[#049fd9] dark:bg-[#38bdf8] border-[#0071a4] dark:border-[#049fd9] text-white hover:bg-[#0071a4] dark:hover:bg-[#049fd9] disabled:opacity-50"
                disabled={isSending}
              >
                {isSending ? "Sending…" : "Yes, Send"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
