"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowLeftRight } from "lucide-react";
import Tooltip from "@/components/Tooltip";

type AgentOption = { id: string; firstName: string; lastName: string; grade: string; active: boolean };

// Bouton admin (mode éditeur) pour transférer une vente d'un agent à un
// autre — ouvre un petit menu stylé (même pattern que GradeSelect) plutôt
// qu'un <select> natif.
export default function ReassignSaleButton({
  saleId,
  currentAgentId,
  onReassigned,
}: {
  saleId: string;
  currentAgentId: string;
  onReassigned: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [agents, setAgents] = useState<AgentOption[] | null>(null);
  const [saving, setSaving] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0, openUp: false });
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (open && !agents) {
      fetch("/api/agents")
        .then((r) => (r.ok ? r.json() : []))
        .then((d: AgentOption[]) =>
          setAgents(Array.isArray(d) ? d.filter((a) => a.grade !== "SEC" && a.active) : [])
        );
    }
  }, [open, agents]);

  function openMenu() {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (rect) {
      const estimatedMenuHeight = 260;
      const spaceBelow = window.innerHeight - rect.bottom;
      const openUp = spaceBelow < estimatedMenuHeight && rect.top > estimatedMenuHeight;
      setPos({ top: openUp ? rect.top - 4 : rect.bottom + 4, left: rect.right, openUp });
    }
    setOpen(true);
  }

  async function reassign(agentId: string) {
    setOpen(false);
    if (!agentId || agentId === currentAgentId) return;
    setSaving(true);
    const res = await fetch(`/api/accounting/sales/${saleId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ agentId }),
    });
    setSaving(false);
    if (res.ok) onReassigned();
  }

  return (
    <div className="relative inline-flex">
      <Tooltip label="Transférer à un autre agent">
        <button
          ref={buttonRef}
          type="button"
          disabled={saving}
          onClick={() => (open ? setOpen(false) : openMenu())}
          className="text-[rgb(var(--muted))] hover:text-[rgb(var(--brand-400))] p-1.5 disabled:opacity-50"
        >
          <ArrowLeftRight size={13} />
        </button>
      </Tooltip>
      {open &&
        createPortal(
          <>
            <div className="fixed inset-0 z-[100]" onClick={() => setOpen(false)} />
            <div
              className="fixed z-[101] rounded-lg border border-white/10 shadow-xl glass-popover max-h-64 w-48 overflow-y-auto py-1"
              style={{
                left: pos.left - 192,
                ...(pos.openUp ? { bottom: window.innerHeight - pos.top } : { top: pos.top }),
              }}
            >
              <p className="px-3 py-1.5 text-[11px] text-[rgb(var(--muted))]">Transférer vers…</p>
              {agents === null && <p className="px-3 py-2 text-xs text-[rgb(var(--muted))]">Chargement…</p>}
              {agents?.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  disabled={a.id === currentAgentId}
                  onClick={() => reassign(a.id)}
                  className={`block w-full text-left px-3 py-2 text-sm transition-colors truncate ${
                    a.id === currentAgentId
                      ? "text-[rgb(var(--muted))] opacity-40 cursor-default"
                      : "hover:bg-white/[0.06]"
                  }`}
                >
                  {a.firstName} {a.lastName}
                </button>
              ))}
            </div>
          </>,
          document.body
        )}
    </div>
  );
}
