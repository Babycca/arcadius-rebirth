"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { PageShell, PageHeader } from "@/components/PageShell";
import EditorModeBanner from "@/components/EditorModeBanner";
import GradeSelect from "@/components/GradeSelect";
import PageVisibilityPanel from "@/components/PageVisibilityPanel";
import ZoneCategoriesPanel from "@/components/ZoneCategoriesPanel";
import AgentDetailModal from "@/components/AgentDetailModal";
import { useCanEdit } from "@/lib/use-can-edit";
import { useDialog } from "@/components/DialogProvider";
import { useToast } from "@/components/ToastProvider";
import { Plus, KeyRound, Trash2, ChevronUp, ChevronDown, UserX, UserCheck, Archive, ScrollText, CalendarOff } from "lucide-react";
import Link from "next/link";

type Agent = {
  id: string;
  firstName: string;
  lastName: string;
  loginHandle: string;
  phone: string | null;
  grade: string;
  role: string;
  canAccessAccounting: boolean;
  active: boolean;
};

type CommissionRule = {
  id: string;
  grade: string;
  commissionRate: number;
  bonusAmount: number;
};

export default function AdministrationPage() {
  const { canEdit } = useCanEdit();
  const { confirm, alertDialog } = useDialog();
  const toast = useToast();
  const { data: session } = useSession();
  const sessionUser = session?.user as { id?: string; role?: string } | undefined;
  const isSuperAdmin = sessionUser?.role === "SUPER_ADMIN";
  const [openAgent, setOpenAgent] = useState<Agent | null>(null);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [rules, setRules] = useState<CommissionRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [creating, setCreating] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [grade, setGrade] = useState("");
  const [newCreds, setNewCreds] = useState<{ loginHandle: string | null; tempPassword: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [newGradeName, setNewGradeName] = useState("");
  const [newGradeRate, setNewGradeRate] = useState("");
  const [newGradeBonus, setNewGradeBonus] = useState("");

  async function load() {
    const [agentsRes, rulesRes] = await Promise.all([
      fetch("/api/agents"),
      fetch("/api/commission-rules"),
    ]);
    if (agentsRes.status === 403) {
      setForbidden(true);
      return;
    }
    const agentsData: Agent[] = await agentsRes.json();
    const rulesData: CommissionRule[] = await rulesRes.json();
    setAgents(agentsData);
    setRules(rulesData);
    if (!grade && rulesData.length > 0) setGrade(defaultGrade(rulesData));
    setLoading(false);
    return { agentsData, rulesData };
  }

  // Grade proposé par défaut pour un nouvel agent : "Secrétaire d'agence" si
  // ce grade existe, sinon le premier grade de la grille.
  function defaultGrade(rulesData: CommissionRule[]) {
    return rulesData.find((r) => r.grade === "Secrétaire d'agence")?.grade ?? rulesData[0]?.grade ?? "";
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setError(null);
    const res = await fetch("/api/agents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ firstName, lastName, phone, grade }),
    });
    setCreating(false);
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(body?.error ?? "Impossible de créer cet agent.");
      return;
    }
    const data = await res.json();
    setNewCreds({ loginHandle: data.agent.loginHandle, tempPassword: data.tempPassword });
    setFirstName("");
    setLastName("");
    setPhone("");
    const loaded = await load();
    if (loaded) {
      setGrade(defaultGrade(loaded.rulesData));
      await placeAgentByGrade(data.agent.id, data.agent.grade, loaded.agentsData, loaded.rulesData);
    }
  }

  // Insère le nouvel agent dans la liste au bon endroit selon la hiérarchie
  // des grades (ordre de la grille "Grades, commissions & primes"), plutôt
  // que de le laisser à la position par défaut renvoyée par l'API.
  async function placeAgentByGrade(
    newAgentId: string,
    newAgentGrade: string,
    agentsData: Agent[],
    rulesData: CommissionRule[]
  ) {
    const rankOf = (g: string) => {
      const idx = rulesData.findIndex((r) => r.grade === g);
      return idx === -1 ? rulesData.length : idx;
    };
    const active = agentsData.filter((a) => a.active && a.id !== newAgentId);
    const archived = agentsData.filter((a) => !a.active);
    const newRank = rankOf(newAgentGrade);
    const insertAt = active.findIndex((a) => rankOf(a.grade) > newRank);
    const reordered =
      insertAt === -1
        ? [...active, agentsData.find((a) => a.id === newAgentId)!]
        : [...active.slice(0, insertAt), agentsData.find((a) => a.id === newAgentId)!, ...active.slice(insertAt)];

    setAgents([...reordered, ...archived]);
    await fetch("/api/agents/reorder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: reordered.map((a) => a.id) }),
    });
  }

  async function updateField(id: string, field: string, value: string) {
    const res = await fetch(`/api/agents/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: value }),
    });
    if (res.ok) toast("Modification enregistrée.");
    else toast("Échec de l'enregistrement.", "error");
    load();
  }

  async function toggleRole(id: string, currentRole: string) {
    const nextRole = currentRole === "ADMIN" ? "AGENT" : "ADMIN";
    const res = await fetch(`/api/agents/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: nextRole }),
    });
    if (res.ok) load();
    else {
      const body = await res.json().catch(() => null);
      await alertDialog(body?.error ?? "Impossible de changer le rôle.");
    }
  }

  async function moveAgent(index: number, dir: -1 | 1) {
    const activeAgents = agents.filter((a) => a.active);
    const target = index + dir;
    if (target < 0 || target >= activeAgents.length) return;
    const reordered = [...activeAgents];
    [reordered[index], reordered[target]] = [reordered[target], reordered[index]];

    const archivedAgents = agents.filter((a) => !a.active);
    setAgents([...reordered, ...archivedAgents]);

    await fetch("/api/agents/reorder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: reordered.map((a) => a.id) }),
    });
  }

  async function toggleActive(agent: Agent) {
    if (agent.active) {
      const ok = await confirm(
        `Désactiver ${agent.firstName} ${agent.lastName} ? Le compte ne pourra plus se connecter et passera dans "Archive Employés". Ses ventes passées resteront visibles dans les anciennes comptas.`,
        { danger: true, confirmLabel: "Désactiver" }
      );
      if (!ok) return;
    }
    const res = await fetch(`/api/agents/${agent.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !agent.active }),
    });
    if (res.ok) {
      toast(agent.active ? "Compte désactivé." : "Compte réactivé.");
      load();
    } else {
      const body = await res.json().catch(() => null);
      await alertDialog(body?.error ?? "Impossible de changer le statut de ce compte.");
    }
  }

  async function deletePermanently(agent: Agent) {
    const ok = await confirm(
      `Supprimer définitivement ${agent.firstName} ${agent.lastName} ? Action irréversible — le compte n'apparaîtra plus nulle part. Ses ventes/garages passés (s'il en a) resteront dans les archives mais associés à un agent "Inconnu".`,
      { danger: true, confirmLabel: "Supprimer définitivement" }
    );
    if (!ok) return;
    const res = await fetch(`/api/agents/${agent.id}`, { method: "DELETE" });
    if (res.ok) {
      toast("Compte supprimé définitivement.");
      load();
    } else {
      const body = await res.json().catch(() => null);
      await alertDialog(body?.error ?? "Impossible de supprimer ce compte.");
    }
  }

  async function resetPassword(id: string) {
    const res = await fetch(`/api/agents/${id}/reset-password`, { method: "POST" });
    if (res.ok) {
      const data = await res.json();
      setNewCreds({ loginHandle: null, tempPassword: data.tempPassword });
    }
  }

  async function createGrade() {
    if (!newGradeName.trim() || !newGradeRate) return;
    const res = await fetch("/api/commission-rules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        grade: newGradeName.trim(),
        commissionRate: newGradeRate,
        bonusAmount: newGradeBonus || 0,
      }),
    });
    if (res.ok) {
      setNewGradeName("");
      setNewGradeRate("");
      setNewGradeBonus("");
      load();
    }
  }

  async function updateGrade(id: string, field: string, value: string) {
    const res = await fetch(`/api/commission-rules/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: value }),
    });
    if (field === "grade") {
      if (res.ok) load();
      else {
        const body = await res.json().catch(() => null);
        await alertDialog(body?.error ?? "Impossible de renommer ce grade.");
        load();
      }
    }
  }

  async function moveGrade(index: number, dir: -1 | 1) {
    const next = [...rules];
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setRules(next);
    await fetch("/api/commission-rules/reorder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: next.map((r) => r.id) }),
    });
  }

  async function deleteGrade(id: string) {
    setRules((r) => r.filter((x) => x.id !== id));
    await fetch(`/api/commission-rules/${id}`, { method: "DELETE" });
  }

  if (forbidden) {
    return (
      <PageShell>
        <PageHeader title="Administration" subtitle="Accès réservé aux administrateurs" />
      </PageShell>
    );
  }

  const gradeNames = rules.map((r) => r.grade);
  const activeAgents = agents.filter((a) => a.active);
  const archivedAgents = agents.filter((a) => !a.active);

  return (
    <PageShell>
      <PageHeader title="Administration" subtitle={`${agents.length} comptes agents`} />
      <EditorModeBanner />

      <div className="flex gap-3 mb-6 flex-wrap">
        <Link
          href="/administration/journal"
          className="inline-flex items-center gap-2 text-sm rounded-xl px-4 py-2.5 glass hover:border-[rgb(var(--brand-500)/0.4)] transition-colors"
        >
          <ScrollText size={14} />
          Journal d&apos;activité
        </Link>
        <Link
          href="/administration/absences"
          className="inline-flex items-center gap-2 text-sm rounded-xl px-4 py-2.5 glass hover:border-[rgb(var(--brand-500)/0.4)] transition-colors"
        >
          <CalendarOff size={14} />
          Suivi des absences
        </Link>
      </div>

      <div className="max-w-6xl mx-auto">
      {newCreds && (
        <div className="glass-strong rounded-xl p-4 mb-6 max-w-lg mx-auto border border-[rgb(var(--brand-500)/0.4)]">
          <p className="text-sm font-medium mb-1">
            {newCreds.loginHandle ? "Compte créé" : "Mot de passe régénéré"} — transmets ces identifiants à l&apos;agent :
          </p>
          {newCreds.loginHandle && (
            <p className="text-sm">
              Identifiant : <span className="font-mono text-[rgb(var(--brand-400))]">{newCreds.loginHandle}</span>
            </p>
          )}
          <p className="text-sm">
            Mot de passe : <span className="font-mono text-[rgb(var(--brand-400))]">{newCreds.tempPassword}</span>
          </p>
          <button onClick={() => setNewCreds(null)} className="text-xs text-[rgb(var(--muted))] mt-2 underline">
            Fermer
          </button>
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-6">
        <form onSubmit={handleCreate} className="card-hover glass-strong rounded-xl p-5 flex-1 min-w-0 max-w-lg lg:max-w-none border border-transparent">
          <h2 className="text-sm font-medium mb-4">Créer un agent</h2>
          {error && (
            <div className="rounded-lg bg-[rgb(var(--danger)/0.12)] text-[rgb(var(--danger))] text-xs px-3 py-2 mb-3">
              {error}
            </div>
          )}
          <div className="grid grid-cols-2 gap-3 mb-3">
            <input
              required
              placeholder="Prénom"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="glass rounded-lg px-3 py-2 text-sm outline-none"
            />
            <input
              required
              placeholder="Nom"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="glass rounded-lg px-3 py-2 text-sm outline-none"
            />
          </div>
          <input
            placeholder="Téléphone (optionnel)"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="glass rounded-lg px-3 py-2 text-sm outline-none w-full mb-3"
          />
          {gradeNames.length > 0 && (
            <div className="mb-4">
              <GradeSelect value={grade} grades={gradeNames} onChange={setGrade} />
            </div>
          )}
          <button
            type="submit"
            disabled={creating}
            className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-[rgb(var(--brand-500))] to-[rgb(var(--brand-600))] hover:brightness-110 transition-all disabled:opacity-60"
          >
            <Plus size={15} />
            {creating ? "Création…" : "Créer l'agent"}
          </button>
        </form>

        {canEdit && (
          <div className="card-hover glass-strong rounded-xl p-5 flex-1 min-w-0 max-w-lg lg:max-w-none border border-transparent">
            <h2 className="text-sm font-medium mb-1">Grades, commissions &amp; primes</h2>
            <p className="text-xs text-[rgb(var(--muted))] mb-4">
              Utilisés pour le calcul du salaire en Comptabilité.
            </p>
            <div className="flex flex-col gap-2 mb-4">
              {rules.map((r, i) => (
                <div key={r.id} className="flex items-center gap-2">
                  <div className="flex flex-col shrink-0">
                    <button onClick={() => moveGrade(i, -1)} className="text-[rgb(var(--muted))] hover:text-[rgb(var(--foreground))]">
                      <ChevronUp size={12} />
                    </button>
                    <button onClick={() => moveGrade(i, 1)} className="text-[rgb(var(--muted))] hover:text-[rgb(var(--foreground))]">
                      <ChevronDown size={12} />
                    </button>
                  </div>
                  <input
                    defaultValue={r.grade}
                    onBlur={(e) => {
                      if (e.target.value.trim() && e.target.value.trim() !== r.grade) {
                        updateGrade(r.id, "grade", e.target.value.trim());
                      }
                    }}
                    className="text-sm flex-1 bg-transparent outline-none border-b border-transparent focus:border-white/20"
                  />
                  <div className="flex items-center gap-1">
                    <input
                      defaultValue={r.commissionRate}
                      type="number"
                      onBlur={(e) => updateGrade(r.id, "commissionRate", e.target.value)}
                      className="glass rounded-lg px-2 py-1 text-xs w-16 outline-none"
                    />
                    <span className="text-xs text-[rgb(var(--muted))]">%</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-[rgb(var(--muted))]">$</span>
                    <input
                      defaultValue={r.bonusAmount}
                      type="number"
                      onBlur={(e) => updateGrade(r.id, "bonusAmount", e.target.value)}
                      className="glass rounded-lg px-2 py-1 text-xs w-20 outline-none"
                    />
                  </div>
                  <button onClick={() => deleteGrade(r.id)} className="text-[rgb(var(--muted))] hover:text-[rgb(var(--danger))] p-1">
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                value={newGradeName}
                onChange={(e) => setNewGradeName(e.target.value)}
                placeholder="Nom du grade"
                className="glass rounded-lg px-2 py-1.5 text-xs outline-none flex-1"
              />
              <input
                value={newGradeRate}
                onChange={(e) => setNewGradeRate(e.target.value)}
                placeholder="%"
                type="number"
                className="glass rounded-lg px-2 py-1.5 text-xs outline-none w-16"
              />
              <input
                value={newGradeBonus}
                onChange={(e) => setNewGradeBonus(e.target.value)}
                placeholder="Prime $"
                type="number"
                className="glass rounded-lg px-2 py-1.5 text-xs outline-none w-20"
              />
              <button
                onClick={createGrade}
                className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium text-white bg-gradient-to-r from-[rgb(var(--brand-500))] to-[rgb(var(--brand-600))]"
              >
                <Plus size={12} />
              </button>
            </div>
          </div>
        )}
      </div>

      {canEdit && (
        <div className="flex flex-col lg:flex-row gap-6 mt-6">
          <PageVisibilityPanel />
          <ZoneCategoriesPanel />
        </div>
      )}

      <div className="card-hover glass-strong rounded-xl overflow-hidden mt-6 border border-transparent">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-[rgb(var(--muted))] border-b border-white/[0.08]">
              <th className="px-4 py-3 font-normal w-8"></th>
              <th className="px-4 py-3 font-normal">Agent</th>
              <th className="px-4 py-3 font-normal">Identifiant</th>
              <th className="px-4 py-3 font-normal">Téléphone</th>
              <th className="px-4 py-3 font-normal">Grade</th>
              <th className="px-4 py-3 font-normal">Rôle</th>
              <th className="px-4 py-3 font-normal"></th>
            </tr>
          </thead>
          <tbody>
            {!loading && activeAgents.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-[rgb(var(--muted))] text-sm">
                  Aucun agent.
                </td>
              </tr>
            )}
            {activeAgents.map((a, i) => (
              <tr key={a.id} className="border-b border-white/[0.04] last:border-0 hover:bg-white/[0.03]">
                <td className="px-4 py-2.5">
                  <div className="flex flex-col">
                    <button
                      onClick={() => moveAgent(i, -1)}
                      disabled={i === 0}
                      className="text-[rgb(var(--muted))] hover:text-[rgb(var(--foreground))] disabled:opacity-20"
                    >
                      <ChevronUp size={12} />
                    </button>
                    <button
                      onClick={() => moveAgent(i, 1)}
                      disabled={i === activeAgents.length - 1}
                      className="text-[rgb(var(--muted))] hover:text-[rgb(var(--foreground))] disabled:opacity-20"
                    >
                      <ChevronDown size={12} />
                    </button>
                  </div>
                </td>
                <td className="px-4 py-2.5">
                  <button
                    onClick={() => setOpenAgent(a)}
                    className="font-medium hover:text-[rgb(var(--brand-400))] transition-colors text-left"
                  >
                    {a.firstName} {a.lastName}
                  </button>
                </td>
                <td className="px-4 py-2.5 text-[rgb(var(--muted))] font-mono text-xs">{a.loginHandle}</td>
                <td className="px-4 py-2.5">
                  <input
                    defaultValue={a.phone ?? ""}
                    onBlur={(e) => updateField(a.id, "phone", e.target.value)}
                    className="bg-transparent outline-none text-sm w-28 border-b border-transparent focus:border-white/20"
                    placeholder="—"
                  />
                </td>
                <td className="px-4 py-2.5">
                  <GradeSelect
                    value={a.grade}
                    grades={gradeNames.length > 0 ? gradeNames : [a.grade]}
                    onChange={(g) => updateField(a.id, "grade", g)}
                  />
                </td>
                <td className="px-4 py-2.5">
                  {a.role === "SUPER_ADMIN" ? (
                    isSuperAdmin ? (
                      <span className="text-xs text-[rgb(var(--muted))]">SUPER_ADMIN</span>
                    ) : (
                      <span className="text-xs text-[rgb(var(--muted))]">—</span>
                    )
                  ) : isSuperAdmin ? (
                    <button
                      onClick={() => toggleRole(a.id, a.role)}
                      disabled={a.id === sessionUser?.id}
                      className={`flex items-center gap-2 text-xs rounded-full px-2.5 py-1 transition-colors disabled:opacity-40 ${
                        a.role === "ADMIN"
                          ? "bg-[rgb(var(--brand-500)/0.18)] text-[rgb(var(--brand-400))]"
                          : "glass text-[rgb(var(--muted))]"
                      }`}
                      title={a.id === sessionUser?.id ? "Tu ne peux pas changer ton propre rôle" : "Changer le rôle"}
                    >
                      {a.role === "ADMIN" ? "Admin" : "Agent"}
                    </button>
                  ) : (
                    <span className="text-xs text-[rgb(var(--muted))]">{a.role}</span>
                  )}
                </td>
                <td className="px-4 py-2.5 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      onClick={() => resetPassword(a.id)}
                      title="Régénérer un mot de passe"
                      className="text-[rgb(var(--muted))] hover:text-[rgb(var(--brand-400))] p-1.5"
                    >
                      <KeyRound size={14} />
                    </button>
                    {a.role !== "SUPER_ADMIN" && a.id !== sessionUser?.id && (
                      <button
                        onClick={() => toggleActive(a)}
                        title="Désactiver ce compte (démission)"
                        className="text-[rgb(var(--muted))] hover:text-[rgb(var(--danger))] p-1.5"
                      >
                        <UserX size={14} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {archivedAgents.length > 0 && (
        <div className="card-hover glass-strong rounded-xl overflow-hidden mt-6 border border-transparent">
          <div className="px-4 py-3 border-b border-white/[0.08] flex items-center gap-2">
            <Archive size={14} className="text-[rgb(var(--muted))]" />
            <h2 className="text-sm font-medium">Archive Employés</h2>
            <span className="text-xs text-[rgb(var(--muted))]">
              — comptes désactivés, ne peuvent plus se connecter, toujours visibles dans les anciennes comptas
            </span>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-[rgb(var(--muted))] border-b border-white/[0.08]">
                <th className="px-4 py-3 font-normal">Agent</th>
                <th className="px-4 py-3 font-normal">Identifiant</th>
                <th className="px-4 py-3 font-normal">Grade</th>
                <th className="px-4 py-3 font-normal"></th>
              </tr>
            </thead>
            <tbody>
              {archivedAgents.map((a) => (
                <tr key={a.id} className="border-b border-white/[0.04] last:border-0 opacity-60">
                  <td className="px-4 py-2.5">{a.firstName} {a.lastName}</td>
                  <td className="px-4 py-2.5 text-[rgb(var(--muted))] font-mono text-xs">{a.loginHandle}</td>
                  <td className="px-4 py-2.5 text-[rgb(var(--muted))]">{a.grade}</td>
                  <td className="px-4 py-2.5 text-right">
                    <div className="flex items-center justify-end gap-3">
                      <button
                        onClick={() => toggleActive(a)}
                        className="flex items-center gap-1.5 text-xs text-[rgb(var(--brand-400))] hover:brightness-110"
                      >
                        <UserCheck size={14} />
                        Réactiver
                      </button>
                      <button
                        onClick={() => deletePermanently(a)}
                        className="flex items-center gap-1.5 text-xs text-[rgb(var(--danger))] hover:brightness-110"
                      >
                        <Trash2 size={14} />
                        Supprimer
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      </div>

      {openAgent && (
        <AgentDetailModal
          agent={openAgent}
          gradeNames={gradeNames}
          isSuperAdmin={isSuperAdmin}
          isSelf={openAgent.id === sessionUser?.id}
          onClose={() => setOpenAgent(null)}
          onChanged={load}
        />
      )}
    </PageShell>
  );
}
