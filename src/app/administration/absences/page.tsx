"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PageShell, PageHeader } from "@/components/PageShell";
import { usePermissions } from "@/lib/use-permissions";
import { useDialog } from "@/components/DialogProvider";
import { useToast } from "@/components/ToastProvider";
import LabeledSelect from "@/components/LabeledSelect";
import { ArrowLeft, Plus, Trash2, Pencil, Check, X, CalendarOff } from "lucide-react";

type Agent = { id: string; firstName: string; lastName: string; active: boolean };
type Absence = {
  id: string;
  agentId: string;
  agentName: string;
  agentAvatarUrl: string | null;
  startDate: string;
  endDate: string;
  reason: string | null;
};

function todayInputValue() {
  return new Date().toISOString().slice(0, 10);
}

export default function AbsencesPage() {
  const { has } = usePermissions();
  const isAdmin = has("absences");
  const { confirm } = useDialog();
  const toast = useToast();
  const [absences, setAbsences] = useState<Absence[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [agentId, setAgentId] = useState("");
  const [startDate, setStartDate] = useState(todayInputValue());
  const [endDate, setEndDate] = useState(todayInputValue());
  const [reason, setReason] = useState("");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editStart, setEditStart] = useState("");
  const [editEnd, setEditEnd] = useState("");
  const [editReason, setEditReason] = useState("");
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  function load() {
    setLoading(true);
    Promise.all([
      fetch("/api/absences").then((res) => {
        if (res.status === 403) {
          setForbidden(true);
          return [];
        }
        return res.json();
      }),
      fetch("/api/agents").then((res) => (res.ok ? res.json() : [])),
    ]).then(([absenceData, agentData]) => {
      setAbsences(absenceData);
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
    if (!agentId) return;
    setSaving(true);
    setError(null);
    const res = await fetch("/api/absences", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ agentId, startDate, endDate, reason: reason || undefined }),
    });
    setSaving(false);
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(body?.error ?? "Impossible d'enregistrer cette absence.");
      return;
    }
    setReason("");
    setStartDate(todayInputValue());
    setEndDate(todayInputValue());
    toast("Absence enregistrée.");
    load();
  }

  function startEdit(a: Absence) {
    setEditingId(a.id);
    setEditStart(a.startDate.slice(0, 10));
    setEditEnd(a.endDate.slice(0, 10));
    setEditReason(a.reason ?? "");
    setEditError(null);
  }

  async function saveEdit(id: string) {
    setEditSaving(true);
    setEditError(null);
    const res = await fetch(`/api/absences/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ startDate: editStart, endDate: editEnd, reason: editReason || null }),
    });
    setEditSaving(false);
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setEditError(body?.error ?? "Impossible de modifier cette absence.");
      return;
    }
    setEditingId(null);
    toast("Absence modifiée.");
    load();
  }

  async function handleDelete(id: string) {
    const ok = await confirm("Supprimer cette absence ?", { danger: true });
    if (!ok) return;
    const res = await fetch(`/api/absences/${id}`, { method: "DELETE" });
    if (res.ok) {
      toast("Absence supprimée.");
      load();
    }
  }

  if (forbidden || !isAdmin) {
    return (
      <PageShell>
        <PageHeader title="Suivi des absences" subtitle="Accès réservé aux administrateurs" />
        <p className="text-sm text-[rgb(var(--muted))]">Tu n&apos;as pas accès à cette page.</p>
      </PageShell>
    );
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const current = absences.filter((a) => new Date(a.startDate) <= today && new Date(a.endDate) >= today);
  const upcoming = absences.filter((a) => new Date(a.startDate) > today);
  const past = absences.filter((a) => new Date(a.endDate) < today);

  function AbsenceRow({ a }: { a: Absence }) {
    if (editingId === a.id) {
      return (
        <div className="px-4 py-3 border-b border-white/[0.04] last:border-0 bg-white/[0.02]">
          {editError && (
            <div className="rounded-lg bg-[rgb(var(--danger)/0.12)] text-[rgb(var(--danger))] text-xs px-3 py-2 mb-2">
              {editError}
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-2">
            <input
              type="date"
              value={editStart}
              onChange={(e) => setEditStart(e.target.value)}
              className="glass rounded-lg px-2 py-1.5 text-sm outline-none"
            />
            <input
              type="date"
              value={editEnd}
              onChange={(e) => setEditEnd(e.target.value)}
              className="glass rounded-lg px-2 py-1.5 text-sm outline-none"
            />
            <input
              value={editReason}
              onChange={(e) => setEditReason(e.target.value)}
              placeholder="Raison (facultatif)"
              className="glass rounded-lg px-2 py-1.5 text-sm outline-none"
            />
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => saveEdit(a.id)}
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
      <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-white/[0.04] last:border-0 hover:bg-white/[0.03] transition-colors group">
        <div className="flex items-center gap-3 min-w-0">
          <span className="w-8 h-8 rounded-full bg-[rgb(var(--brand-500)/0.18)] text-[rgb(var(--brand-400))] flex items-center justify-center text-xs font-medium overflow-hidden shrink-0">
            {a.agentAvatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={a.agentAvatarUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              a.agentName[0]
            )}
          </span>
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">{a.agentName}</p>
            <p className="text-xs text-[rgb(var(--muted))]">
              {new Date(a.startDate).toLocaleDateString("fr-FR")} → {new Date(a.endDate).toLocaleDateString("fr-FR")}
              {a.reason && ` — ${a.reason}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          <button
            onClick={() => startEdit(a)}
            className="text-[rgb(var(--muted))] hover:text-[rgb(var(--brand-400))] p-1.5"
          >
            <Pencil size={14} />
          </button>
          {has("absencesSupprimer") && (
            <button
              onClick={() => handleDelete(a.id)}
              className="text-[rgb(var(--muted))] hover:text-[rgb(var(--danger))] p-1.5"
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </div>
    );
  }

  function Section({ title, rows, emptyLabel }: { title: string; rows: Absence[]; emptyLabel: string }) {
    return (
      <div className="card-hover glass-strong rounded-xl overflow-hidden border border-transparent mb-4">
        <p className="text-xs text-[rgb(var(--muted))] px-4 py-3 border-b border-white/[0.08]">{title}</p>
        {rows.length === 0 ? (
          <p className="px-4 py-5 text-center text-sm text-[rgb(var(--muted))]">{emptyLabel}</p>
        ) : (
          rows.map((a) => <AbsenceRow key={a.id} a={a} />)
        )}
      </div>
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
      <PageHeader title="Suivi des absences" subtitle={`${absences.length} absence${absences.length > 1 ? "s" : ""} enregistrée${absences.length > 1 ? "s" : ""}`} />

      <form onSubmit={handleSubmit} className="card-hover glass-strong rounded-xl p-5 mb-6 max-w-4xl border border-transparent">
        <h2 className="text-sm font-medium mb-4 flex items-center gap-2.5">
          <span className="w-8 h-8 rounded-lg bg-[rgb(var(--brand-500)/0.14)] flex items-center justify-center">
            <CalendarOff size={14} className="text-[rgb(var(--brand-400))]" />
          </span>
          Déclarer une absence
        </h2>
        {error && (
          <div className="rounded-lg bg-[rgb(var(--danger)/0.12)] text-[rgb(var(--danger))] text-xs px-3 py-2 mb-3">
            {error}
          </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <LabeledSelect
            value={agentId}
            onChange={setAgentId}
            options={agents.map((a) => ({ value: a.id, label: `${a.firstName} ${a.lastName}` }))}
          />
          <div>
            <label className="text-xs text-[rgb(var(--muted))] mb-1 block">Du</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="glass rounded-lg px-3 py-2 text-sm w-full outline-none"
            />
          </div>
          <div>
            <label className="text-xs text-[rgb(var(--muted))] mb-1 block">Au</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="glass rounded-lg px-3 py-2 text-sm w-full outline-none"
            />
          </div>
          <div>
            <label className="text-xs text-[rgb(var(--muted))] mb-1 block">Raison (facultatif)</label>
            <input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Vacances, maladie…"
              className="glass rounded-lg px-3 py-2 text-sm w-full outline-none"
            />
          </div>
        </div>
        <button
          type="submit"
          disabled={saving || !agentId}
          className="mt-4 flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold text-white bg-gradient-to-r from-[rgb(var(--brand-500))] to-[rgb(var(--brand-600))] hover:brightness-110 transition-all disabled:opacity-60"
        >
          <Plus size={15} />
          {saving ? "Enregistrement…" : "Ajouter l'absence"}
        </button>
      </form>

      {!loading && (
        <div className="max-w-4xl">
          <Section title="En cours" rows={current} emptyLabel="Personne n'est absent aujourd'hui." />
          <Section title="À venir" rows={upcoming} emptyLabel="Aucune absence à venir." />
          <Section title="Passées" rows={past} emptyLabel="Aucune absence passée." />
        </div>
      )}
    </PageShell>
  );
}
