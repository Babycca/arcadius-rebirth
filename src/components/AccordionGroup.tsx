"use client";

import { useState, ReactNode } from "react";
import { ChevronDown, GripVertical } from "lucide-react";

export default function AccordionGroup({
  title,
  count,
  defaultOpen = false,
  children,
}: {
  title: string;
  count: number;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="glass-strong rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-3 px-4 py-3 w-full text-left"
      >
        <GripVertical size={16} className="text-[rgb(var(--muted))]" />
        <span className="flex-1 font-medium text-sm">{title}</span>
        <span className="text-xs text-[rgb(var(--muted))]">
          {count} élément{count > 1 ? "s" : ""}
        </span>
        <ChevronDown
          size={16}
          className={`text-[rgb(var(--muted))] transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && <div className="border-t border-white/[0.06] px-4 py-2">{children}</div>}
    </div>
  );
}
