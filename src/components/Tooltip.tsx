"use client";

import { ReactNode, useRef, useState } from "react";
import { createPortal } from "react-dom";

// Remplace l'infobulle moche du navigateur (attribut title) par une bulle
// stylée au look du site. Rendue via un portail (comme GradeSelect) plutôt
// qu'en position absolute locale, pour ne jamais être coupée par le
// `overflow-hidden` d'un tableau/carte parent quand le bouton est près du
// bord de l'écran.
export default function Tooltip({ label, children }: { label: string; children: ReactNode }) {
  const [show, setShow] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const ref = useRef<HTMLSpanElement>(null);

  function updatePos() {
    const rect = ref.current?.getBoundingClientRect();
    if (rect) {
      const clampedLeft = Math.min(Math.max(rect.left + rect.width / 2, 90), window.innerWidth - 90);
      setPos({ top: rect.top - 8, left: clampedLeft });
    }
  }

  return (
    <span
      ref={ref}
      className="relative inline-flex"
      onMouseEnter={() => {
        updatePos();
        setShow(true);
      }}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      {show &&
        createPortal(
          <span
            role="tooltip"
            className="fixed -translate-x-1/2 -translate-y-full pointer-events-none whitespace-nowrap rounded-lg glass-popover border border-white/10 px-2.5 py-1.5 text-xs text-[rgb(var(--foreground))] shadow-xl z-[200]"
            style={{ top: pos.top, left: pos.left }}
          >
            {label}
          </span>,
          document.body
        )}
    </span>
  );
}
