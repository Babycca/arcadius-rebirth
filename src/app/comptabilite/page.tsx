"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PageShell, PageHeader } from "@/components/PageShell";
import { Archive, Pencil, Check, X } from "lucide-react";
import { useCanEdit } from "@/lib/use-can-edit";
import { weekDateRangeLabel } from "@/lib/accounting/week-client";

// "Semaine A" / "Semaine B" : valeurs saisies à la main par un admin, sans
// calcul automatique (demande explicite — pas de logique métier derrière).
function ManualWeekCard({ settingKey, label, isAdmin }: { settingKey: string; label: string; isAdmin: boolean }) {
  const [value, setValue] = useState("");
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(`/api/app-settings/${settingKey}`)
      .then((r) => r.json())
      .then((d) => setValue(d.value ?? ""));
  }, [settingKey]);

  async function save() {
    setSaving(true);
    const res = await fetch(`/api/app-settings/${settingKey}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ value: draft }),
    });
    setSaving(false);
    if (res.ok) {
      setValue(draft);
      setEditing(false);
    }
  }

  return (
    <div className="glass-strong rounded-xl px-4 py-2.5">
      <p className="text-xs text-[rgb(var(--muted))] flex items-center justify-between gap-3">
        {label}
        {isAdmin && !editing && (
          <button
            onClick={() => {
              setDraft(value);
              setEditing(true);
            }}
            className="text-[rgb(var(--muted))] hover:text-[rgb(var(--brand-400))]"
          >
            <Pencil size={11} />
          </button>
        )}
      </p>
      {editing ? (
        <div className="flex items-center gap-1.5 mt-1">
          <input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && save()}
            className="bg-transparent outline-none text-sm border-b border-white/20 w-20"
          />
          <button onClick={save} disabled={saving} className="text-[rgb(var(--brand-400))]">
            <Check size={14} />
          </button>
        </div>
      ) : (
        <p className="text-lg font-semibold">{value || "—"}</p>
      )}
    </div>
  );
}

type AgentSummary = {
  id: string;
  name: string;
  avatarUrl: string | null;
  grade: string;
  phone: string | null;
  totalSales: number;
  companyProfit: number;
  commission: number;
  commissionRate: number;
  bonusAmount: number;
  ruleBonusAmount: number;
  bonusEnabled: boolean;
  salary: number;
  salesCount: number;
};

export default function ComptabilitePage() {
  const [data, setData] = useState<{ weekId: string; periodStart: string | null; agents: AgentSummary[] } | null>(null);
  const [forbidden, setForbidden] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false);
  const [bonusPromptFor, setBonusPromptFor] = useState<string | null>(null);
  const [bonusPromptValue, setBonusPromptValue] = useState("");
  const { isAdmin } = useCanEdit();

  function load() {
    fetch("/api/accounting/agents-summary").then(async (res) => {
      if (res.status === 403) {
        setForbidden(true);
        return;
      }
      setData(await res.json());
    });
  }

  useEffect(() => {
    load();
  }, []);

  async function patchBonus(agentId: string, body: { enabled: boolean; amount?: number }) {
    await fetch(`/api/accounting/agents/${agentId}/bonus`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    load();
  }

  async function toggleBonus(agent: AgentSummary, enabled: boolean) {
    // Grade sans prime de base : impossible de deviner un montant, on
    // demande une saisie manuelle avant d'activer.
    if (enabled && agent.ruleBonusAmount === 0) {
      setBonusPromptFor(agent.id);
      setBonusPromptValue("");
      return;
    }
    setData((d) =>
      d ? { ...d, agents: d.agents.map((a) => (a.id === agent.id ? { ...a, bonusEnabled: enabled } : a)) } : d
    );
    await patchBonus(agent.id, { enabled });
  }

  async function confirmBonusAmount(agentId: string) {
    const amount = Number(bonusPromptValue);
    if (!Number.isFinite(amount) || amount < 0) return;
    setBonusPromptFor(null);
    await patchBonus(agentId, { enabled: true, amount });
  }

  async function handleArchive() {
    setShowArchiveConfirm(false);
    setArchiving(true);
    await fetch("/api/accounting/weekly-reset", { method: "POST" });
    setArchiving(false);
    load();
  }

  if (forbidden) {
    return (
      <PageShell>
        <PageHeader title="Comptabilité" subtitle="Accès réservé aux administrateurs" />
        <p className="text-sm text-[rgb(var(--muted))]">
          Tu n&apos;as pas accès à cette page. Rends-toi sur{" "}
          <Link href="/comptabilite/mes-ventes" className="text-[rgb(var(--brand-400))] underline">
            Mes ventes
          </Link>{" "}
          pour saisir tes propres ventes.
        </p>
      </PageShell>
    );
  }

  const agents = data?.agents ?? [];
  const totalSales = agents.reduce((s, a) => s + a.totalSales, 0);
  const totalProfit = agents.reduce((s, a) => s + a.companyProfit, 0);
  const totalSalaries = agents.reduce((s, a) => s + a.salary, 0);
  const netProfit = totalProfit - totalSalaries;
  const taxes = netProfit * 0.3;

  return (
    <>
    <PageShell>
      <PageHeader
        title="Comptabilité"
        subtitle={
          data
            ? `Semaine ${data.weekId}${data.periodStart ? ` — ${weekDateRangeLabel(new Date(data.periodStart))}` : ""}`
            : "Chargement…"
        }
      />

      <div className="flex gap-4 mb-4 flex-wrap items-start justify-between">
        <div className="flex gap-4 flex-wrap">
          <div className="glass-strong rounded-xl px-4 py-2.5">
            <p className="text-xs text-[rgb(var(--muted))]">Nombre de salariés</p>
            <p className="text-lg font-semibold">{agents.length}</p>
          </div>
          <div className="glass-strong rounded-xl px-4 py-2.5">
            <p className="text-xs text-[rgb(var(--muted))]">Total facture</p>
            <p className="text-lg font-semibold">${totalSales.toLocaleString("fr-FR")}</p>
          </div>
          <div className="glass-strong rounded-xl px-4 py-2.5">
            <p className="text-xs text-[rgb(var(--muted))]">Bénéfices</p>
            <p className="text-lg font-semibold text-[rgb(var(--brand-400))]">
              ${totalProfit.toLocaleString("fr-FR")}
            </p>
          </div>
          <div className="glass-strong rounded-xl px-4 py-2.5">
            <p className="text-xs text-[rgb(var(--muted))]">Salaires</p>
            <p className="text-lg font-semibold">${totalSalaries.toLocaleString("fr-FR")}</p>
          </div>
          <div className="glass-strong rounded-xl px-4 py-2.5">
            <p className="text-xs text-[rgb(var(--muted))]">Bénéfices net</p>
            <p className="text-lg font-semibold text-[rgb(var(--success))]">
              ${netProfit.toLocaleString("fr-FR")}
            </p>
          </div>
          <div className="glass-strong rounded-xl px-4 py-2.5">
            <p className="text-xs text-[rgb(var(--muted))]">Taxes (30%)</p>
            <p className="text-lg font-semibold text-[rgb(var(--warning))]">${taxes.toLocaleString("fr-FR")}</p>
          </div>
        </div>
        {isAdmin && (
          <div className="flex items-center gap-2">
            <Link
              href="/comptabilite/archive"
              className="flex items-center gap-2 text-sm rounded-xl px-4 py-2.5 glass hover:border-[rgb(var(--brand-500)/0.4)] transition-colors"
            >
              <Archive size={14} />
              Archive
            </Link>
            <button
              onClick={() => setShowArchiveConfirm(true)}
              disabled={archiving}
              className="flex items-center gap-2 text-sm rounded-xl px-4 py-2.5 glass hover:border-[rgb(var(--brand-500)/0.4)] transition-colors disabled:opacity-60"
            >
              <Archive size={14} />
              {archiving ? "Archivage…" : "Archiver la comptabilité"}
            </button>
          </div>
        )}
      </div>

      <div className="flex gap-4 mb-5 flex-wrap">
        <ManualWeekCard settingKey="comptabilite-semaine-a" label="Semaine A" isAdmin={isAdmin} />
        <ManualWeekCard settingKey="comptabilite-semaine-b" label="Semaine B" isAdmin={isAdmin} />
      </div>

      <div className="glass-strong rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-[rgb(var(--muted))] border-b border-white/[0.08]">
              <th className="px-4 py-3 font-normal">Agent</th>
              <th className="px-4 py-3 font-normal">Téléphone</th>
              <th className="px-4 py-3 font-normal">Grade</th>
              <th className="px-4 py-3 font-normal">%</th>
              <th className="px-4 py-3 font-normal">Nb facture</th>
              <th className="px-4 py-3 font-normal">CA</th>
              <th className="px-4 py-3 font-normal">Prime</th>
              <th className="px-4 py-3 font-normal text-right">Salaire</th>
            </tr>
          </thead>
          <tbody>
            {agents.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-6 text-center text-[rgb(var(--muted))] text-sm">
                  {data ? "Aucun agent pour l'instant." : "Chargement…"}
                </td>
              </tr>
            )}
            {agents.map((a) => (
              <tr key={a.id} className="border-b border-white/[0.04] last:border-0 hover:bg-white/[0.03]">
                <td className="px-4 py-3">
                  <Link href={`/comptabilite/agents/${a.id}`} className="flex items-center gap-2.5 hover:text-[rgb(var(--brand-400))]">
                    <span className="w-7 h-7 rounded-full bg-[rgb(var(--brand-500)/0.18)] text-[rgb(var(--brand-400))] flex items-center justify-center text-xs font-medium overflow-hidden shrink-0">
                      {a.avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={a.avatarUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        a.name[0]
                      )}
                    </span>
                    {a.name}
                  </Link>
                </td>
                <td className="px-4 py-3 text-[rgb(var(--muted))]">{a.phone || "—"}</td>
                <td className="px-4 py-3 text-[rgb(var(--muted))]">{a.grade}</td>
                <td className="px-4 py-3 text-[rgb(var(--muted))]">{a.commissionRate}%</td>
                <td className="px-4 py-3">{a.salesCount}</td>
                <td className="px-4 py-3">${a.totalSales.toLocaleString("fr-FR")}</td>
                <td className="px-4 py-3">
                  {bonusPromptFor === a.id ? (
                    <div className="flex items-center gap-1.5">
                      <input
                        autoFocus
                        type="number"
                        min="0"
                        value={bonusPromptValue}
                        onChange={(e) => setBonusPromptValue(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && confirmBonusAmount(a.id)}
                        placeholder="Montant"
                        className="glass rounded-lg px-2 py-1 text-xs w-24 outline-none"
                      />
                      <button onClick={() => confirmBonusAmount(a.id)} className="text-[rgb(var(--brand-400))]">
                        <Check size={14} />
                      </button>
                      <button onClick={() => setBonusPromptFor(null)} className="text-[rgb(var(--muted))]">
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      {isAdmin ? (
                        <button
                          onClick={() => toggleBonus(a, !a.bonusEnabled)}
                          className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${
                            a.bonusEnabled ? "bg-[rgb(var(--brand-500))]" : "bg-white/10"
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${
                              a.bonusEnabled ? "translate-x-4" : "translate-x-0.5"
                            }`}
                          />
                        </button>
                      ) : (
                        (a.bonusEnabled || a.ruleBonusAmount > 0) && (
                          <span className="text-xs text-[rgb(var(--muted))]">{a.bonusEnabled ? "Oui" : "Non"}</span>
                        )
                      )}
                      {a.bonusEnabled && a.bonusAmount > 0 && (
                        <span className="text-xs text-[rgb(var(--muted))]">${a.bonusAmount.toLocaleString("fr-FR")}</span>
                      )}
                      {!isAdmin && !a.bonusEnabled && a.ruleBonusAmount === 0 && (
                        <span className="text-xs text-[rgb(var(--muted))]">—</span>
                      )}
                    </div>
                  )}
                </td>
                <td className="px-4 py-3 text-right font-medium text-[rgb(var(--brand-400))]">
                  ${a.salary.toLocaleString("fr-FR")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </PageShell>

    {showArchiveConfirm && (
      <div className="fixed inset-0 z-[3000] flex items-center justify-center bg-black/60 p-4">
        <div className="glass-strong rounded-2xl p-6 w-full max-w-sm">
          <div className="flex items-center gap-2 mb-3">
            <Archive size={18} className="text-[rgb(var(--brand-400))]" />
            <h2 className="font-heading text-lg">Archiver la comptabilité</h2>
          </div>
          <p className="text-sm text-[rgb(var(--muted))] mb-5">
            Une nouvelle semaine démarre à zéro. L&apos;historique de la semaine en cours reste consultable dans
            l&apos;archive.
          </p>
          <div className="flex gap-2">
            <button
              onClick={handleArchive}
              disabled={archiving}
              className="flex-1 rounded-xl py-2.5 text-sm font-medium text-white bg-gradient-to-r from-[rgb(var(--brand-500))] to-[rgb(var(--brand-600))] hover:brightness-110 transition-all disabled:opacity-60"
            >
              {archiving ? "Archivage…" : "Archiver"}
            </button>
            <button
              onClick={() => setShowArchiveConfirm(false)}
              className="flex-1 rounded-xl py-2.5 text-sm text-[rgb(var(--muted))] hover:text-[rgb(var(--foreground))] glass"
            >
              Annuler
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}
