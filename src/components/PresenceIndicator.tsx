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

  function toggle() {
    if (open) {
      setOpen(false);
      return;
    }
    const rect = wrapRef.current?.getBoundingClientRect();
    if (rect) setPos({ top: rect.bottom + 8, right: window.innerWidth - rect.right });
    setOpen(true);
    fetch("/api/presence/online")
      .then((r) => (r.ok ? r.json() : []))
      .then(setAgents)
      .catch(() => setAgents([]));
  }

  return (
    <div ref={wrapRef} className="relative">
      <button onClick={toggle} className="relative block" title="Agents en ligne">
        <UserAvatar />
        <span
          className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-[rgb(var(--success))] border-2 border-[rgb(var(--bg-elevated))]"
          style={{ boxShadow: "0 0 6px 1.5px rgb(var(--success))" }}
        />
      </button>

      {open &&
        createPortal(
          <>
            <div className="fixed inset-0 z-[100]" onClick={() => setOpen(false)} />
            <div
              className="fixed z-[101] w-64 rounded-xl overflow-hidden border border-white/10 shadow-xl glass-strong"
              style={{ top: pos.top, right: pos.right }}
            >
              <p className="text-xs text-[rgb(var(--muted))] px-4 py-3 border-b border-white/[0.08] flex items-center gap-1.5">
                <span
                  className="w-1.5 h-1.5 rounded-full bg-[rgb(var(--success))] shrink-0"
                  style={{ boxShadow: "0 0 5px 1px rgb(var(--success))" }}
                />
                Agents en ligne
              </p>
              {agents === null ? (
                <p className="px-4 py-4 text-xs text-[rgb(var(--muted))]">Chargement…</p>
              ) : agents.length === 0 ? (
                <p className="px-4 py-4 text-xs text-[rgb(var(--muted))]">Personne d&apos;autre en ligne.</p>
              ) : (
                <div className="max-h-64 overflow-y-auto">
                  {agents.map((a) => (
                    <div key={a.id} className="flex items-center gap-2.5 px-4 py-2.5 hover:bg-white/[0.04]">
                      <span className="w-7 h-7 rounded-full bg-[rgb(var(--brand-500)/0.18)] text-[rgb(var(--brand-400))] flex items-center justify-center text-xs font-medium overflow-hidden shrink-0">
                        {a.avatarUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={a.avatarUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          a.name[0]
                        )}
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm truncate">{a.name}</p>
                        <p className="text-[10px] text-[rgb(var(--muted))]">{a.grade}</p>
                      </div>
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
