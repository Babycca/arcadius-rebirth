"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { PageShell, PageHeader } from "@/components/PageShell";
import GradeSelect from "@/components/GradeSelect";
import { useSession } from "next-auth/react";
import { useToast } from "@/components/ToastProvider";
import { NAV_LABELS } from "@/lib/nav-pages";
import { PERMISSION_DEFS, PERMISSION_GROUPS, parsePermissions, type PermissionKey } from "@/lib/permissions";
import {
  ArrowLeft,
  KeyRound,
  ShieldAlert,
  CalendarOff,
  ScrollText,
  Phone,
  AlertTriangle,
  Receipt,
} from "lucide-react";

type Agent = {
  id: string;
  firstName: string;
  lastName: string;
  loginHandle: string;
  phone: string | null;
  avatarUrl: string | null;
  grade: string;
  role: string;
  active: boolean;
  permissionsJson?: string;
};

type Page = { href: string; hiddenForAll: boolean; hiddenForAgentIds: string };
type Sanction = { id: string; type: string; reason: string; date: string };
type Absence = { id: string; startDate: string; endDate: string; reason: string | null };
type LogEntry = { id: string; action: string; entityType: string; summary: string; createdAt: string };
type Sale = { id: string; date: string; houseNumber: string; priceAmount: number; clientName: string };

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: "Super Admin",
  ADMIN: "Admin",
  AGENT: "Agent",
};

const TYPE_STYLES: Record<string, string> = {
  Avertissement: "bg-[rgb(var(--danger)/0.16)] text-[rgb(var(--danger))]",
  Licenciement: "bg-[rgb(var(--danger)/0.26)] text-[rgb(var(--danger))]",
};

const ACTION_LABELS: Record<string, string> = {
  CREATE: "Création",
  UPDATE: "Modification",
  DELETE: "Suppression",
  LOGIN: "Connexion",
};

export default function AgentProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: session } = useSession();
  const sessionUser = session?.user as { id?: string; role?: string } | undefined;
  const isSuperAdmin = sessionUser?.role === "SUPER_ADMIN";
  const viewerIsAdmin = sessionUser?.role === "ADMIN" || sessionUser?.role === "SUPER_ADMIN";
  const toast = useToast();

  const [agent, setAgent] = useState<Agent | null>(null);
  const [gradeNames, setGradeNames] = useState<string[]>([]);
  const [pages, setPages] = useState<Page[]>([]);
  const [stats, setStats] = useState<{ salesCount: number; total: number } | null>(null);
  const [sales, setSales] = useState<Sale[]>([]);
  const [sanctions, setSanctions] = useState<Sanction[]>([]);
  const [absences, setAbsences] = useState<Absence[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);

  const [phone, setPhone] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [loginHandle, setLoginHandle] = useState("");
  const [identityError, setIdentityError] = useState<string | null>(null);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);
  const [newCreds, setNewCreds] = useState<string | null>(null);

  function load() {
    Promise.all([
      fetch("/api/agents").then((r) => (r.status === 403 ? null : r.json())),
      fetch("/api/commission-rules").then((r) => (r.ok ? r.json() : [])),
      fetch("/api/page-visibility").then((r) => (r.ok ? r.json() : [])),
      fetch(`/api/accounting/agents/${id}/sales`).then((r) => (r.ok ? r.json() : null)),
      fetch("/api/sanctions").then((r) => (r.ok ? r.json() : [])),
      fetch("/api/absences").then((r) => (r.ok ? r.json() : [])),
      fetch(`/api/audit-log?actorId=${id}`).then((r) => (r.ok ? r.json() : null)),
    ]).then(([agentsData, rulesData, pagesData, salesData, sanctionsData, absencesData, logsData]) => {
      if (agentsData === null) {
        setForbidden(true);
        setLoading(false);
        return;
      }
      const found = (agentsData as Agent[]).find((a) => a.id === id) ?? null;
      setAgent(found);
      if (found) {
        setPhone(found.phone ?? "");
        setFirstName(found.firstName);
        setLastName(found.lastName);
        setLoginHandle(found.loginHandle);
      }
      setGradeNames((rulesData as { grade: string }[]).map((r) => r.grade));
      setPages(pagesData);
      if (salesData?.sales) {
        const total = salesData.sales.reduce((s: number, x: { priceAmount: number }) => s + x.priceAmount, 0);
        setStats({ salesCount: salesData.sales.length, total });
        setSales(salesData.sales);
      }
      setSanctions((sanctionsData as (Sanction & { agentId: string })[]).filter((s) => s.agentId === id));
      setAbsences((absencesData as (Absence & { agentId: string })[]).filter((a) => a.agentId === id));
      setLogs(logsData?.logs ?? []);
      setLoading(false);
    });
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  function flashSaved() {
    setSavedMsg("Enregistré ✓");
    setTimeout(() => setSavedMsg(null), 1500);
  }

  async function saveIdentity() {
    setIdentityError(null);
    const res = await fetch(`/api/agents/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ firstName, lastName, loginHandle }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setIdentityError(body?.error ?? "Impossible d'enregistrer ces informations.");
      return;
    }
    flashSaved();
  }

  async function savePhone() {
    await fetch(`/api/agents/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone }),
    });
    flashSaved();
  }

  async function saveGrade(g: string) {
    if (!agent) return;
    setAgent({ ...agent, grade: g });
    await fetch(`/api/agents/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ grade: g }),
    });
    flashSaved();
  }

  async function saveRole() {
    if (!agent) return;
    const next = agent.role === "ADMIN" ? "AGENT" : "ADMIN";
    const res = await fetch(`/api/agents/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: next }),
    });
    if (res.ok) {
      setAgent({ ...agent, role: next });
      flashSaved();
    }
  }

  async function togglePageAccess(href: string) {
    const page = pages.find((p) => p.href === href);
    if (!page) return;
    const current: string[] = JSON.parse(page.hiddenForAgentIds || "[]");
    const next = current.includes(id) ? current.filter((x) => x !== id) : [...current, id];
    setPages((ps) => ps.map((p) => (p.href === href ? { ...p, hiddenForAgentIds: JSON.stringify(next) } : p)));
    await fetch(`/api/page-visibility/${encodeURIComponent(href.slice(1))}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hiddenForAgentIds: next }),
    });
  }

  async function togglePermission(key: PermissionKey) {
    if (!agent) return;
    const current = parsePermissions(agent.permissionsJson);
    const next = { ...current, [key]: !current[key] };
    const permissionsJson = JSON.stringify(next);
    setAgent({ ...agent, permissionsJson });
    await fetch(`/api/agents/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ permissionsJson }),
    });
    flashSaved();
  }

  async function resetPassword() {
    const res = await fetch(`/api/agents/${id}/reset-password`, { method: "POST" });
    if (res.ok) {
      const data = await res.json();
      setNewCreds(data.tempPassword);
      toast("Mot de passe régénéré.");
    }
  }

  if (forbidden) {
    return (
      <PageShell>
        <PageHeader title="Profil agent" subtitle="Accès réservé aux administrateurs" />
      </PageShell>
    );
  }

  if (loading || !agent) {
    return (
      <PageShell>
        <p className="text-sm text-[rgb(var(--muted))]">Chargement…</p>
      </PageShell>
    );
  }

  const warningCount = sanctions.filter((s) => s.type === "Avertissement").length;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const isAbsentToday = absences.some((a) => new Date(a.startDate) <= today && new Date(a.endDate) >= today);

  return (
    <PageShell>
      <Link
        href="/administration"
        className="flex items-center gap-1.5 text-xs text-[rgb(var(--muted))] hover:text-[rgb(var(--brand-400))] mb-5"
      >
        <ArrowLeft size={13} />
        Administration
      </Link>

      <div className="max-w-6xl mx-auto">
        {/* En-tête profil */}
        <div className="card-hover glass-strong rounded-2xl p-6 mb-8 border border-transparent flex flex-col sm:flex-row items-center sm:items-start gap-6">
          <span className="relative w-24 h-24 rounded-full bg-[rgb(var(--brand-500)/0.18)] text-[rgb(var(--brand-400))] flex items-center justify-center text-2xl font-medium overflow-hidden shrink-0 ring-4 ring-[rgb(var(--brand-500)/0.25)] shadow-[0_0_30px_rgb(var(--brand-glow)/0.2)]">
            {agent.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={agent.avatarUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              agent.firstName[0]
            )}
          </span>

          <div className="flex-1 min-w-0 text-center sm:text-left">
            <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap">
              <input
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                onBlur={saveIdentity}
                size={Math.max(firstName.length, 3)}
                className="font-heading text-2xl bg-transparent outline-none border-b border-transparent focus:border-white/20 text-center sm:text-left"
              />
              <input
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                onBlur={saveIdentity}
                size={Math.max(lastName.length, 3)}
                className="font-heading text-2xl bg-transparent outline-none border-b border-transparent focus:border-white/20 text-center sm:text-left"
              />
              {savedMsg && <span className="text-xs text-[rgb(var(--success))]">{savedMsg}</span>}
            </div>
            <input
              value={loginHandle}
              onChange={(e) => setLoginHandle(e.target.value)}
              onBlur={saveIdentity}
              className="text-xs text-[rgb(var(--muted))] font-mono bg-transparent outline-none border-b border-transparent focus:border-white/20 mt-1 text-center sm:text-left"
            />
            {identityError && <p className="text-xs text-[rgb(var(--danger))] mt-1">{identityError}</p>}

            <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap mt-3">
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[rgb(var(--brand-400))] bg-[rgb(var(--brand-500)/0.12)] border border-[rgb(var(--brand-500)/0.25)] rounded-full px-3 py-1">
                {agent.grade}
                {agent.role !== "SUPER_ADMIN" && (
                  <>
                    <span className="w-1 h-1 rounded-full bg-[rgb(var(--brand-400))]" />
                    {ROLE_LABELS[agent.role] ?? agent.role}
                  </>
                )}
              </span>
              {isAbsentToday && (
                <span className="flex items-center gap-1.5">
                  <span
                    className="w-1.5 h-1.5 rounded-full bg-[rgb(var(--danger))] shrink-0"
                    style={{ boxShadow: "0 0 6px 1.5px rgb(var(--danger))" }}
                  />
                  <span className="text-xs italic text-[rgb(var(--danger)/0.85)]">Absence</span>
                </span>
              )}
              {warningCount >= 2 && (
                <span className="flex items-center gap-1 text-xs text-[rgb(var(--danger))] font-medium animate-pulse">
                  <AlertTriangle size={12} />
                  Attention — {warningCount} avertissements
                </span>
              )}
              {!agent.active && <span className="text-xs text-[rgb(var(--muted))]">— compte désactivé</span>}
            </div>
          </div>

          <div className="flex flex-col gap-3 shrink-0 w-full sm:w-48">
            <div>
              <label className="text-xs text-[rgb(var(--muted))] mb-1 flex items-center gap-1.5">
                <Phone size={11} />
                Téléphone
              </label>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                onBlur={savePhone}
                placeholder="—"
                className="glass rounded-lg px-3 py-1.5 text-sm w-full outline-none"
              />
            </div>
            <div>
              <label className="text-xs text-[rgb(var(--muted))] mb-1 block">Grade</label>
              <GradeSelect value={agent.grade} grades={gradeNames.length > 0 ? gradeNames : [agent.grade]} onChange={saveGrade} />
            </div>
            {isSuperAdmin && agent.role !== "SUPER_ADMIN" && (
              <button
                onClick={saveRole}
                disabled={agent.id === sessionUser?.id}
                className={`text-xs rounded-full px-3 py-1.5 disabled:opacity-40 ${
                  agent.role === "ADMIN"
                    ? "bg-[rgb(var(--brand-500)/0.18)] text-[rgb(var(--brand-400))]"
                    : "glass text-[rgb(var(--muted))]"
                }`}
              >
                {agent.role === "ADMIN" ? "Admin — accès édition" : "Agent simple"}
              </button>
            )}
            <button
              onClick={resetPassword}
              className="flex items-center justify-center gap-1.5 text-xs text-[rgb(var(--muted))] hover:text-[rgb(var(--brand-400))]"
            >
              <KeyRound size={13} />
              Régénérer son mot de passe
            </button>
            {newCreds && (
              <p className="text-xs text-center">
                Nouveau : <span className="font-mono text-[rgb(var(--brand-400))]">{newCreds}</span>
              </p>
            )}
          </div>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 gap-3 mb-6 max-w-md">
            <div className="glass-strong rounded-xl p-4">
              <p className="text-xs text-[rgb(var(--muted))]">Ventes (semaine en cours)</p>
              <p className="text-xl font-semibold">{stats.salesCount}</p>
            </div>
            <div className="glass-strong rounded-xl p-4">
              <p className="text-xs text-[rgb(var(--muted))]">CA généré</p>
              <p className="text-xl font-semibold text-[rgb(var(--brand-400))]">
                ${stats.total.toLocaleString("fr-FR")}
              </p>
            </div>
          </div>
        )}

        {/* Dernières ventes */}
        <div className="card-hover glass-strong rounded-xl overflow-hidden border border-transparent mb-6">
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.08]">
            <p className="text-xs text-[rgb(var(--muted))] flex items-center gap-1.5">
              <Receipt size={13} />
              Dernières ventes (semaine en cours)
            </p>
            <Link href="/comptabilite" className="text-xs text-[rgb(var(--brand-400))] hover:underline">
              Voir la compta
            </Link>
          </div>
          {sales.length === 0 ? (
            <p className="px-4 py-5 text-center text-sm text-[rgb(var(--muted))]">Aucune vente cette semaine.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-[rgb(var(--muted))] border-b border-white/[0.08]">
                  <th className="px-4 py-2 font-normal">Date</th>
                  <th className="px-4 py-2 font-normal">Habitation</th>
                  <th className="px-4 py-2 font-normal">Client</th>
                  <th className="px-4 py-2 font-normal text-right">Prix</th>
                </tr>
              </thead>
              <tbody>
                {sales.slice(0, 5).map((s) => (
                  <tr key={s.id} className="border-b border-white/[0.04] last:border-0">
                    <td className="px-4 py-2">{new Date(s.date).toLocaleDateString("fr-FR")}</td>
                    <td className="px-4 py-2">#{s.houseNumber}</td>
                    <td className="px-4 py-2">{s.clientName}</td>
                    <td className="px-4 py-2 text-right font-medium text-[rgb(var(--brand-400))]">
                      ${s.priceAmount.toLocaleString("fr-FR")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Sanctions */}
          <div className="card-hover glass-strong rounded-xl overflow-hidden border border-transparent">
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.08]">
              <p className="text-xs text-[rgb(var(--muted))] flex items-center gap-1.5">
                <ShieldAlert size={13} />
                Sanctions
              </p>
              <Link href="/administration/sanctions" className="text-xs text-[rgb(var(--brand-400))] hover:underline">
                Gérer
              </Link>
            </div>
            {sanctions.length === 0 ? (
              <p className="px-4 py-5 text-center text-sm text-[rgb(var(--muted))]">Aucune sanction.</p>
            ) : (
              <div className="max-h-64 overflow-y-auto">
                {sanctions.map((s) => (
                  <div key={s.id} className="px-4 py-2.5 border-b border-white/[0.04] last:border-0">
                    <p className="text-sm flex items-center gap-2">
                      <span className={`text-[10px] font-medium rounded-full px-2 py-0.5 ${TYPE_STYLES[s.type] ?? "bg-white/[0.08] text-[rgb(var(--muted))]"}`}>
                        {s.type}
                      </span>
                    </p>
                    <p className="text-xs text-[rgb(var(--muted))] mt-1">
                      {new Date(s.date).toLocaleDateString("fr-FR")} — {s.reason}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Absences */}
          <div className="card-hover glass-strong rounded-xl overflow-hidden border border-transparent">
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.08]">
              <p className="text-xs text-[rgb(var(--muted))] flex items-center gap-1.5">
                <CalendarOff size={13} />
                Absences
              </p>
              <Link href="/administration/absences" className="text-xs text-[rgb(var(--brand-400))] hover:underline">
                Gérer
              </Link>
            </div>
            {absences.length === 0 ? (
              <p className="px-4 py-5 text-center text-sm text-[rgb(var(--muted))]">Aucune absence.</p>
            ) : (
              <div className="max-h-64 overflow-y-auto">
                {absences.map((a) => (
                  <div key={a.id} className="px-4 py-2.5 border-b border-white/[0.04] last:border-0">
                    <p className="text-sm">
                      {new Date(a.startDate).toLocaleDateString("fr-FR")} → {new Date(a.endDate).toLocaleDateString("fr-FR")}
                    </p>
                    {a.reason && <p className="text-xs text-[rgb(var(--muted))] mt-0.5">{a.reason}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Journal d'activité */}
          <div className="card-hover glass-strong rounded-xl overflow-hidden border border-transparent">
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.08]">
              <p className="text-xs text-[rgb(var(--muted))] flex items-center gap-1.5">
                <ScrollText size={13} />
                Dernières actions
              </p>
              <Link href="/administration/journal" className="text-xs text-[rgb(var(--brand-400))] hover:underline">
                Journal complet
              </Link>
            </div>
            {logs.length === 0 ? (
              <p className="px-4 py-5 text-center text-sm text-[rgb(var(--muted))]">Aucune activité récente.</p>
            ) : (
              <div className="max-h-64 overflow-y-auto">
                {logs.slice(0, 10).map((l) => (
                  <div key={l.id} className="px-4 py-2.5 border-b border-white/[0.04] last:border-0">
                    <p className="text-sm">{l.summary}</p>
                    <p className="text-xs text-[rgb(var(--muted))] mt-0.5">
                      {ACTION_LABELS[l.action] ?? l.action} · {new Date(l.createdAt).toLocaleString("fr-FR")}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Pages visibles */}
          <div className="card-hover glass-strong rounded-xl overflow-hidden border border-transparent">
            <p className="text-xs text-[rgb(var(--muted))] px-4 py-3 border-b border-white/[0.08]">
              Pages visibles pour ce compte
            </p>
            <div className="max-h-64 overflow-y-auto px-2 py-1">
              {pages.map((p) => {
                const ids: string[] = JSON.parse(p.hiddenForAgentIds || "[]");
                const visible = p.hiddenForAll ? ids.includes(id) : !ids.includes(id);
                return (
                  <label
                    key={p.href}
                    className="flex items-center justify-between gap-2 px-2 py-1.5 rounded-lg hover:bg-white/[0.04] cursor-pointer text-sm"
                  >
                    <span>
                      {NAV_LABELS[p.href] ?? p.href}
                      {p.hiddenForAll && (
                        <span className="text-[rgb(var(--muted))] text-xs ml-1.5">(masquée pour tous)</span>
                      )}
                    </span>
                    <input type="checkbox" checked={visible} onChange={() => togglePageAccess(p.href)} />
                  </label>
                );
              })}
            </div>
          </div>
        </div>

        {/* Permissions fines (hors admin/super admin — ils ont déjà tout) */}
        {agent.role === "AGENT" && (
          <div className="card-hover glass-strong rounded-xl overflow-hidden border border-transparent mb-6">
            <p className="text-xs text-[rgb(var(--muted))] px-4 py-3 border-b border-white/[0.08]">
              Permissions — accès ponctuel accordé à cet agent simple
            </p>
            <div className="px-2 py-1">
              {PERMISSION_GROUPS.map((group) => (
                <div key={group} className="mb-1 last:mb-0">
                  <p className="text-[10px] uppercase tracking-wide text-[rgb(var(--muted))] px-2 pt-3 pb-1">
                    {group}
                  </p>
                  {PERMISSION_DEFS.filter((p) => p.group === group).map((p) => {
                    const checked = !!parsePermissions(agent.permissionsJson)[p.key];
                    return (
                      <label
                        key={p.key}
                        className={`flex items-center justify-between gap-3 px-2 py-2 rounded-lg text-sm ${
                          viewerIsAdmin ? "hover:bg-white/[0.04] cursor-pointer" : "opacity-70"
                        }`}
                      >
                        <span>{p.label}</span>
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={!viewerIsAdmin}
                          onChange={() => togglePermission(p.key)}
                        />
                      </label>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </PageShell>
  );
}
