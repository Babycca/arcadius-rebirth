"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PageShell, PageHeader } from "@/components/PageShell";
import { useCanEdit } from "@/lib/use-can-edit";
import { useDialog } from "@/components/DialogProvider";
import { useToast } from "@/components/ToastProvider";
import LabeledSelect from "@/components/LabeledSelect";
import { ArrowLeft, Plus, Trash2, Pencil, Check, X, ShieldAlert } from "lucide-react";

type Agent = { id: string; firstName: string; lastName: string; active: boolean };
type Sanction = {
  id: string;
  agentId: string;
  agentName: string;
  agentAvatarUrl: string | null;
  type: string;
  reason: string;
  date: string;
};

const SANCTION_TYPES = ["Avertissement oral", "Avertissement écrit", "Mise à pied", "Licenciement"];

const TYPE_STYLES: Record<string, string> = {
  "Avertissement oral": "bg-[rgb(var(--warning)/0.14)] text-[rgb(var(--warning))]",
  "Avertissement écrit": "bg-[rgb(var(--warning)/0.2)] text-[rgb(var(--warning))]",
  "Mise à pied": "bg-[rgb(var(--danger)/0.14)] text-[rgb(var(--danger))]",
  Licenciement: "bg-[rgb(var(--danger)/0.22)] text-[rgb(var(--danger))]",
};

function todayInputValue() {
  return new Date().toISOString().slice(0, 10);
}

export default function SanctionsPage() {
  const { isAdmin } = useCanEdit();
  const { confirm } = useDialog();
  const toast = useToast();
  const [sanctions, setSanctions] = useState<Sanction[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [agentId, setAgentId] = useState("");
  const [type, setType] = useState(SANCTION_TYPES[0]);
  const [date, setDate] = useState(todayInputValue());
  const [reason, setReason] = useState("");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editType, setEditType] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editReason, setEditReason] = useState("");
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  function load() {
    setLoading(true);
    Promise.all([
      fetch("/api/sanctions").then((res) => {
        if (res.status === 403) {
          setForbidden(true);
          return [];
        }
        return res.json();
      }),
      fetch("/api/agents").then((res) => (res.ok ? res.json() : [])),
    ]).then(([sanctionData, agentData]) => {
      setSanctions(sanctionData);
      const active = (agentData as Agent[]).filter((a) => a.active);
      setAgents(active);
      if (!agentId && active.length > 0) setAgentId(active[0].id);
      setLoading(false);
    });
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!agentId || !reason.trim()) return;
    setSaving(true);
    setError(null);
    const res = await fetch("/api/sanctions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ agentId, type, date, reason }),
    });
    setSaving(false);
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(body?.error ?? "Impossible d'enregistrer cette sanction.");
      return;
    }
    setReason("");
    setDate(todayInputValue());
    toast("Sanction enregistrée.");
    load();
  }

  function startEdit(s: Sanction) {
    setEditingId(s.id);
    setEditType(s.type);
    setEditDate(s.date.slice(0, 10));
    setEditReason(s.reason);
    setEditError(null);
  }

  async function saveEdit(id: string) {
    setEditSaving(true);
    setEditError(null);
    const res = await fetch(`/api/sanctions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: editType, date: editDate, reason: editReason }),
    });
    setEditSaving(false);
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setEditError(body?.error ?? "Impossible de modifier cette sanction.");
      return;
    }
    setEditingId(null);
    toast("Sanction modifiée.");
    load();
  }

  async function handleDelete(id: string) {
    const ok = await confirm("Supprimer cette sanction ?", { danger: true });
    if (!ok) return;
    const res = await fetch(`/api/sanctions/${id}`, { method: "DELETE" });
    if (res.ok) {
      toast("Sanction supprimée.");
      load();
    }
  }

  if (forbidden || !isAdmin) {
    return (
      <PageShell>
        <PageHeader title="Suivi des sanctions" subtitle="Accès réservé aux administrateurs" />
        <p className="text-sm text-[rgb(var(--muted))]">Tu n&apos;as pas accès à cette page.</p>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <Link
        href="/administration"
        className="flex items-center gap-1.5 text-xs text-[rgb(var(--muted))] hover:text-[rgb(var(--brand-400))] mb-3"
      >
        <ArrowLeft size={13} />
        Administration
      </Link>
      <PageHeader
        title="Suivi des sanctions"
        subtitle={`${sanctions.length} sanction${sanctions.length > 1 ? "s" : ""} enregistrée${sanctions.length > 1 ? "s" : ""}`}
      />

      <form onSubmit={handleSubmit} className="card-hover glass-strong rounded-xl p-5 mb-6 max-w-4xl border border-transparent">
        <h2 className="text-sm font-medium mb-4 flex items-center gap-2.5">
          <span className="w-8 h-8 rounded-lg bg-[rgb(var(--danger)/0.14)] flex items-center justify-center">
            <ShieldAlert size={14} className="text-[rgb(var(--danger))]" />
          </span>
          Ajouter une sanction
        </h2>
        {error && (
          <div className="rounded-lg bg-[rgb(var(--danger)/0.12)] text-[rgb(var(--danger))] text-xs px-3 py-2 mb-3">
            {error}
          </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mb-3">
          <LabeledSelect
            value={agentId}
            onChange={setAgentId}
            options={agents.map((a) => ({ value: a.id, label: `${a.firstName} ${a.lastName}` }))}
          />
          <LabeledSelect
            value={type}
            onChange={setType}
            options={SANCTION_TYPES.map((t) => ({ value: t, label: t }))}
          />
          <div>
            <label className="text-xs text-[rgb(var(--muted))] mb-1 block">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="glass rounded-lg px-3 py-2 text-sm w-full outline-none"
            />
          </div>
        </div>
        <label className="text-xs text-[rgb(var(--muted))] mb-1 block">Motif</label>
        <input
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Retard répété, comportement inapproprié…"
          className="glass rounded-lg px-3 py-2 text-sm w-full outline-none"
        />
        <button
          type="submit"
          disabled={saving || !agentId || !reason.trim()}
          className="mt-4 flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold text-white bg-gradient-to-r from-[rgb(var(--brand-500))] to-[rgb(var(--brand-600))] hover:brightness-110 transition-all disabled:opacity-60"
        >
          <Plus size={15} />
          {saving ? "Enregistrement…" : "Ajouter la sanction"}
        </button>
      </form>

      {!loading && (
        <div className="max-w-4xl card-hover glass-strong rounded-xl overflow-hidden border border-transparent">
          {sanctions.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-[rgb(var(--muted))]">Aucune sanction enregistrée.</p>
          ) : (
            sanctions.map((s) => {
              if (editingId === s.id) {
                return (
                  <div key={s.id} className="px-4 py-3 border-b border-white/[0.04] last:border-0 bg-white/[0.02]">
                    {editError && (
                      <div className="rounded-lg bg-[rgb(var(--danger)/0.12)] text-[rgb(var(--danger))] text-xs px-3 py-2 mb-2">
                        {editError}
                      </div>
                    )}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-2">
                      <LabeledSelect
                        value={editType}
                        onChange={setEditType}
                        options={SANCTION_TYPES.map((t) => ({ value: t, label: t }))}
                      />
                      <input
                        type="date"
                        value={editDate}
                        onChange={(e) => setEditDate(e.target.value)}
                        className="glass rounded-lg px-2 py-1.5 text-sm outline-none"
                      />
                      <input
                        value={editReason}
                        onChange={(e) => setEditReason(e.target.value)}
                        placeholder="Motif"
                        className="glass rounded-lg px-2 py-1.5 text-sm outline-none"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => saveEdit(s.id)}
                        disabled={editSaving}
                        className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-white bg-gradient-to-r from-[rgb(var(--brand-500))] to-[rgb(var(--brand-600))] disabled:opacity-60"
                      >
                        <Check size={13} />
                        {editSaving ? "Enregistrement…" : "Enregistrer"}
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs text-[rgb(var(--muted))] hover:text-[rgb(var(--foreground))]"
                      >
                        <X size={13} />
                        Annuler
                      </button>
                    </div>
                  </div>
                );
              }

              return (
                <div
                  key={s.id}
                  className="flex items-center justify-between gap-3 px-4 py-3 border-b border-white/[0.04] last:border-0 hover:bg-white/[0.03] transition-colors group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-8 h-8 rounded-full bg-[rgb(var(--brand-500)/0.18)] text-[rgb(var(--brand-400))] flex items-center justify-center text-xs font-medium overflow-hidden shrink-0">
                      {s.agentAvatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={s.agentAvatarUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        s.agentName[0]
                      )}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate flex items-center gap-2">
                        {s.agentName}
                        <span className={`text-[10px] font-medium rounded-full px-2 py-0.5 ${TYPE_STYLES[s.type] ?? "bg-white/[0.08] text-[rgb(var(--muted))]"}`}>
                          {s.type}
                        </span>
                      </p>
                      <p className="text-xs text-[rgb(var(--muted))]">
                        {new Date(s.date).toLocaleDateString("fr-FR")} — {s.reason}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    <button
                      onClick={() => startEdit(s)}
                      className="text-[rgb(var(--muted))] hover:text-[rgb(var(--brand-400))] p-1.5"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => handleDelete(s.id)}
                      className="text-[rgb(var(--muted))] hover:text-[rgb(var(--danger))] p-1.5"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </PageShell>
  );
}
