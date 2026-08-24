"use client";

import { useState, useEffect, ReactNode } from "react";

export type TabItem = {
  id: string;
  label: string;
  description?: string;
  content: ReactNode;
};

type Props = {
  items: TabItem[];
  initialId?: string;
  onChange?: (id: string) => void;
  // Optional: determine if a step is locked
  isDisabled?: (id: string) => boolean;
  // Optional: tooltip/reason for locked steps
  getDisabledTitle?: (id: string) => string | undefined;
  // Optional: mark a step as completed (shows a checkmark)
  isComplete?: (id: string) => boolean;
};

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="currentColor"
      className={className ?? "h-3.5 w-3.5"}
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5" aria-hidden="true">
      <path
        fillRule="evenodd"
        d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z"
        clipRule="evenodd"
      />
    </svg>
  );
}

export default function Tabs({
  items,
  initialId,
  onChange,
  isDisabled,
  getDisabledTitle,
  isComplete,
}: Props) {
  const fallbackFirst = () => {
    const firstEnabled = items.find((it) => !(isDisabled?.(it.id) ?? false));
    return firstEnabled?.id || items[0]?.id;
  };
  const [active, setActive] = useState<string>(initialId || fallbackFirst());
  const [blockedMsg, setBlockedMsg] = useState<string | null>(null);

  useEffect(() => {
    // Only initialize once from initialId if provided and active not set
    if (initialId && !active) {
      const disabled = isDisabled?.(initialId) ?? false;
      setActive(disabled ? fallbackFirst() : initialId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const activate = (id: string) => {
    if (isDisabled?.(id)) {
      const msg = getDisabledTitle?.(id) || "This step is currently locked";
      setBlockedMsg(msg);
      // auto-clear after a few seconds
      setTimeout(() => setBlockedMsg((current) => (current === msg ? null : current)), 4000);
      return;
    }
    setActive(id);
    onChange?.(id);
  };

  return (
    <div className="w-full">
      <ol
        role="tablist"
        aria-label="Main steps"
        className="flex items-stretch gap-1 mb-4 overflow-x-auto pb-1"
      >
        {items.map((t, i) => {
          const selected = t.id === active;
          const disabled = isDisabled?.(t.id) ?? false;
          const complete = !disabled && (isComplete?.(t.id) ?? false);
          const subtext = disabled
            ? "Locked"
            : complete && !selected
            ? "Done"
            : t.description || undefined;

          return (
            <li key={t.id} className="flex items-center min-w-0">
              <button
                role="tab"
                aria-selected={selected}
                aria-controls={`panel-${t.id}`}
                onClick={() => activate(t.id)}
                aria-disabled={disabled}
                title={
                  disabled
                    ? getDisabledTitle?.(t.id) || "This step is currently locked"
                    : undefined
                }
                className={`group flex items-center gap-2.5 rounded-lg px-3 py-2 text-left transition border ${
                  selected
                    ? "border-[#0d274d] bg-[#0d274d] shadow-sm"
                    : "border-transparent hover:bg-gray-50"
                } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
              >
                <span
                  className={`flex h-7 w-7 flex-none items-center justify-center rounded-full text-xs font-semibold transition ${
                    complete || selected
                      ? "bg-[#049fd9] text-white"
                      : "border border-gray-300 bg-white text-gray-500 group-hover:border-[#049fd9]/50"
                  }`}
                  aria-hidden="true"
                >
                  {disabled ? <LockIcon /> : i + 1}
                </span>
                <span className="min-w-0 leading-tight">
                  <span className="flex items-center gap-1 min-w-0">
                    <span
                      className={`truncate text-sm font-semibold ${
                        selected ? "text-white" : "text-gray-700"
                      }`}
                    >
                      {t.label}
                    </span>
                    {complete && (
                      <CheckIcon
                        className={`h-3.5 w-3.5 flex-none ${
                          selected ? "text-[#7dd3fc]" : "text-[#049fd9]"
                        }`}
                      />
                    )}
                  </span>
                  {subtext && (
                    <span
                      className={`block truncate text-[11px] ${
                        selected ? "text-[#c9e8f8]" : "text-gray-500"
                      }`}
                    >
                      {subtext}
                    </span>
                  )}
                </span>
              </button>
              {i < items.length - 1 && (
                <span
                  aria-hidden="true"
                  className={`mx-1 h-px w-6 flex-none sm:w-10 ${
                    complete ? "bg-[#049fd9]/60" : "bg-gray-200"
                  }`}
                />
              )}
            </li>
          );
        })}
      </ol>
      {blockedMsg && (
        <div
          role="status"
          className="mb-3 text-xs px-3 py-2 rounded border border-yellow-200 bg-yellow-50 text-yellow-900"
        >
          {blockedMsg}
        </div>
      )}
      {items.map((t) => (
        <div
          key={t.id}
          role="tabpanel"
          id={`panel-${t.id}`}
          aria-labelledby={t.id}
          hidden={t.id !== active}
          className="focus:outline-none"
        >
          {t.content}
        </div>
      ))}
    </div>
  );
}
