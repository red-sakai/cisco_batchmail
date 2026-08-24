"use server";

import { normalizeNameKey } from "@/lib/normalizeName";
import nodemailer from "nodemailer";
import nunjucks from "nunjucks";
import { DEFAULT_VARIANT, getEnvForVariant } from "@/lib/envStore";
import { isAuthenticated } from "@/lib/auth";

type Mapping = { recipient: string; name: string; subject?: string | null };
export type Row = Record<string, string>;
export type SendPayload = {
  rows: Row[];
  mapping: Mapping;
  template: string;
  subjectTemplate?: string;
  attachmentsByName?: Record<
    string,
    Array<{ filename: string; contentBase64: string; contentType?: string }>
  >;
  delayMs?: number;
  jitterMs?: number;
};

export type SendItem = {
  to: string;
  status: "sent" | "error";
  subject?: string;
  error?: string;
  messageId?: string;
  response?: string;
  accepted?: string[];
  rejected?: string[];
  attachments?: number;
  timestamp?: string;
};

function renderTemplate(
  html: string,
  subject: string | undefined,
  row: Record<string, string>,
  mapping: Mapping
) {
  const ctx: Record<string, unknown> = {
    ...row,
    name: row[mapping.name],
    recipient: row[mapping.recipient],
  };
  let body = html;
  let subj = subject;
  try {
    body = nunjucks.renderString(html, ctx);
  } catch {}
  if (subject) {
    try {
      subj = nunjucks.renderString(subject, ctx);
    } catch {}
  } else if (mapping.subject && row[mapping.subject]) {
    subj = String(row[mapping.subject]);
  }
  return { body, subj: subj || "" };
}

export async function sendBatchAction(payload: SendPayload) {
  if (!(await isAuthenticated())) {
    return { ok: false, error: "Unauthorized — please sign in again." } as const;
  }

  const {
    rows,
    mapping,
    template,
    subjectTemplate,
    attachmentsByName,
    delayMs,
    jitterMs,
  } = (payload || {}) as SendPayload;

  if (!rows || !Array.isArray(rows) || !mapping || !template) {
    return { ok: false, error: "Missing required fields" } as const;
  }

  const override = getEnvForVariant(DEFAULT_VARIANT);
  const SENDER_EMAIL = override.SENDER_EMAIL || process.env.SENDER_EMAIL;
  const SENDER_APP_PASSWORD =
    override.SENDER_APP_PASSWORD || process.env.SENDER_APP_PASSWORD;
  const SENDER_NAME = override.SENDER_NAME || process.env.SENDER_NAME || SENDER_EMAIL;

  if (!SENDER_EMAIL || !SENDER_APP_PASSWORD) {
    return { ok: false, error: "Sender env vars missing" } as const;
  }

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user: SENDER_EMAIL, pass: SENDER_APP_PASSWORD },
  });
  const sendWithFallback = async (message: nodemailer.SendMailOptions) =>
    transporter.sendMail(message);

  const filtered = rows.filter((r) => r[mapping.recipient]);
  const items: SendItem[] = [];
  let sent = 0;
  let failed = 0;
  const delay = typeof delayMs === "number" && delayMs > 0 ? delayMs : 2000;
  const jitter = typeof jitterMs === "number" && jitterMs >= 0 ? Math.floor(jitterMs) : 250;

  for (let index = 0; index < filtered.length; index += 1) {
    const r = filtered[index];
    const { body, subj } = renderTemplate(template, subjectTemplate, r, mapping);
    const nameKey = normalizeNameKey(r[mapping.name] || "");
    const atts = nameKey && attachmentsByName ? attachmentsByName[nameKey] || [] : [];

    try {
      const info = await sendWithFallback({
        from: `${SENDER_NAME} <${SENDER_EMAIL}>`,
        to: r[mapping.recipient],
        subject: subj,
        html: body,
        attachments: atts.map((a) => ({
          filename: a.filename,
          content: a.contentBase64,
          encoding: "base64",
          contentType: a.contentType,
        })),
      });
      sent++;
      items.push({
        to: r[mapping.recipient],
        status: "sent",
        subject: subj,
        messageId: info.messageId,
        response: info.response,
        accepted: Array.isArray(info.accepted)
          ? info.accepted.map((v) => String(v))
          : undefined,
        rejected: Array.isArray(info.rejected)
          ? info.rejected.map((v) => String(v))
          : undefined,
        attachments: atts.length,
        timestamp: new Date().toISOString(),
      });
    } catch (e) {
      failed++;
      items.push({
        to: r[mapping.recipient],
        status: "error",
        subject: subj,
        error: (e as Error).message,
        attachments: atts.length,
        timestamp: new Date().toISOString(),
      });
    }

    if (delay > 0 && index < filtered.length - 1) {
      const jitterOffset =
        jitter > 0 ? Math.floor((Math.random() * 2 - 1) * jitter) : 0;
      const wait = Math.max(0, delay + jitterOffset);
      await new Promise((res) => setTimeout(res, wait));
    }
  }

  return {
    ok: failed === 0,
    sent,
    failed,
    items,
  } as const;
}
