"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import UserAvatar from "./UserAvatar";

type OnlineAgent = { id: string; name: string; avatarUrl: string | null; grade: string };

const PANEL_WIDTH = 192; // w-48

// Avatar du compte + petite pastille verte néon (en ligne/présence
// générale du site, pas liée à soi). Sur un vrai pointeur souris, un
// survol ouvre la liste des agents actuellement connectés ; sur tactile
// (pas de "hover" fiable, cause des pop-up mal positionnés/coincés sur
// mobile), un tap fait pareil, et un tap ailleurs referme.
export default function PresenceIndicator() {
  const [open, setOpen] = useState(false);
  const [canHover, setCanHover] = useState(true);
  const [agents, setAgents] = useState<OnlineAgent[] | null>(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setCanHover(window.matchMedia("(hover: hover) and (pointer: fine)").matches);
  }, []);

  function openPanel() {
    const rect = wrapRef.current?.getBoundingClientRect();
    if (rect) {
      const left = Math.min(
        Math.max(8, rect.right - PANEL_WIDTH),
        window.innerWidth - PANEL_WIDTH - 8
      );
      setPos({ top: rect.bottom + 8, left });
    }
    setOpen(true);
    fetch("/api/presence/online", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : []))
      .then(setAgents)
      .catch(() => setAgents([]));
  }

  function toggle() {
    if (open) setOpen(false);
    else openPanel();
  }

  return (
    <div
      ref={wrapRef}
      className="relative"
      onMouseEnter={canHover ? openPanel : undefined}
      onMouseLeave={canHover ? () => setOpen(false) : undefined}
    >
      <button
        type="button"
        onClick={canHover ? undefined : toggle}
        className="relative block"
        title="Agents en ligne"
      >
        <UserAvatar />
        <span
          className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-[rgb(var(--success))] border-2 border-[rgb(var(--bg-elevated))]"
          style={{ boxShadow: "0 0 6px 1.5px rgb(var(--success))" }}
        />
      </button>

      {open &&
        createPortal(
          <>
            {!canHover && (
              <div className="fixed inset-0 z-[999]" onClick={() => setOpen(false)} />
            )}
            <div
              className="fixed z-[1000] w-48 rounded-lg overflow-hidden border border-white/[0.08] shadow-lg glass-popover"
              style={{ top: pos.top, left: pos.left }}
              onMouseEnter={canHover ? openPanel : undefined}
              onMouseLeave={canHover ? () => setOpen(false) : undefined}
            >
              <p className="text-[10px] uppercase tracking-wide text-[rgb(var(--muted))] px-3 py-2 border-b border-white/[0.06] flex items-center gap-1.5">
                <span
                  className="w-1.5 h-1.5 rounded-full bg-[rgb(var(--success))] shrink-0"
                  style={{ boxShadow: "0 0 4px 1px rgb(var(--success))" }}
                />
                En ligne{agents !== null && ` · ${agents.length}`}
              </p>
              {agents === null ? (
                <p className="px-3 py-3 text-xs text-[rgb(var(--muted))]">Chargement…</p>
              ) : agents.length === 0 ? (
                <p className="px-3 py-3 text-xs text-[rgb(var(--muted))]">Personne d&apos;autre.</p>
              ) : (
                <div className="max-h-56 overflow-y-auto py-1">
                  {agents.map((a) => (
                    <div key={a.id} className="flex items-center gap-2 px-3 py-1.5 hover:bg-white/[0.04]">
                      <span className="w-5 h-5 rounded-full bg-[rgb(var(--brand-500)/0.18)] text-[rgb(var(--brand-400))] flex items-center justify-center text-[10px] font-medium overflow-hidden shrink-0">
                        {a.avatarUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={a.avatarUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          a.name[0]
                        )}
                      </span>
                      <p className="text-xs truncate">{a.name}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>,
          document.body
        )}
    </div>
  );
}
