"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { PageShell, PageHeader } from "@/components/PageShell";
import { usePermissions } from "@/lib/use-permissions";
import { useDialog } from "@/components/DialogProvider";
import { useToast } from "@/components/ToastProvider";
import LabeledSelect from "@/components/LabeledSelect";
import { ArrowLeft, Plus, Trash2, Pencil, Check, X, ShieldAlert, AlertTriangle } from "lucide-react";

type Agent = { id: string; firstName: string; lastName: string; avatarUrl: string | null; active: boolean };
type Sanction = {
  id: string;
  agentId: string;
  agentName: string;
  agentAvatarUrl: string | null;
  type: string;
  reason: string;
  date: string;
};

const SANCTION_TYPES = ["Avertissement", "Licenciement"];

const TYPE_STYLES: Record<string, string> = {
  Avertissement: "bg-[rgb(var(--danger)/0.16)] text-[rgb(var(--danger))]",
  Licenciement: "bg-[rgb(var(--danger)/0.26)] text-[rgb(var(--danger))]",
};

function todayInputValue() {
  return new Date().toISOString().slice(0, 10);
}

export default function SanctionsPage() {
  const { has } = usePermissions();
  const isAdmin = has("sanctions");
  const { confirm } = useDialog();
  const toast = useToast();
  const [sanctions, setSanctions] = useState<Sanction[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);

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
      if (!selectedAgentId && active.length > 0) setSelectedAgentId(active[0].id);
      setLoading(false);
    });
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Nombre d'avertissements par agent — sert à la bulle rouge et à l'alerte
  // "Attention" affichées dans la liste de gauche.
  const warningCountByAgent = useMemo(() => {
    const map = new Map<string, number>();
    for (const s of sanctions) {
      if (s.type === "Avertissement") map.set(s.agentId, (map.get(s.agentId) ?? 0) + 1);
    }
    return map;
  }, [sanctions]);

  function selectAgent(id: string) {
    setSelectedAgentId(id);
    setAgentId(id);
    setEditingId(null);
  }

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

  const selectedAgent = agents.find((a) => a.id === selectedAgentId) ?? null;
  const selectedSanctions = sanctions.filter((s) => s.agentId === selectedAgentId);

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

      <div className="flex flex-col lg:flex-row gap-5 max-w-6xl">
        <div className="card-hover glass-strong rounded-xl overflow-hidden border border-transparent lg:w-72 shrink-0 h-fit">
          <p className="text-xs text-[rgb(var(--muted))] px-4 py-3 border-b border-white/[0.08]">Agents</p>
          {agents.map((a) => {
            const count = warningCountByAgent.get(a.id) ?? 0;
            const atRisk = count >= 2;
            return (
              <button
                key={a.id}
                onClick={() => selectAgent(a.id)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors border-b border-white/[0.04] last:border-0 ${
                  selectedAgentId === a.id ? "bg-[rgb(var(--brand-500)/0.12)]" : "hover:bg-white/[0.03]"
                }`}
              >
                <span className="relative shrink-0">
                  <span className="w-8 h-8 rounded-full bg-[rgb(var(--brand-500)/0.18)] text-[rgb(var(--brand-400))] flex items-center justify-center text-xs font-medium overflow-hidden">
                    {a.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={a.avatarUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      a.firstName[0]
                    )}
                  </span>
                  {count > 0 && (
                    <span
                      className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-[rgb(var(--danger))] text-white text-[10px] font-semibold flex items-center justify-center"
                      style={{ boxShadow: "0 0 6px 1px rgb(var(--danger)/0.6)" }}
                    >
                      {count}
                    </span>
                  )}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">
                    {a.firstName} {a.lastName}
                  </p>
                  {atRisk && (
                    <p className="flex items-center gap-1 text-[10px] text-[rgb(var(--danger))] font-medium animate-pulse">
                      <AlertTriangle size={10} />
                      Attention
                    </p>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        <div className="flex-1 min-w-0">
          <form onSubmit={handleSubmit} className="card-hover glass-strong rounded-xl p-5 mb-5 border border-transparent">
            <h2 className="text-sm font-medium mb-4 flex items-center gap-2.5">
              <span className="w-8 h-8 rounded-lg bg-[rgb(var(--danger)/0.14)] flex items-center justify-center">
                <ShieldAlert size={14} className="text-[rgb(var(--danger))]" />
              </span>
              Ajouter une sanction{selectedAgent ? ` — ${selectedAgent.firstName} ${selectedAgent.lastName}` : ""}
            </h2>
            {error && (
              <div className="rounded-lg bg-[rgb(var(--danger)/0.12)] text-[rgb(var(--danger))] text-xs px-3 py-2 mb-3">
                {error}
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
              <LabeledSelect
                value={agentId}
                onChange={(v) => {
                  setAgentId(v);
                  setSelectedAgentId(v);
                }}
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
            <div className="card-hover glass-strong rounded-xl overflow-hidden border border-transparent">
              <p className="text-xs text-[rgb(var(--muted))] px-4 py-3 border-b border-white/[0.08]">
                Historique{selectedAgent ? ` — ${selectedAgent.firstName} ${selectedAgent.lastName}` : ""}
              </p>
              {selectedSanctions.length === 0 ? (
                <p className="px-4 py-6 text-center text-sm text-[rgb(var(--muted))]">Aucune sanction enregistrée.</p>
              ) : (
                selectedSanctions.map((s) => {
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
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate flex items-center gap-2">
                          <span className={`text-[10px] font-medium rounded-full px-2 py-0.5 ${TYPE_STYLES[s.type] ?? "bg-white/[0.08] text-[rgb(var(--muted))]"}`}>
                            {s.type}
                          </span>
                        </p>
                        <p className="text-xs text-[rgb(var(--muted))] mt-1">
                          {new Date(s.date).toLocaleDateString("fr-FR")} — {s.reason}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                        <button
                          onClick={() => startEdit(s)}
                          className="text-[rgb(var(--muted))] hover:text-[rgb(var(--brand-400))] p-1.5"
                        >
                          <Pencil size={14} />
                        </button>
                        {has("sanctionsSupprimer") && (
                          <button
                            onClick={() => handleDelete(s.id)}
                            className="text-[rgb(var(--muted))] hover:text-[rgb(var(--danger))] p-1.5"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>
    </PageShell>
  );
}
