"use client";

import { ReactNode } from "react";

// Remplace l'infobulle moche du navigateur (attribut title) par une bulle
// stylée au look du site — pur CSS, pas de JS, pas de retard au survol.
export default function Tooltip({ label, children }: { label: string; children: ReactNode }) {
  return (
    <span className="relative inline-flex group/tooltip">
      {children}
      <span
        role="tooltip"
        className="pointer-events-none absolute left-1/2 bottom-full -translate-x-1/2 mb-2 whitespace-nowrap rounded-lg glass-popover border border-white/10 px-2.5 py-1.5 text-xs text-[rgb(var(--foreground))] shadow-xl opacity-0 scale-95 translate-y-0.5 transition-all duration-100 group-hover/tooltip:opacity-100 group-hover/tooltip:scale-100 group-hover/tooltip:translate-y-0 z-50"
      >
        {label}
      </span>
    </span>
  );
}
