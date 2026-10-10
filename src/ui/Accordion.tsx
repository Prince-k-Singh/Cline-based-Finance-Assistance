import { useEffect, useId, useState, type ReactNode } from "react";

/**
 * Open/closed state for a stack of sections, with expand/collapse all.
 * Remembered for the browser session (per page) so switching tabs doesn't reset it.
 */
export function useSections<T extends string>(ids: readonly T[], initial: readonly T[], storageKey?: string) {
  const [open, setOpen] = useState<Set<T>>(() => {
    try {
      const saved = storageKey ? sessionStorage.getItem(storageKey) : null;
      const arr: unknown = saved ? JSON.parse(saved) : null;
      if (Array.isArray(arr)) return new Set(arr.filter((x): x is T => (ids as readonly unknown[]).includes(x)));
    } catch { /* storage unavailable: fall back to defaults */ }
    return new Set(initial);
  });
  useEffect(() => {
    if (!storageKey) return;
    try { sessionStorage.setItem(storageKey, JSON.stringify([...open])); } catch { /* ignore */ }
  }, [open, storageKey]);
  const allOpen = open.size === ids.length;
  const toggle = (id: T) => setOpen((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  return {
    allOpen,
    toggleAll: () => setOpen(allOpen ? new Set<T>() : new Set(ids)),
    sec: (id: T) => ({ open: open.has(id), onToggle: () => toggle(id) }),
  };
}

export function SectionToolbar({ hint, allOpen, onToggleAll }: { hint: ReactNode; allOpen: boolean; onToggleAll: () => void }) {
  return (
    <div className="acc-toolbar">
      <span className="muted">{hint}</span>
      <button type="button" className="linkbtn" onClick={onToggleAll}>{allOpen ? "Collapse all" : "Expand all"}</button>
    </div>
  );
}

/**
 * Full-width collapsible section (accessible disclosure pattern).
 * Height animates smoothly via the grid-template-rows 0fr → 1fr technique;
 * collapsed content is `inert` so it can't be tabbed into.
 */
export default function Section({ title, summary, open, onToggle, children }: {
  title: string; summary?: ReactNode; open: boolean; onToggle: () => void; children: ReactNode;
}) {
  const id = useId();
  return (
    <section className={`card acc${open ? " open" : ""}`}>
      <h2 className="acc-h">
        <button type="button" className="acc-btn" aria-expanded={open} aria-controls={`${id}-panel`} id={`${id}-btn`} onClick={onToggle}>
          <span className="acc-title">{title}</span>
          {summary && <span className="acc-sum">{summary}</span>}
          <svg className="acc-chev" viewBox="0 0 20 20" width="18" height="18" aria-hidden="true">
            <path d="M5 7.5l5 5 5-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </h2>
      <div className="acc-panel" id={`${id}-panel`} role="region" aria-labelledby={`${id}-btn`} inert={!open}>
        <div className="acc-inner">
          <div className="acc-content">{children}</div>
        </div>
      </div>
    </section>
  );
}

