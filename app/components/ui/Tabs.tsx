"use client";

import { useState, useEffect, useLayoutEffect, useRef, ReactNode } from "react";
import Icon from "./Icon";

export type TabItem = {
  id: string;
  label: string;
  description?: string;
  // Not part of the numbered sequence: sits apart at the end of the rail
  aside?: boolean;
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
  const listRef = useRef<HTMLOListElement | null>(null);
  const indicatorRef = useRef<HTMLLIElement | null>(null);

  useEffect(() => {
    // Only initialize once from initialId if provided and active not set
    if (initialId && !active) {
      const disabled = isDisabled?.(initialId) ?? false;
      setActive(disabled ? fallbackFirst() : initialId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // No dependency array: tab widths change with their subtext, not just `active`.
  useLayoutEffect(() => {
    const place = () => {
      const tab = listRef.current?.querySelector<HTMLElement>('[aria-selected="true"]');
      if (!tab || !indicatorRef.current) return;
      indicatorRef.current.style.width = `${tab.offsetWidth}px`;
      indicatorRef.current.style.transform = `translateX(${tab.offsetLeft}px)`;
    };
    place();
    window.addEventListener("resize", place);
    return () => window.removeEventListener("resize", place);
  });

  // On narrow screens the rail scrolls sideways, so keep the current step in view.
  useEffect(() => {
    const tab = listRef.current?.querySelector<HTMLElement>('[aria-selected="true"]');
    if (!tab) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    listRef.current?.scrollTo({ left: tab.offsetLeft - 16, behavior: reduced ? "auto" : "smooth" });
  }, [active]);

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
      <ol ref={listRef} role="tablist" aria-label="Main steps" className="rail mb-4">
        <li ref={indicatorRef} role="presentation" className="rail-indicator" />
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
            <li key={t.id} role="presentation" className={`flex items-center ${t.aside ? "ml-auto" : ""}`}>
              <button
                role="tab"
                id={`tab-${t.id}`}
                aria-selected={selected}
                aria-controls={`panel-${t.id}`}
                onClick={() => activate(t.id)}
                aria-disabled={disabled}
                title={
                  disabled
                    ? getDisabledTitle?.(t.id) || "This step is currently locked"
                    : undefined
                }
                className="rail-tab"
              >
                <span className="rail-node" data-done={complete} aria-hidden="true">
                  {disabled ? (
                    <Icon name="lock" />
                  ) : complete ? (
                    <Icon name="check" />
                  ) : t.aside ? (
                    <Icon name="help" className="h-4 w-4" />
                  ) : (
                    i + 1
                  )}
                </span>
                <span className="leading-tight">
                  <span
                    className={`text-sm font-semibold transition-colors ${
                      selected
                        ? "block text-white"
                        : `sr-only sm:not-sr-only sm:block ${disabled ? "text-subtle" : "text-foreground"}`
                    }`}
                  >
                    {t.label}
                  </span>
                  {subtext && (
                    <span
                      className={`hidden text-[11px] transition-colors sm:block ${
                        selected ? "text-white/85" : "text-subtle"
                      }`}
                    >
                      {subtext}
                    </span>
                  )}
                </span>
              </button>
              {i < items.length - 1 && !items[i + 1].aside && (
                <span aria-hidden="true" className="rail-link ml-1" data-done={complete} />
              )}
            </li>
          );
        })}
      </ol>
      {blockedMsg && (
        <div role="status" className="notice notice-warn mb-3">
          {blockedMsg}
        </div>
      )}
      {items.map((t) => (
        <div
          key={t.id}
          role="tabpanel"
          id={`panel-${t.id}`}
          aria-labelledby={`tab-${t.id}`}
          hidden={t.id !== active}
          className="focus:outline-none"
        >
          {t.content}
        </div>
      ))}
    </div>
  );
}
