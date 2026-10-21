"use client";

import { useEffect, useState } from "react";
import { X, KeyRound } from "lucide-react";
import GradeSelect from "./GradeSelect";
import { NAV_LABELS } from "@/lib/nav-pages";

type Agent = {
  id: string;
  firstName: string;
  lastName: string;
  loginHandle: string;
  phone: string | null;
  grade: string;
  role: string;
};

type Page = { href: string; hiddenForAll: boolean; hiddenForAgentIds: string };

export default function AgentDetailModal({
  agent,
  gradeNames,
  isSuperAdmin,
  isSelf,
  onClose,
  onChanged,
}: {
  agent: Agent;
  gradeNames: string[];
  isSuperAdmin: boolean;
  isSelf: boolean;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [phone, setPhone] = useState(agent.phone ?? "");
  const [grade, setGrade] = useState(agent.grade);
  const [role, setRole] = useState(agent.role);
  const [firstName, setFirstName] = useState(agent.firstName);
  const [lastName, setLastName] = useState(agent.lastName);
  const [loginHandle, setLoginHandle] = useState(agent.loginHandle);
  const [identityError, setIdentityError] = useState<string | null>(null);
  const [pages, setPages] = useState<Page[]>([]);
  const [stats, setStats] = useState<{ salesCount: number; total: number } | null>(null);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);
  const [newCreds, setNewCreds] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/page-visibility")
      .then((r) => r.json())
      .then(setPages);
    fetch(`/api/accounting/agents/${agent.id}/sales`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.sales) {
          const total = data.sales.reduce((s: number, x: { priceAmount: number }) => s + x.priceAmount, 0);
          setStats({ salesCount: data.sales.length, total });
        }
      });
  }, [agent.id]);

  async function savePhone() {
    await fetch(`/api/agents/${agent.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone }),
    });
    flashSaved();
  }

  async function saveIdentity() {
    setIdentityError(null);
    const res = await fetch(`/api/agents/${agent.id}`, {
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
    onChanged();
  }

  async function saveGrade(g: string) {
    setGrade(g);
    await fetch(`/api/agents/${agent.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ grade: g }),
    });
    flashSaved();
    onChanged();
  }

  async function saveRole() {
    const next = role === "ADMIN" ? "AGENT" : "ADMIN";
    const res = await fetch(`/api/agents/${agent.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: next }),
    });
    if (res.ok) {
      setRole(next);
      flashSaved();
      onChanged();
    }
  }

  async function togglePageAccess(href: string) {
    const page = pages.find((p) => p.href === href);
    if (!page) return;
    const current: string[] = JSON.parse(page.hiddenForAgentIds || "[]");
    const next = current.includes(agent.id) ? current.filter((id) => id !== agent.id) : [...current, agent.id];
    setPages((ps) => ps.map((p) => (p.href === href ? { ...p, hiddenForAgentIds: JSON.stringify(next) } : p)));
    await fetch(`/api/page-visibility/${encodeURIComponent(href.slice(1))}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hiddenForAgentIds: next }),
    });
  }

  async function resetPassword() {
    const res = await fetch(`/api/agents/${agent.id}/reset-password`, { method: "POST" });
    if (res.ok) {
      const data = await res.json();
      setNewCreds(data.tempPassword);
    }
  }

  function flashSaved() {
    setSavedMsg("Enregistré ✓");
    setTimeout(() => setSavedMsg(null), 1500);
  }

  return (
    <div className="fixed inset-0 z-[3000] flex items-center justify-center bg-black/60 p-4">
      <div className="glass-strong rounded-2xl p-6 w-full max-w-lg max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5 gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <input
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                onBlur={saveIdentity}
                className="font-heading text-lg bg-transparent outline-none border-b border-transparent focus:border-white/20 w-28"
              />
              <input
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                onBlur={saveIdentity}
                className="font-heading text-lg bg-transparent outline-none border-b border-transparent focus:border-white/20 w-28"
              />
            </div>
            <input
              value={loginHandle}
              onChange={(e) => setLoginHandle(e.target.value)}
              onBlur={saveIdentity}
              className="text-xs text-[rgb(var(--muted))] font-mono bg-transparent outline-none border-b border-transparent focus:border-white/20 mt-0.5 w-full"
            />
            {identityError && <p className="text-xs text-[rgb(var(--danger))] mt-1">{identityError}</p>}
          </div>
          <div className="flex items-center gap-3 shrink-0">
            {savedMsg && <span className="text-xs text-[rgb(var(--success))]">{savedMsg}</span>}
            <button onClick={onClose} className="text-[rgb(var(--muted))] hover:text-[rgb(var(--foreground))]">
              <X size={18} />
            </button>
          </div>
        </div>

        {stats && (
          <div className="grid grid-cols-2 gap-3 mb-5">
            <div className="glass rounded-xl p-3">
              <p className="text-xs text-[rgb(var(--muted))]">Ventes (semaine en cours)</p>
              <p className="text-xl font-semibold">{stats.salesCount}</p>
            </div>
            <div className="glass rounded-xl p-3">
              <p className="text-xs text-[rgb(var(--muted))]">CA généré</p>
              <p className="text-xl font-semibold text-[rgb(var(--brand-400))]">
                ${stats.total.toLocaleString("fr-FR")}
              </p>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-4 mb-5">
          <div>
            <label className="text-xs text-[rgb(var(--muted))] mb-1 block">Téléphone</label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              onBlur={savePhone}
              className="glass rounded-lg px-3 py-2 text-sm w-full outline-none"
              placeholder="—"
            />
          </div>

          <div>
            <label className="text-xs text-[rgb(var(--muted))] mb-1 block">Grade</label>
            <GradeSelect value={grade} grades={gradeNames.length > 0 ? gradeNames : [grade]} onChange={saveGrade} />
          </div>

          {isSuperAdmin && agent.role !== "SUPER_ADMIN" && (
            <div>
              <label className="text-xs text-[rgb(var(--muted))] mb-1 block">Rôle</label>
              <button
                onClick={saveRole}
                disabled={isSelf}
                className={`text-xs rounded-full px-3 py-1.5 disabled:opacity-40 ${
                  role === "ADMIN"
                    ? "bg-[rgb(var(--brand-500)/0.18)] text-[rgb(var(--brand-400))]"
                    : "glass text-[rgb(var(--muted))]"
                }`}
              >
                {role === "ADMIN" ? "Admin — accès édition du site" : "Agent simple"}
              </button>
            </div>
          )}

          <div>
            <button
              onClick={resetPassword}
              className="flex items-center gap-1.5 text-xs text-[rgb(var(--muted))] hover:text-[rgb(var(--brand-400))]"
            >
              <KeyRound size={13} />
              Régénérer son mot de passe
            </button>
            {newCreds && (
              <p className="text-xs mt-1.5">
                Nouveau mot de passe : <span className="font-mono text-[rgb(var(--brand-400))]">{newCreds}</span>
              </p>
            )}
          </div>
        </div>

        <div>
          <p className="text-xs font-medium mb-2">Pages visibles pour ce compte</p>
          <div className="flex flex-col gap-1">
            {pages.map((p) => {
              const ids: string[] = JSON.parse(p.hiddenForAgentIds || "[]");
              // Masquée pour tous : coché = accès spécial accordé à ce
              // compte précis (la page reste invisible pour les autres).
              const visible = p.hiddenForAll ? ids.includes(agent.id) : !ids.includes(agent.id);
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
                  <input
                    type="checkbox"
                    checked={visible}
                    onChange={() => togglePageAccess(p.href)}
                  />
                </label>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
