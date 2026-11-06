"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { KeyboardEvent, Dispatch, SetStateAction } from "react";
import { getTemplateAction, listTemplatesAction } from "@/app/actions/templates";
import EmailEditor, { EmailEditorHandle } from "./EmailEditor";
import VariablePicker from "./VariablePicker";
import Icon from "./Icon";

type SavedTemplate = {
  id: string;
  name: string;
  html: string;
  updatedAt: number;
};

const LS_KEY = "batchmail.templates.v1";

function loadTemplates(fallback: SavedTemplate[]): SavedTemplate[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return fallback;
    const arr = JSON.parse(raw) as SavedTemplate[];
    if (!Array.isArray(arr)) return fallback;
    return arr;
  } catch {
    return fallback;
  }
}

function saveTemplates(arr: SavedTemplate[]) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(arr));
  } catch {}
}

function uuid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36).slice(4);
}

type Props = {
  availableVars?: string[];
  initialHtml: string;
  onUseTemplate: (t: { html: string }) => void;
};

export default function TemplateLibrary({
  availableVars = [],
  initialHtml,
  onUseTemplate,
}: Props) {
  const seed: SavedTemplate[] = [
    { id: uuid(), name: "Untitled", html: initialHtml || "", updatedAt: 0 },
  ];
  const [templates, setTemplates] = useState<SavedTemplate[]>(() =>
    loadTemplates(seed)
  );
  const [activeId, setActiveId] = useState<string>(
    () => loadTemplates(seed)[0]?.id
  );
  const [serverTemplates, setServerTemplates] = useState<string[]>([]);
  const active = templates.find((t) => t.id === activeId) || templates[0];
  const [rawMode, setRawMode] = useState(false);
  const [rawZoom, setRawZoom] = useState(1);
  const editorRef = useRef<EmailEditorHandle | null>(null);
  const rawTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [applied, setApplied] = useState<boolean>(false);

  // Persist on changes
  useEffect(() => {
    saveTemplates(templates);
  }, [templates]);

  useEffect(() => {
    let mounted = true;
    listTemplatesAction()
      .then((files) => {
        if (mounted) setServerTemplates(files);
      })
      .catch(console.error);
    return () => {
      mounted = false;
    };
  }, []);

  const onSelectTemplate = async (filename: string) => {
    try {
      const res = await getTemplateAction(filename);
      if (!res.ok) throw new Error(res.error || "Failed to load template");
      const { html } = res;
      const t: SavedTemplate = {
        id: uuid(),
        name: filename.replace(/\.html$/, ""),
        html,
        updatedAt: Date.now(),
      };
      setTemplates((prev) => [t, ...prev]);
      setActiveId(t.id);
    } catch (error) {
      console.error("Failed to load template", error);
      alert("Failed to load template");
    }
  };

  const available = useMemo(
    () => Array.from(new Set(availableVars)),
    [availableVars]
  );

  const updateActive = (patch: Partial<SavedTemplate>) => {
    setTemplates((prev) =>
      prev.map((t) =>
        t.id === active.id ? { ...t, ...patch, updatedAt: Date.now() } : t
      )
    );
  };

  const addTemplate = () => {
    const t: SavedTemplate = {
      id: uuid(),
      name: "New template",
      html: "",
      updatedAt: Date.now(),
    };
    setTemplates((prev) => [t, ...prev]);
    setActiveId(t.id);
  };

  const saveAsNew = () => {
    const clone: SavedTemplate = {
      id: uuid(),
      name: `${active.name} (copy)`,
      html: active.html,
      updatedAt: Date.now(),
    };
    setTemplates((prev) => [clone, ...prev]);
    setActiveId(clone.id);
  };

  const deleteTemplate = (id: string) => {
    setTemplates((prev) => {
      const filtered = prev.filter((t) => t.id !== id);
      if (filtered.length === 0) {
        // Always keep at least one blank template
        const fallback: SavedTemplate = {
          id: uuid(),
          name: "Untitled",
          html: "",
          updatedAt: Date.now(),
        };
        setActiveId(fallback.id);
        return [fallback];
      }
      // Reset active if we deleted current
      if (id === activeId) setActiveId(filtered[0].id);
      return filtered;
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
      {/* Sidebar */}
      <div className="card lg:col-span-1 overflow-hidden lg:sticky lg:top-20">
        <div className="px-3 py-2 border-b border-line flex items-center justify-between">
          <div className="text-sm font-semibold">Templates</div>
          <button
            type="button"
            aria-label="New template"
            title="New template"
            className="btn btn-sm btn-icon"
            onClick={addTemplate}
          >
            <Icon name="plus" />
          </button>
        </div>
        <div className="max-h-96 overflow-auto text-sm">
          {serverTemplates.map((filename) => (
            <div
              key={filename}
              className="group flex items-center justify-between gap-2 px-3 py-2 border-b border-line transition-colors hover:bg-surface-2"
            >
              <button
                onClick={() => onSelectTemplate(filename)}
                className="flex-1 min-w-0 text-left"
              >
                <div className="font-medium truncate">
                  {filename.replace(/\.html$/, "")}
                </div>
                <div className="text-xs text-subtle truncate">
                  Click to load a copy
                </div>
              </button>
            </div>
          ))}
          {templates.map((t) => (
            <div
              key={t.id}
              className={`group flex items-center justify-between gap-2 px-3 py-2 border-b border-line last:border-b-0 transition-colors ${
                t.id === active.id ? "bg-accent-soft" : "hover:bg-surface-2"
              }`}
            >
              <button
                onClick={() => setActiveId(t.id)}
                aria-current={t.id === active.id}
                className="flex-1 min-w-0 text-left"
              >
                <div className={`font-medium truncate ${t.id === active.id ? "text-accent-ink" : ""}`}>
                  {t.name || "Untitled"}
                </div>
                <div className="text-xs text-subtle truncate">
                  Saved in this browser
                </div>
              </button>
              {templates.length > 1 && (
                <button
                  type="button"
                  aria-label={`Delete template ${t.name || "Untitled"}`}
                  onClick={() => deleteTemplate(t.id)}
                  className="btn btn-sm btn-danger"
                >
                  Delete
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Editor */}
      <div className="card lg:col-span-2 p-4 sm:p-5 space-y-4">
        {applied && (
          <div className="notice notice-accent flex flex-wrap items-center justify-between gap-2 !text-sm">
            <span>
              Template applied. You can head to the{" "}
              <strong className="font-semibold">Review &amp; Send</strong> tab to review and send.
            </span>
            <button
              type="button"
              className="btn btn-sm"
              onClick={() =>
                document
                  .querySelector<HTMLButtonElement>('[role="tab"][aria-controls="panel-preview"]')
                  ?.click()
              }
            >
              Go to Review &amp; Send
            </button>
          </div>
        )}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-0.5">
            <div className="text-lg font-semibold">Template Editor</div>
            <div className="text-xs text-subtle">Autosave enabled</div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              className="btn"
              onClick={() =>
                setRawMode((v) => {
                  const next = !v;
                  if (!v) {
                    const formatted = formatHtml(active.html);
                    if (formatted && formatted !== active.html) {
                      updateActive({ html: formatted });
                    }
                  }
                  if (v) {
                    setRawZoom(1);
                  }
                  return next;
                })
              }
            >
              {rawMode ? "WYSIWYG" : "Edit HTML"}
            </button>
            <button
              onClick={saveAsNew}
              className="btn"
            >
              Save as new Template
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                onUseTemplate({ html: active.html });
                setApplied(true);
                window.setTimeout(() => setApplied(false), 4000);
              }}
            >
              Use this template
            </button>
          </div>
        </div>

        <label className="block space-y-1.5">
          <span className="block text-sm font-medium">Template Name</span>
          <input
            value={active.name}
            onChange={(e) => updateActive({ name: e.target.value })}
            className="input w-full"
            placeholder="Enter a name"
          />
        </label>

        {/* Upload HTML file */}
        <div className="space-y-1.5" id="tutorial-upload-html">
          <div className="text-sm font-medium">Upload HTML Template</div>
          <label className="btn w-fit">
            <input
              type="file"
              accept=".html,.htm,.txt"
              className="sr-only"
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                const text = await f.text();
                updateActive({ html: text });
              }}
            />
            <Icon name="upload" />
            <span>Choose file…</span>
          </label>
        </div>

        <div className="space-y-2" id="tutorial-email-message">
          <div className="text-sm font-medium flex items-center justify-between">
            <span>Email Message</span>
            <div id="tutorial-insert-variable">
              <VariablePicker
                variables={available}
                label="Insert Variable"
                onInsert={(v) => {
                  editorRef.current?.insertVariable(v);
                  editorRef.current?.focus();
                }}
              />
            </div>
          </div>
          {!rawMode ? (
            <EmailEditor
              ref={editorRef}
              value={active.html}
              onChange={(html) => updateActive({ html })}
            />
          ) : (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs text-muted">
                <span>Zoom</span>
                <div className="inline-flex items-center gap-1">
                  <button
                    type="button"
                    aria-label="Zoom out"
                    onClick={() => adjustRawZoom(-0.1, setRawZoom)}
                    className="btn btn-sm btn-icon"
                    disabled={rawZoom <= RAW_ZOOM_MIN}
                  >
                    -
                  </button>
                  <span className="w-12 text-center tabular-nums">
                    {(rawZoom * 100).toFixed(0)}%
                  </span>
                  <button
                    type="button"
                    aria-label="Zoom in"
                    onClick={() => adjustRawZoom(0.1, setRawZoom)}
                    className="btn btn-sm btn-icon"
                    disabled={rawZoom >= RAW_ZOOM_MAX}
                  >
                    +
                  </button>
                  <button
                    type="button"
                    onClick={() => setRawZoom(1)}
                    className="btn btn-sm ml-1"
                    disabled={Math.abs(rawZoom - 1) < 0.05}
                  >
                    Reset
                  </button>
                </div>
              </div>
              <div className="relative">
              <textarea
                ref={rawTextareaRef}
                aria-label="Email HTML source"
                value={active.html}
                onChange={(e) => updateActive({ html: e.target.value })}
                onKeyDown={(e) => handleRawKeyDown(e, active.html, updateActive)}
                rows={22}
                spellCheck={false}
                  className="code-editor w-full min-h-[26rem] px-4 py-4"
                  style={{
                    fontSize: `${(rawZoom * BASE_RAW_FONT_SIZE).toFixed(2)}px`,
                    lineHeight: `${(rawZoom * BASE_RAW_LINE_HEIGHT).toFixed(2)}px`,
                  }}
              />
              <div className="pointer-events-none absolute top-2 right-3 text-[11px] uppercase tracking-wide text-[#a99bcb]">
                HTML
              </div>
              </div>
            </div>
          )}
          {/* Actions moved to header for visibility */}
        </div>
      </div>
    </div>
  );
}

const BASE_RAW_FONT_SIZE = 14;
const BASE_RAW_LINE_HEIGHT = 22;
const RAW_ZOOM_MIN = 0.7;
const RAW_ZOOM_MAX = 1.6;

const VOID_TAGS = new Set([
  "area",
  "base",
  "br",
  "col",
  "embed",
  "hr",
  "img",
  "input",
  "link",
  "meta",
  "param",
  "source",
  "track",
  "wbr",
]);

function formatHtml(input: string) {
  const raw = input ?? "";
  if (!raw.trim()) return raw;
  try {
    const tokens = raw
      .replace(/>\s+</g, "><")
      .split(/(<[^>]+>)/g)
      .map((token) => token)
      .filter((token) => token && token.trim().length > 0);
    let depth = 0;
    const lines: string[] = [];
    tokens.forEach((token) => {
      const trimmed = token.trim();
      const isTag = trimmed.startsWith("<") && trimmed.endsWith(">");
      if (!isTag) {
        lines.push(`${"  ".repeat(depth)}${trimmed}`);
        return;
      }
      const isComment = trimmed.startsWith("<!--");
      const closing = /^<\//.test(trimmed);
      const tagMatch = trimmed.match(/^<\/?\s*([^\s>/]+)/);
      const tagName = tagMatch?.[1]?.toLowerCase() ?? "";
      const selfClosing = /\/>$/.test(trimmed) || VOID_TAGS.has(tagName);
      if (closing && !selfClosing) {
        depth = Math.max(depth - 1, 0);
      }
      lines.push(`${"  ".repeat(depth)}${trimmed}`);
      if (!closing && !selfClosing && !isComment) {
        depth += 1;
      }
    });
    return lines.join("\n");
  } catch {
    return raw;
  }
}

function handleRawKeyDown(
  e: KeyboardEvent<HTMLTextAreaElement>,
  currentValue: string,
  update: (patch: Partial<SavedTemplate>) => void
) {
  if (e.key !== "Tab") return;
  e.preventDefault();
  const textarea = e.currentTarget;
  const start = textarea.selectionStart ?? 0;
  const end = textarea.selectionEnd ?? 0;
  const insert = "  ";
  let nextValue = currentValue;
  let caret = start;
  if (e.shiftKey) {
    const before = currentValue.slice(0, start);
    if (before.endsWith(insert)) {
      const newStart = start - insert.length;
      nextValue =
        currentValue.slice(0, newStart) + currentValue.slice(end);
      caret = newStart;
    }
  } else {
    nextValue =
      currentValue.slice(0, start) + insert + currentValue.slice(end);
    caret = start + insert.length;
  }
  if (nextValue === currentValue) return;
  update({ html: nextValue });
  requestAnimationFrame(() => {
    textarea.selectionStart = caret;
    textarea.selectionEnd = caret;
  });
}

function adjustRawZoom(
  delta: number,
  setZoom: Dispatch<SetStateAction<number>>
) {
  setZoom((prev) => {
    const next = Math.min(
      RAW_ZOOM_MAX,
      Math.max(RAW_ZOOM_MIN, parseFloat((prev + delta).toFixed(2)))
    );
    return next;
  });
}
