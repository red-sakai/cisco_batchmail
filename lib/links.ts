export const deriveHref = (value: string): string | null => {
  const text = value.trim();
  if (!text) return null;
  if (/^https?:\/\//i.test(text)) return text;
  if (/^mailto:/i.test(text)) return text;
  if (/^www\./i.test(text)) return `https://${text}`;
  if (/^[\w.-]+@[\w.-]+\.[A-Za-z]{2,}$/i.test(text)) return `mailto:${text}`;
  return null;
};

// Lenient variant used only for cells inside a column already detected as a
// link column, so bare domains like "cisco.com/events" still become clickable.
export const deriveColumnHref = (value: string): string | null => {
  const strict = deriveHref(value);
  if (strict) return strict;
  const text = value.trim();
  if (!text || /\s/.test(text)) return null;
  if (/^[a-z0-9-]+(\.[a-z0-9-]+)+(:\d+)?([/?#][^\s]*)?$/i.test(text)) {
    return `https://${text}`;
  }
  return null;
};

const LINK_HEADER_RE =
  /(^|[^a-z])(hyperlinks?|links?|urls?|web ?sites?|hrefs?|web)([^a-z]|$)/i;

const isWebUrl = (value: string) => {
  const href = deriveHref(value);
  return !!href && !href.startsWith("mailto:");
};

// A column counts as a link column when its header looks like a URL, its
// header names a link (Link, URL, Website, ...), or most of its values are URLs.
export const isLinkColumn = (header: string, values: string[]): boolean => {
  const name = header.trim();
  if (deriveHref(name)) return true;
  if (LINK_HEADER_RE.test(name)) return true;
  const nonEmpty = values.filter((v) => v && v.trim());
  if (nonEmpty.length === 0) return false;
  const urlCount = nonEmpty.filter(isWebUrl).length;
  return urlCount / nonEmpty.length >= 0.6;
};

const SKIP_LINKIFY_ELEMENTS = new Set([
  "script",
  "style",
  "head",
  "title",
  "textarea",
  "noscript",
]);

const URL_IN_TEXT = /\b(?:https?:\/\/|www\.)[^\s<>"']+/gi;

const decodeAmp = (s: string) => s.replace(/&amp;/gi, "&");
const escapeAttr = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
const escapeText = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const linkifyTextSegment = (text: string): string => {
  if (!/\b(?:https?:\/\/|www\.)/i.test(text)) return text;
  return text.replace(URL_IN_TEXT, (match) => {
    const decoded = decodeAmp(match);
    let url = decoded.replace(/[.,;:!?'"]+$/, "");
    while (url.endsWith(")")) {
      const opens = url.split("(").length - 1;
      const closes = url.split(")").length - 1;
      if (closes <= opens) break;
      url = url.slice(0, -1);
    }
    const href = deriveHref(url);
    if (!href) return match;
    const tail = decoded.slice(url.length);
    return `<a href="${escapeAttr(href)}" target="_blank" rel="noopener noreferrer">${escapeText(url)}</a>${escapeText(tail)}`;
  });
};

const findTagEnd = (html: string, start: number): number => {
  let quote: string | null = null;
  for (let i = start + 1; i < html.length; i++) {
    const ch = html[i];
    if (quote) {
      if (ch === quote) quote = null;
    } else if (ch === '"' || ch === "'") {
      quote = ch;
    } else if (ch === ">") {
      return i;
    }
  }
  return html.length - 1;
};

// Wraps bare URLs in the rendered HTML with <a> tags. Only text between tags
// is touched, so href attributes, existing links, and <style>/<script> blocks
// are left alone. Used after nunjucks rendering so {{ link }} values in CSV
// columns become clickable in previews and sent emails.
export const autoLinkifyHtml = (html: string): string => {
  if (!html || !/\b(?:https?:\/\/|www\.)/i.test(html)) return html;
  const lower = html.toLowerCase();
  let out = "";
  let i = 0;
  let anchorDepth = 0;
  while (i < html.length) {
    const lt = html.indexOf("<", i);
    if (lt === -1) {
      const tail = html.slice(i);
      out += anchorDepth === 0 ? linkifyTextSegment(tail) : tail;
      break;
    }
    const segment = html.slice(i, lt);
    out += anchorDepth === 0 ? linkifyTextSegment(segment) : segment;
    const end = findTagEnd(html, lt);
    const tag = html.slice(lt, end + 1);
    out += tag;
    i = end + 1;
    const m = /^<\s*(\/?)([a-zA-Z0-9-]+)/.exec(tag);
    if (!m) continue;
    const closing = m[1] === "/";
    const name = m[2].toLowerCase();
    if (name === "a") {
      anchorDepth = Math.max(0, anchorDepth + (closing ? -1 : 1));
    } else if (!closing && SKIP_LINKIFY_ELEMENTS.has(name)) {
      const closeIdx = lower.indexOf(`</${name}`, i);
      if (closeIdx !== -1) {
        const closeEnd = html.indexOf(">", closeIdx);
        const stop = closeEnd === -1 ? html.length : closeEnd + 1;
        out += html.slice(i, stop);
        i = stop;
      }
    }
  }
  return out;
};
