"use client";

import { useMemo, useState, useRef, useEffect } from "react";

type Props = {
  variables: string[];
  onInsert: (name: string) => void;
  label?: string;
};

export default function VariablePicker({ variables, onInsert, label = "Insert variable" }: Props) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!panelRef.current) return;
      if (!panelRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, []);

  const filtered = useMemo(() => {
    const set = Array.from(new Set(variables.filter(Boolean)));
    if (!q.trim()) return set;
    const qq = q.toLowerCase();
    return set.filter((v) => v.toLowerCase().includes(qq));
  }, [variables, q]);

  return (
    <div className="relative inline-block" ref={panelRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="btn btn-sm"
        aria-expanded={open}
      >
        {label}
      </button>
      {open && (
        <div className="card popover absolute right-0 z-20 mt-2 w-56 overflow-hidden">
          <div className="p-2 border-b border-line">
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search variables"
              aria-label="Search variables"
              className="input w-full text-xs"
            />
          </div>
          <div className="max-h-56 overflow-auto">
            {filtered.length === 0 ? (
              <div className="p-3 text-xs text-subtle">No matches</div>
            ) : (
              <ul className="text-sm font-mono">
                {filtered.map((v) => (
                  <li key={v}>
                    <button
                      type="button"
                      onClick={() => { onInsert(v); setOpen(false); setQ(""); }}
                      className="w-full text-left text-xs px-3 py-2 transition-colors hover:bg-accent-soft hover:text-accent-ink"
                    >
                      {`{{ ${v} }}`}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
