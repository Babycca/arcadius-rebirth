"use client";

import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown } from "lucide-react";

// Même menu stylisé que GradeSelect, mais pour une liste {value, label} —
// utile quand la valeur interne (ex: "CREATE") diffère du texte affiché
// (ex: "Créations"), contrairement à GradeSelect où les deux sont identiques.
export default function LabeledSelect({
  value,
  options,
  onChange,
}: {
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0, openUp: false });
  const buttonRef = useRef<HTMLButtonElement>(null);

  const current = options.find((o) => o.value === value)?.label ?? value;

  function openMenu() {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (rect) {
      const estimatedMenuHeight = options.length * 36 + 8;
      const spaceBelow = window.innerHeight - rect.bottom;
      const openUp = spaceBelow < estimatedMenuHeight && rect.top > estimatedMenuHeight;
      setPos({
        top: openUp ? rect.top - 4 : rect.bottom + 4,
        left: rect.left,
        width: rect.width,
        openUp,
      });
    }
    setOpen(true);
  }

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => (open ? setOpen(false) : openMenu())}
        className="glass rounded-lg px-3 py-2 text-sm flex items-center gap-2 min-w-[140px] justify-between"
      >
        {current}
        <ChevronDown size={14} className={`text-[rgb(var(--muted))] transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open &&
        createPortal(
          <>
            <div className="fixed inset-0 z-[100]" onClick={() => setOpen(false)} />
            <div
              className="fixed z-[101] rounded-lg border border-white/10 shadow-xl glass-popover max-h-64 overflow-x-hidden overflow-y-auto"
              style={{
                left: pos.left,
                minWidth: pos.width,
                maxWidth: 240,
                ...(pos.openUp ? { bottom: window.innerHeight - pos.top } : { top: pos.top }),
              }}
            >
              {options.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => {
                    onChange(o.value);
                    setOpen(false);
                  }}
                  className={`block w-full text-left px-3 py-2 text-sm transition-colors truncate ${
                    o.value === value
                      ? "bg-[rgb(var(--brand-500)/0.18)] text-[rgb(var(--brand-400))]"
                      : "hover:bg-white/[0.06]"
                  }`}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </>,
          document.body
        )}
    </div>
  );
}
