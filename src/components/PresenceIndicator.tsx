"use client";

import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import UserAvatar from "./UserAvatar";

type OnlineAgent = { id: string; name: string; avatarUrl: string | null; grade: string };

// Avatar du compte + petite pastille verte néon (en ligne/présence
// générale du site, pas liée à soi) — cliquer ouvre la liste des agents
// actuellement connectés (ping régulier côté client, voir PresenceTracker).
export default function PresenceIndicator() {
  const [open, setOpen] = useState(false);
  const [agents, setAgents] = useState<OnlineAgent[] | null>(null);
  const [pos, setPos] = useState({ top: 0, right: 0 });
  const wrapRef = useRef<HTMLDivElement>(null);

  function openPanel() {
    const rect = wrapRef.current?.getBoundingClientRect();
    if (rect) setPos({ top: rect.bottom + 8, right: window.innerWidth - rect.right });
    setOpen(true);
    fetch("/api/presence/online", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : []))
      .then(setAgents)
      .catch(() => setAgents([]));
  }

  return (
    <div
      ref={wrapRef}
      className="relative"
      onMouseEnter={openPanel}
      onMouseLeave={() => setOpen(false)}
    >
      <div className="relative" title="Agents en ligne">
        <UserAvatar />
        <span
          className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-[rgb(var(--success))] border-2 border-[rgb(var(--bg-elevated))]"
          style={{ boxShadow: "0 0 6px 1.5px rgb(var(--success))" }}
        />
      </div>

      {open &&
        createPortal(
          <div
            className="fixed z-[101] w-48 rounded-lg overflow-hidden border border-white/[0.08] shadow-lg glass-strong"
            style={{ top: pos.top, right: pos.right }}
            onMouseEnter={openPanel}
            onMouseLeave={() => setOpen(false)}
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
            </div>,
          document.body
        )}
    </div>
  );
}
