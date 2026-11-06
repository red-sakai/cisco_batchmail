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
import { autoLinkifyHtml } from "@/lib/links";
// email editing is performed in the Template tab
import type { AttachIndex } from "./AttachmentsUploader";
import VariablePicker from "./VariablePicker";
import Icon from "./Icon";
import type { CSSProperties } from "react";

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
    <div className="md:border-l md:border-line md:pl-4 md:first:border-l-0 md:first:pl-0">
      <dt className="text-xs font-medium text-muted">{label}</dt>
      <dd className="text-xl font-semibold tabular-nums leading-tight">
        {value}
      </dd>
      {sub && <dd className="text-xs text-subtle">{sub}</dd>}
    </div>
  );
}

function CheckChip({
  done,
  loading = false,
  danger = false,
  label,
  pendingLabel,
}: {
  done: boolean;
  loading?: boolean;
  danger?: boolean;
  label: string;
  pendingLabel?: string;
}) {
  const pending = pendingLabel ?? label;
  return (
    <li className={`chip ${done ? "chip-accent" : danger ? "chip-danger" : loading ? "" : "chip-warn"}`}>
      <Icon
        name={done ? "check" : "alert"}
        className={`h-3.5 w-3.5 ${loading ? "animate-pulse" : ""}`}
      />
      <span>{done ? label : pending}</span>
    </li>
  );
}

// Offsets make each batch read as a small constellation, not beads on a wire.
const STAR_Y = [14, 30, 4, 24];
const STAR_STEP_X = 30;

// One star per recipient. Logs arrive in recipient order, so logs[i] is star i.
// Purely visual: the counts and log table beside it carry the same information.
function Constellation({
  batches,
  logs,
  currentBatch,
  sending,
}: {
  batches: Array<{ batch: number; recipients: string[] }>;
  logs: Array<{ status: string }>;
  currentBatch: number;
  sending: boolean;
}) {
  const allSent = !sending && logs.length > 0 && logs.every((l) => l.status === "sent");
  let index = 0;
  return (
    <div aria-hidden="true" className="send-sky" data-done={allSent}>
      {batches.map((b, batchIdx) => {
        const stars = b.recipients.map((_, s) => ({
          x: s * STAR_STEP_X,
          y: STAR_Y[(s + batchIdx) % STAR_Y.length],
        }));
        return (
          <span
            key={b.batch}
            className="send-batch"
            style={{ width: (stars.length - 1) * STAR_STEP_X + 20 }}
          >
            <svg className="absolute inset-0 h-full w-full overflow-visible">
              <polyline
                points={stars.map((p) => `${p.x + 10},${p.y + 10}`).join(" ")}
                fill="none"
                stroke="rgb(255 255 255 / 0.22)"
              />
            </svg>
            {b.recipients.map((email, s) => {
              const i = index++;
              const status = logs[i]?.status;
              const state =
                status === "sent"
                  ? "is-sent"
                  : status
                  ? "is-failed"
                  : sending && batchIdx === currentBatch
                  ? "is-current"
                  : "";
              return (
                <span
                  key={i}
                  title={email}
                  className={`send-star ${state}`}
                  style={{ left: stars[s].x, top: stars[s].y, "--i": i } as CSSProperties}
                />
              );
            })}
          </span>
        );
      })}
    </div>
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
        // Render using nunjucks (Jinja compatible), then wrap bare URLs so
        // values like {{ link }} come out clickable in the preview.
        return autoLinkifyHtml(nunjucks.renderString(template, ctx));
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
              <h2 className="text-lg font-semibold">Review &amp; Send</h2>
              <p className="text-sm text-muted">
                One last look before your emails go out.
              </p>
            </div>
            <span className="inline-flex items-center gap-2 rounded-lg border border-line bg-surface-2 px-2 py-1">
              <Image
                src="/cncp-white.png"
                alt="CNCP"
                width={36}
                height={28}
                className="logo-chip h-7 w-auto"
              />
              <span className="text-xs font-medium text-muted">
                Sending as {SENDER_LABEL}
              </span>
            </span>
          </div>

          <dl className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-3">
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
          </dl>

          <ul className="flex flex-wrap gap-2">
            <CheckChip
              done={!!csv && !!mapping}
              label="Recipient list ready"
              pendingLabel="Add a CSV in Step 1"
            />
            <CheckChip
              done={!!template?.trim() && invalidUsed.length === 0}
              danger={invalidUsed.length > 0}
              label="Message template ready"
              pendingLabel={
                invalidUsed.length > 0
                  ? `${invalidUsed.length} unknown variable${invalidUsed.length !== 1 ? "s" : ""} in message`
                  : "Pick a template in Step 2"
              }
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
            <p className="text-base font-semibold">
              Almost there
            </p>
            <p className="text-sm text-muted max-w-md mx-auto">
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
                <label htmlFor="subject-input" className="text-sm font-semibold">Subject line</label>
                <VariablePicker
                  variables={availableVars}
                  label="Insert variable"
                  onInsert={(v) => insertSubjectVariable(v)}
                />
              </div>
              <input
                id="subject-input"
                ref={subjectInputRef}
                value={subjectTemplate}
                onChange={(e) => onSubjectChange?.(e.target.value)}
                placeholder="e.g. Your certificate for {{ event }}"
                className="input w-full"
              />
              {allUsed.length > 0 && (
                <div className="text-xs flex flex-wrap items-center gap-1.5">
                  <span className="text-subtle">Variables used:</span>
                  {allUsed.map((v) => (
                    <span
                      key={v}
                      className={`chip font-mono !py-0.5 !rounded-md ${
                        availableVars.includes(v) ? "chip-accent" : "chip-danger"
                      }`}
                    >
                      {`{{ ${v} }}`}
                    </span>
                  ))}
                </div>
              )}
              {invalidUsed.length > 0 && (
                <div role="alert" className="notice notice-danger">
                  Unknown variables: {invalidUsed.join(", ")} (not found in CSV
                  headers)
                </div>
              )}
            </section>

            <section
              className="card overflow-hidden"
              id="tutorial-recipient-list"
            >
              <div className="px-4 py-2.5 text-sm font-semibold bg-surface-2 border-b border-line flex items-center justify-between">
                <span>Recipients</span>
                <span className="text-xs font-normal text-muted tabular-nums">
                  {recipients.length} total
                </span>
              </div>
              <div className="max-h-80 overflow-auto text-xs">
                {recipients.length === 0 && (
                  <div className="p-3 text-subtle">
                    No recipients found in this CSV.
                  </div>
                )}
                <ul className="divide-y divide-line">
                  {recipients.map((email, idx) => (
                    <li key={`${email}-${idx}`}>
                      <button
                        type="button"
                        onClick={() => setPreviewRowIndex(idx)}
                        aria-current={idx === previewRowIndex}
                        className={`w-full px-4 py-2 text-left truncate transition-colors ${
                          idx === previewRowIndex
                            ? "bg-accent-soft font-semibold text-accent-ink"
                            : "hover:bg-surface-2"
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
              <div className="px-4 py-2 text-sm font-semibold bg-surface-2 border-b border-line flex items-center justify-between gap-2 flex-wrap">
                <span>Live preview</span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    aria-label="Previous recipient"
                    onClick={() => setPreviewRowIndex((p) => Math.max(0, p - 1))}
                    disabled={previewRowIndex === 0}
                    className="btn btn-sm btn-icon"
                  >
                    <Icon name="chevron-left" className="h-4 w-4" />
                  </button>
                  <span className="text-xs font-normal text-muted tabular-nums">
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
                    className="btn btn-sm btn-icon"
                  >
                    <Icon name="chevron-right" className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div className="p-4 space-y-2">
                {currentRecipientEmail && (
                  <div className="text-xs text-muted flex items-center gap-1.5 flex-wrap">
                    <span className="font-medium text-foreground">
                      {currentRecipientName || "(no name)"}
                    </span>
                    <span className="text-subtle">·</span>
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
                    <div className="text-xs text-subtle flex items-center gap-1.5">
                      <Icon name="paperclip" />
                      No attachments for this recipient
                    </div>
                  );
                }
                return (
                  <div className="border border-line rounded-lg overflow-hidden">
                    <table className="w-full text-xs">
                      <thead className="bg-surface-2">
                        <tr>
                          <th className="px-3 py-1.5 text-left font-medium text-muted border-b border-line">Attachments ({attachments.length})</th>
                        </tr>
                      </thead>
                      <tbody>
                        {attachments.map((file, idx) => (
                          <tr key={idx} className="border-b border-line last:border-b-0">
                            <td className="px-3 py-1.5">
                              <span className="inline-flex items-center gap-1.5">
                                <Icon name="file" className="w-3.5 h-3.5 text-subtle" />
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
                className="w-full h-[28rem] rounded-lg border border-line bg-white"
                sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox"
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
            <div className="text-sm font-semibold flex items-center gap-2 flex-wrap">
              <span>Delivery pace</span>
              <span className="text-xs font-normal text-muted tabular-nums">
                {batchPreview.length} batch{batchPreview.length !== 1 ? "es" : ""} ·{" "}
                {recipients.length} recipient{recipients.length !== 1 ? "s" : ""}
              </span>
            </div>
            {/* Batch size selector */}
            <div className="flex items-center gap-3 text-xs flex-wrap">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-muted">Batch size</span>
                <div className="segments" role="radiogroup" aria-label="Batch size">
                {[1, 3, 4].map((size) => {
                  const disabled =
                    (requiresSingleBatch && size !== 1) ||
                    (limitedToThree && size === 4);
                  return (
                    <label
                      key={size}
                      className="segment"
                      data-disabled={disabled}
                    >
                      <input
                        type="radio"
                        name="batchSize"
                        value={size}
                        checked={batchSize === size}
                        onChange={() => setBatchSize(size)}
                        className="sr-only"
                        disabled={disabled}
                      />
                      <span className="segment-face">{size}</span>
                    </label>
                  );
                })}
                </div>
              </div>
              <div className="text-xs text-muted">
                {requiresSingleBatch ? (
                  <span className="text-warn">
                    Large 1-2 MB PDF attachments detected. Sending is locked
                    to 1 email per batch.
                  </span>
                ) : attachmentsPresent ? (
                  <span>
                    <strong className="font-semibold">Tip:</strong> Attachments detected. Sending is
                    capped at <strong className="font-semibold">3 per batch</strong> to reduce payload
                    size.
                  </span>
                ) : (
                  <span>
                    <strong className="font-semibold">Tip:</strong> No attachments detected. You can use
                    <strong className="font-semibold"> 4 per batch</strong> for faster overall sending.
                  </span>
                )}
              </div>
            </div>
            <details className="text-xs">
              <summary className="select-none font-medium text-accent-ink">
                View batch breakdown
              </summary>
              <div className="mt-2 max-h-48 overflow-auto bg-surface-2 border border-line rounded-lg">
              <ul className="divide-y divide-line">
                {batchPreview.map((b) => (
                  <li key={`batch-${b.batch}`} className="px-3 py-2 space-y-1">
                    <div className="font-medium">Batch {b.batch}</div>
                    <div className="text-muted space-y-1">
                      {b.recipients.map((email) => {
                        const attachments = attachmentsByRecipient.get(email) || [];
                        return (
                          <div
                            key={`${b.batch}-${email}`}
                            className="flex flex-wrap gap-1 items-center"
                          >
                            <span className="wrap-break-word">{email}</span>
                            {attachments.length > 0 && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 border border-line rounded bg-surface">
                                <Icon name="paperclip" className="h-3 w-3" />
                                <span>
                                  {attachments.length} file
                                  {attachments.length > 1 ? "s" : ""}
                                </span>
                                <span className="text-subtle">
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
            <div className="text-xs text-subtle">
              Emails are sent sequentially with a jittered ~2s delay per email to
              reduce throttling and avoid serverless timeouts.
            </div>
          </section>
        )}

        {/* Action bar */}
        <section
          className={`card p-3 flex flex-wrap items-center justify-between gap-3 ${
            ready ? "sticky bottom-4 z-30" : ""
          }`}
        >
          <p className="text-sm min-w-0">
            {ready ? (
              <>
                <span className={`font-semibold ${invalidUsed.length > 0 ? "text-danger" : ""}`}>
                  {invalidUsed.length > 0
                    ? `${invalidUsed.length} unknown variable${invalidUsed.length !== 1 ? "s" : ""}: these will send blank.`
                    : `Ready to send ${recipients.length} email${recipients.length !== 1 ? "s" : ""}`}
                </span>{" "}
                <span className={`text-muted ${invalidUsed.length > 0 ? "hidden sm:inline" : ""}`}>
                  {invalidUsed.length > 0 &&
                    `${recipients.length} email${recipients.length !== 1 ? "s" : ""} `}
                  in {batchPreview.length} batch
                  {batchPreview.length !== 1 ? "es" : ""} as {SENDER_LABEL}.
                </span>
              </>
            ) : (
              <span className="text-muted">{sendBlocker}</span>
            )}
          </p>
          <div className="flex items-center gap-2 ml-auto">
            <button
              type="button"
              disabled={!ready}
              onClick={() => ready && onExportJson((row) => renderRow(row))}
              title={ready ? undefined : "Finish the steps above first"}
              className="btn"
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
              className={`btn btn-primary btn-send !px-5 ${isSending ? "cursor-wait" : ""}`}
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
                  <Icon name="send" className="h-4 w-4" />
                </>
              )}
            </button>
          </div>
        </section>
      </div>
      {showSendModal && (
        <div className="modal-backdrop">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="send-modal-title"
            className="modal max-w-3xl"
          >
            <div className="px-5 py-3.5 border-b border-line flex items-center justify-between gap-3">
              <h2 id="send-modal-title" aria-live="polite" className="text-base font-semibold">
                {isSending ? "Sending…" : "Send summary"}
              </h2>
              <button
                type="button"
                className="btn btn-sm"
                onClick={() => setShowSendModal(false)}
              >
                Close
              </button>
            </div>
            <div className="p-5 space-y-3">
              {batchAssignments.length > 0 && (
                <Constellation
                  batches={batchAssignments}
                  logs={sendModalLogs}
                  currentBatch={currentBatchIndex}
                  sending={isSending}
                />
              )}
              {typeof sendModalTotal === "number" && (
                <div
                  className="progress"
                  role="progressbar"
                  aria-label="Emails processed"
                  aria-valuemin={0}
                  aria-valuemax={sendModalTotal}
                  aria-valuenow={sendModalSummary.sent + sendModalSummary.failed}
                >
                  <div
                    className="progress-sent"
                    style={{ width: `${(sendModalSummary.sent / (sendModalTotal || 1)) * 100}%` }}
                  />
                  <div
                    className="progress-failed"
                    style={{ width: `${(sendModalSummary.failed / (sendModalTotal || 1)) * 100}%` }}
                  />
                </div>
              )}
              <div className="text-sm flex flex-wrap gap-x-5 gap-y-1 items-center tabular-nums">
                <span>
                  <span className="text-muted">Sent</span>{" "}
                  <strong className="font-semibold">{sendModalSummary.sent}</strong>
                </span>
                <span className={sendModalSummary.failed > 0 ? "text-danger" : ""}>
                  <span className={sendModalSummary.failed > 0 ? "" : "text-muted"}>Failed</span>{" "}
                  <strong className="font-semibold">{sendModalSummary.failed}</strong>
                </span>
                {typeof sendModalTotal === "number" && (
                  <span>
                    <span className="text-muted">Remaining</span>{" "}
                    <strong className="font-semibold">
                      {Math.max(
                        0,
                        sendModalTotal -
                          (sendModalSummary.sent + sendModalSummary.failed)
                      )}
                    </strong>
                  </span>
                )}
                {isSending && (
                  <span className="text-xs text-muted animate-pulse">In progress…</span>
                )}
              </div>
              {/* Batch overview */}
              {batchAssignments.length > 0 && (
                <details className="text-xs">
                  <summary className="select-none font-medium text-accent-ink">
                    View batches
                  </summary>
                  <div className="mt-2 flex flex-col gap-1 max-h-32 overflow-auto rounded-lg border border-line bg-surface-2 p-2">
                    {batchAssignments.map((b, idx) => (
                      <div
                        key={idx}
                        className={`flex gap-2 items-start ${
                          idx === currentBatchIndex ? "text-accent-ink font-medium" : "text-muted"
                        }`}
                      >
                        <span className="min-w-[60px] inline-block tabular-nums">
                          Batch {b.batch}:
                        </span>
                        <span className="flex-1 wrap-break-word">
                          {b.recipients.join(", ")}
                        </span>
                      </div>
                    ))}
                  </div>
                </details>
              )}
              {isSending && (
                <div className="notice notice-accent">
                  Sending is paced with a ~2 second delay per email to reduce
                  the risk of provider throttling, rate limits, or spam
                  detection. This helps keep delivery reliable when sending to
                  many recipients.
                </div>
              )}
              <div className="max-h-72 overflow-auto rounded-lg border border-line text-xs font-mono">
                <table className="w-full table-fixed text-xs">
                  <thead className="sticky top-0 bg-surface-2">
                    <tr className="text-muted">
                      <th className="w-[36%] sm:w-[26%] text-left font-medium px-3 py-2 border-b border-line">Recipient</th>
                      <th className="w-[20%] sm:w-[9%] text-left font-medium px-3 py-2 border-b border-line">Status</th>
                      <th className="hidden sm:table-cell w-[14%] text-left font-medium px-3 py-2 border-b border-line">Time</th>
                      <th className="hidden sm:table-cell w-[15%] text-left font-medium px-3 py-2 border-b border-line">Subject</th>
                      <th className="hidden sm:table-cell w-[7%] text-left font-medium px-3 py-2 border-b border-line" title="Attachments">
                        Files
                      </th>
                      <th className="text-left font-medium px-3 py-2 border-b border-line">
                        Message / Error
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {sendModalLogs.map((l, i) => (
                      <tr key={i} className="border-b border-line last:border-b-0">
                        <td className="px-3 py-1.5 align-top whitespace-pre-wrap [overflow-wrap:anywhere]">
                          {l.to}
                        </td>
                        <td
                          className={`px-3 py-1.5 align-top font-semibold ${
                            l.status === "sent"
                              ? "text-success"
                              : "text-danger"
                          }`}
                        >
                          {l.status}
                        </td>
                        <td className="hidden sm:table-cell px-3 py-1.5 align-top whitespace-nowrap">
                          {l.timestamp
                            ? new Date(l.timestamp).toLocaleTimeString()
                            : ""}
                        </td>
                        <td className="hidden sm:table-cell px-3 py-1.5 align-top whitespace-pre-wrap wrap-break-word">
                          {l.subject || ""}
                        </td>
                        <td className="hidden sm:table-cell px-3 py-1.5 align-top">
                          {typeof l.attachments === "number"
                            ? l.attachments
                            : ""}
                        </td>
                        <td className="px-3 py-1.5 align-top whitespace-pre-wrap [overflow-wrap:anywhere]">
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
                          colSpan={6}
                          className="px-3 py-4 text-center text-subtle"
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
        <div
          className="modal-backdrop"
          onKeyDown={(e) => {
            if (e.key === "Escape") setShowConfirmModal(false);
          }}
        >
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="confirm-send-title"
            className="modal max-w-md p-5 space-y-4"
          >
            <div className="flex items-center gap-3">
              <Image
                src="/cncp-white.png"
                alt="CNCP"
                width={47}
                height={36}
                className="logo-chip h-9 w-auto"
              />
              <h3 id="confirm-send-title" className="text-base font-semibold">Confirm send</h3>
            </div>
            <p className="text-sm text-muted">
              You are using the <strong className="font-semibold text-foreground">{SENDER_LABEL}</strong> sender identity
              to send {recipients.length} email{recipients.length !== 1 ? "s" : ""}. Are you sure you want to proceed?
            </p>
            {invalidUsed.length > 0 && (
              <div className="notice notice-danger">
                Unknown variables will send blank: {invalidUsed.join(", ")}.
              </div>
            )}
            <div className="flex justify-end gap-2 pt-1">
              <button
                autoFocus
                onClick={() => setShowConfirmModal(false)}
                className="btn"
                disabled={isSending}
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  setShowConfirmModal(false);
                  await doSendEmails();
                }}
                className="btn btn-primary"
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
