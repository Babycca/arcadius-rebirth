"use client";

import { useEffect, useState } from "react";
import { ArrowLeftRight } from "lucide-react";

type AgentOption = { id: string; firstName: string; lastName: string; grade: string; active: boolean };

// Bouton admin (mode éditeur) pour transférer une vente d'un agent à un
// autre — ouvre un petit sélecteur d'agent en ligne plutôt qu'une modale.
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

  useEffect(() => {
    if (open && !agents) {
      fetch("/api/agents")
        .then((r) => (r.ok ? r.json() : []))
        .then((d: AgentOption[]) =>
          setAgents(Array.isArray(d) ? d.filter((a) => a.grade !== "SEC" && a.active) : [])
        );
    }
  }, [open, agents]);

  async function reassign(agentId: string) {
    if (!agentId || agentId === currentAgentId) {
      setOpen(false);
      return;
    }
    setSaving(true);
    const res = await fetch(`/api/accounting/sales/${saleId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ agentId }),
    });
    setSaving(false);
    setOpen(false);
    if (res.ok) onReassigned();
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="text-[rgb(var(--muted))] hover:text-[rgb(var(--brand-400))] p-1.5"
        title="Transférer à un autre agent"
      >
        <ArrowLeftRight size={13} />
      </button>
    );
  }

  return (
    <select
      autoFocus
      disabled={saving}
      defaultValue=""
      onChange={(e) => reassign(e.target.value)}
      onBlur={() => setOpen(false)}
      className="glass rounded-lg px-2 py-1 text-xs outline-none max-w-[140px]"
    >
      <option value="" disabled>
        Choisir un agent…
      </option>
      {agents?.map((a) => (
        <option key={a.id} value={a.id} disabled={a.id === currentAgentId}>
          {a.firstName} {a.lastName}
        </option>
      ))}
    </select>
  );
}
