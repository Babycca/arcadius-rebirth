"use client";

import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown } from "lucide-react";

export default function GradeSelect({
  value,
  grades,
  onChange,
}: {
  value: string;
  grades: string[];
  onChange: (grade: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0, openUp: false });
  const buttonRef = useRef<HTMLButtonElement>(null);

  function openMenu() {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (rect) {
      const estimatedMenuHeight = grades.length * 36 + 8;
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
        {value}
        <ChevronDown size={14} className={`text-[rgb(var(--muted))] transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open &&
        createPortal(
          <>
            <div className="fixed inset-0 z-[100]" onClick={() => setOpen(false)} />
            <div
              className="fixed z-[101] rounded-lg overflow-hidden border border-white/10 shadow-xl"
              style={{
                backgroundColor: "rgb(22 18 32)",
                left: pos.left,
                minWidth: pos.width,
                ...(pos.openUp ? { bottom: window.innerHeight - pos.top } : { top: pos.top }),
              }}
            >
              {grades.map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => {
                    onChange(g);
                    setOpen(false);
                  }}
                  className={`block w-full text-left px-3 py-2 text-sm transition-colors whitespace-nowrap ${
                    g === value
                      ? "bg-[rgb(var(--brand-500)/0.18)] text-[rgb(var(--brand-400))]"
                      : "hover:bg-white/[0.06]"
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>
          </>,
          document.body
        )}
    </div>
  );
}
