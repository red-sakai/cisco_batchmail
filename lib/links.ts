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
