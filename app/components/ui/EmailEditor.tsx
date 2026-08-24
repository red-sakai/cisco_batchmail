"use client";

import {
  useEffect,
  useRef,
  forwardRef,
  useImperativeHandle,
  useState,
} from "react";
import createDOMPurify from "dompurify";

type Props = {
  value: string;
  onChange: (html: string) => void;
  // variables prop retained for potential future inline usage, but variable insertion
  // is now centralized in the parent (PreviewPane) to avoid toolbar overflow.
  variables?: string[];
};

type DomPurifyInstance = ReturnType<typeof createDOMPurify>;

let domPurifyInstance: DomPurifyInstance | null = null;
const getPurifier = () => {
  if (domPurifyInstance) return domPurifyInstance;
  if (typeof window === "undefined") return null;
  domPurifyInstance = createDOMPurify(window);
  return domPurifyInstance;
};

const sanitize = (html: string) => {
  const purify = getPurifier();
  if (!purify) return html;
  return purify.sanitize(html, { USE_PROFILES: { html: true } });
};

const MAX_HISTORY = 50;
const HISTORY_DEBOUNCE_MS = 600;

export type EmailEditorHandle = {
  insertVariable: (name: string) => void;
  focus: () => void;
};

function EmailEditorInner(
  { value, onChange }: Props,
  refForward: React.Ref<EmailEditorHandle>
) {
  const ref = useRef<HTMLDivElement | null>(null);
  const initialClean = sanitize(value);
  const historyRef = useRef<string[]>([initialClean]);
  const historyIndexRef = useRef<number>(0);
  const skipHistorySyncRef = useRef(false);
  const pendingHistoryRef = useRef<string | null>(null);
  const historyTimerRef = useRef<number | null>(null);
  const [historyState, setHistoryState] = useState({
    canUndo: false,
    canRedo: false,
  });

  useEffect(() => {
    return () => {
      if (historyTimerRef.current) {
        window.clearTimeout(historyTimerRef.current);
      }
    };
  }, []);

  const clearHistoryTimer = () => {
    if (historyTimerRef.current) {
      window.clearTimeout(historyTimerRef.current);
      historyTimerRef.current = null;
    }
  };

  const syncHistoryFlags = (index: number) => {
    const history = historyRef.current;
    setHistoryState({
      canUndo: index > 0,
      canRedo: index >= 0 && index < history.length - 1,
    });
  };

  const pushHistoryEntry = (html: string) => {
    const history = historyRef.current;
    const idx = historyIndexRef.current;
    if (idx >= 0 && history[idx] === html) return;
    const trimmed = history.slice(0, idx + 1);
    trimmed.push(html);
    while (trimmed.length > MAX_HISTORY) trimmed.shift();
    historyRef.current = trimmed;
    historyIndexRef.current = trimmed.length - 1;
    syncHistoryFlags(historyIndexRef.current);
  };

  const applyHistoryIndex = (nextIdx: number) => {
    const history = historyRef.current;
    if (nextIdx < 0 || nextIdx >= history.length) return;
    historyIndexRef.current = nextIdx;
    const html = history[nextIdx];
    if (ref.current && ref.current.innerHTML !== html) {
      ref.current.innerHTML = html;
    }
    pendingHistoryRef.current = null;
    clearHistoryTimer();
    skipHistorySyncRef.current = true;
    onChange(html);
    syncHistoryFlags(nextIdx);
    ref.current?.focus();
  };

  const undo = () => applyHistoryIndex(historyIndexRef.current - 1);
  const redo = () => applyHistoryIndex(historyIndexRef.current + 1);

  // Keep the editor content in sync only when the external value changes.
  useEffect(() => {
    if (!ref.current) return;
    const clean = sanitize(value);
    if (ref.current.innerHTML !== clean) {
      ref.current.innerHTML = clean;
      syncAnchorHrefs(ref.current);
    }
    if (skipHistorySyncRef.current) {
      skipHistorySyncRef.current = false;
      return;
    }
    clearHistoryTimer();
    pendingHistoryRef.current = null;
    historyRef.current = [clean];
    historyIndexRef.current = 0;
    queueMicrotask(() => syncHistoryFlags(0));
  }, [value]);

  const scheduleHistoryEntry = (clean: string, immediate?: boolean) => {
    if (immediate) {
      pendingHistoryRef.current = null;
      clearHistoryTimer();
      pushHistoryEntry(clean);
      return;
    }
    pendingHistoryRef.current = clean;
    clearHistoryTimer();
    historyTimerRef.current = window.setTimeout(() => {
      if (pendingHistoryRef.current != null) {
        pushHistoryEntry(pendingHistoryRef.current);
        pendingHistoryRef.current = null;
      }
      historyTimerRef.current = null;
    }, HISTORY_DEBOUNCE_MS);
  };

  const notify = (opts?: { immediate?: boolean }) => {
    if (!ref.current) return;
    syncAnchorHrefs(ref.current);
    const html = ref.current.innerHTML;
    const clean = sanitize(html);
    // Don't force innerHTML here to avoid caret jumps; trust user typing.
    scheduleHistoryEntry(clean, opts?.immediate);
    skipHistorySyncRef.current = true;
    onChange(clean);
  };

  const exec = (cmd: string, arg?: string) => {
    document.execCommand(cmd, false, arg);
    notify({ immediate: true });
  };

  const insertVariable = (name: string) => {
    const token = `{{ ${name} }}`;
    document.execCommand(
      "insertHTML",
      false,
      `<span data-var="${name}" style="background:#f3f4f6;border:1px dashed #9ca3af;padding:0 2px;border-radius:3px;">${token}</span>`
    );
    notify({ immediate: true });
  };

  const focus = () => {
    ref.current?.focus();
  };

  useImperativeHandle(refForward, () => ({ insertVariable, focus }));

  return (
    <div className="space-y-2">
      {/* Formatting toolbar only; variable insertion controlled externally to prevent overflow */}
      <div className="flex gap-2 pb-1 overflow-x-auto max-w-full editor-toolbar">
        <div className="inline-flex items-center gap-1 shrink-0">
          <button
            type="button"
            className="px-2 py-1 border rounded text-xs disabled:opacity-50"
            onClick={undo}
            disabled={!historyState.canUndo}
            title="Undo (Ctrl+Z)"
          >
            Undo
          </button>
          <button
            type="button"
            className="px-2 py-1 border rounded text-xs disabled:opacity-50"
            onClick={redo}
            disabled={!historyState.canRedo}
            title="Redo (Ctrl+Shift+Z)"
          >
            Redo
          </button>
        </div>
        <div className="inline-flex items-center gap-1 shrink-0">
          <button
            type="button"
            className="px-2 py-1 border rounded text-xs"
            onClick={() => exec("bold")}
          >
            Bold
          </button>
          <button
            type="button"
            className="px-2 py-1 border rounded text-xs"
            onClick={() => exec("italic")}
          >
            Italic
          </button>
          <button
            type="button"
            className="px-2 py-1 border rounded text-xs"
            onClick={() => exec("underline")}
          >
            Underline
          </button>
          <button
            type="button"
            className="px-2 py-1 border rounded text-xs"
            onClick={() => exec("insertUnorderedList")}
          >
            • List
          </button>
          <button
            type="button"
            className="px-2 py-1 border rounded text-xs"
            onClick={() => exec("insertOrderedList")}
          >
            1. List
          </button>
        </div>
      </div>

      <div
        ref={ref}
        className="email-editor-surface min-h-40 w-full border rounded p-3 bg-white text-sm"
        contentEditable
        suppressContentEditableWarning
        onInput={() => notify()}
        onBlur={() => notify({ immediate: true })}
      />
    </div>
  );
}

const EmailEditor = forwardRef<EmailEditorHandle, Props>(EmailEditorInner);
export default EmailEditor;

const syncAnchorHrefs = (root: HTMLElement) => {
  const anchors = root.querySelectorAll<HTMLAnchorElement>("a");
  anchors.forEach((anchor) => {
    const text = anchor.textContent?.trim();
    if (!text) return;
    const normalized = text.replace(/\s+/g, " ");
    const href = anchor.getAttribute("href") || "";
    const nextHref = deriveHref(normalized);
    if (nextHref && nextHref !== href) {
      anchor.setAttribute("href", nextHref);
    }
  });
};

const deriveHref = (value: string) => {
  if (/^https?:\/\//i.test(value)) return value;
  if (/^mailto:/i.test(value)) return value;
  if (/^www\./i.test(value)) return `https://${value}`;
  if (/^[\w.-]+@[\w.-]+\.[A-Za-z]{2,}$/i.test(value)) return `mailto:${value}`;
  return null;
};
