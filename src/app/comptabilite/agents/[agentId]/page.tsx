"use client";

import { use, useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Check, X } from "lucide-react";
import { PageShell } from "@/components/PageShell";
import UserAvatar from "@/components/UserAvatar";
import ReassignSaleButton from "@/components/ReassignSaleButton";
import { useCanEdit } from "@/lib/use-can-edit";
import { useDialog } from "@/components/DialogProvider";

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: "Super Admin",
  ADMIN: "Admin",
  AGENT: "Agent",
};

type Sale = {
  id: string;
  agentId: string;
  date: string;
  houseNumber: string;
  priceAmount: number;
  clientName: string;
  clientPhone: string | null;
};

type GarageSale = {
  id: string;
  type: string;
  name: string | null;
  houseNumber: string;
  priceAmount: number;
  date: string;
};

function todayInputValue() {
  return new Date().toISOString().slice(0, 10);
}

export default function AgentWeekDetailPage({
  params,
}: {
  params: Promise<{ agentId: string }>;
}) {
  const { agentId } = use(params);
  const { isAdmin, canEdit } = useCanEdit();
  const { confirm } = useDialog();
  const [agentName, setAgentName] = useState("");
  const [agentAvatarUrl, setAgentAvatarUrl] = useState<string | null>(null);
  const [agentGrade, setAgentGrade] = useState("");
  const [agentRole, setAgentRole] = useState("");
  const [sales, setSales] = useState<Sale[]>([]);
  const [garages, setGarages] = useState<GarageSale[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAbsentToday, setIsAbsentToday] = useState(false);

  const [adding, setAdding] = useState(false);
  const [date, setDate] = useState(todayInputValue());
  const [houseNumber, setHouseNumber] = useState("");
  const [priceAmount, setPriceAmount] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDate, setEditDate] = useState("");
  const [editHouseNumber, setEditHouseNumber] = useState("");
  const [editPriceAmount, setEditPriceAmount] = useState("");
  const [editClientName, setEditClientName] = useState("");
  const [editClientPhone, setEditClientPhone] = useState("");
  const [editError, setEditError] = useState<string | null>(null);
  const [editSaving, setEditSaving] = useState(false);

  function load() {
    fetch(`/api/accounting/agents/${agentId}/sales`).then(async (res) => {
      if (res.ok) {
        const data = await res.json();
        setAgentName(data.agent.name);
        setAgentAvatarUrl(data.agent.avatarUrl);
        setAgentGrade(data.agent.grade);
        setAgentRole(data.agent.role);
        setSales(data.sales);
        setIsAbsentToday(!!data.isAbsentToday);
      }
      setLoading(false);
    });
    fetch(`/api/accounting/agents/${agentId}/garage-sales`)
      .then((res) => (res.ok ? res.json() : []))
      .then(setGarages);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agentId]);

  const total = sales.reduce((s, x) => s + x.priceAmount, 0);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const res = await fetch(`/api/accounting/agents/${agentId}/sales`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date, houseNumber, priceAmount: Number(priceAmount), clientName, clientPhone: clientPhone || undefined }),
    });
    setSaving(false);
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(body?.error ?? "Impossible d'enregistrer cette vente.");
      return;
    }
    setHouseNumber("");
    setPriceAmount("");
    setClientName("");
    setClientPhone("");
    setDate(todayInputValue());
    setAdding(false);
    load();
  }

  function startEdit(sale: Sale) {
    setEditingId(sale.id);
    setEditDate(sale.date.slice(0, 10));
    setEditHouseNumber(sale.houseNumber);
    setEditPriceAmount(String(sale.priceAmount));
    setEditClientName(sale.clientName);
    setEditClientPhone(sale.clientPhone ?? "");
    setEditError(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditError(null);
  }

  async function saveEdit(id: string) {
    setEditSaving(true);
    setEditError(null);
    const res = await fetch(`/api/accounting/sales/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date: editDate,
        houseNumber: editHouseNumber,
        priceAmount: Number(editPriceAmount),
        clientName: editClientName,
        clientPhone: editClientPhone || undefined,
      }),
    });
    setEditSaving(false);
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setEditError(body?.error ?? "Impossible de modifier cette vente.");
      return;
    }
    setEditingId(null);
    load();
  }

  async function deleteSale(id: string) {
    if (!(await confirm("Supprimer cette vente ?", { danger: true }))) return;
    const res = await fetch(`/api/accounting/sales/${id}`, { method: "DELETE" });
    if (res.ok) load();
  }

  return (
    <PageShell>
      <div className="flex justify-end mb-2">
        <UserAvatar />
      </div>
      <div className="flex flex-col items-center text-center mb-10">
        <span className="relative w-28 h-28 rounded-full bg-[rgb(var(--brand-500)/0.18)] text-[rgb(var(--brand-400))] flex items-center justify-center text-3xl font-medium overflow-hidden shrink-0 mb-4 ring-4 ring-[rgb(var(--brand-500)/0.25)] shadow-[0_0_40px_rgb(var(--brand-glow)/0.25)]">
          {agentAvatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={agentAvatarUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            (agentName || "?")[0]
          )}
        </span>
        <h1 className="font-heading text-3xl flex items-center gap-2.5">
          {agentName || "Agent"}
          {isAbsentToday && (
            <span className="flex items-center gap-1.5">
              <span
                className="w-2 h-2 rounded-full bg-[rgb(var(--danger))] shrink-0"
                style={{ boxShadow: "0 0 8px 2px rgb(var(--danger))" }}
              />
              <span className="text-xs italic text-[rgb(var(--danger)/0.85)]">Absence</span>
            </span>
          )}
        </h1>
        <p className="inline-flex items-center gap-1.5 text-xs font-medium text-[rgb(var(--brand-400))] bg-[rgb(var(--brand-500)/0.12)] border border-[rgb(var(--brand-500)/0.25)] rounded-full px-3 py-1 mt-3">
          {agentGrade}
          {agentRole && agentRole !== "SUPER_ADMIN" && (
            <>
              <span className="w-1 h-1 rounded-full bg-[rgb(var(--brand-400))]" />
              {ROLE_LABELS[agentRole] ?? agentRole}
            </>
          )}
        </p>
        <p className="text-xs text-[rgb(var(--muted))] mt-3">
          {loading ? "Chargement…" : `${sales.length} vente(s) cette semaine — $${total.toLocaleString("fr-FR")}`}
        </p>
      </div>

      {isAdmin && (
        <div className="max-w-4xl mx-auto mb-5">
          {!adding ? (
            <button
              onClick={() => setAdding(true)}
              className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold text-white bg-gradient-to-r from-[rgb(var(--brand-500))] to-[rgb(var(--brand-600))] hover:brightness-110 transition-all"
            >
              <Plus size={14} />
              Ajouter une vente pour cet agent
            </button>
          ) : (
            <form onSubmit={handleAdd} className="card-hover glass-strong rounded-xl p-5 border border-transparent">
              {error && (
                <div className="rounded-lg bg-[rgb(var(--danger)/0.12)] text-[rgb(var(--danger))] text-xs px-3 py-2 mb-3">
                  {error}
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-[rgb(var(--muted))] mb-1 block">Date</label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="glass rounded-lg px-3 py-2 text-sm w-full outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs text-[rgb(var(--muted))] mb-1 block">N° d&apos;habitation *</label>
                  <input
                    required
                    value={houseNumber}
                    onChange={(e) => setHouseNumber(e.target.value)}
                    className="glass rounded-lg px-3 py-2 text-sm w-full outline-none"
                    placeholder="-"
                  />
                </div>
                <div>
                  <label className="text-xs text-[rgb(var(--muted))] mb-1 block">Prix ($) *</label>
                  <input
                    required
                    type="number"
                    min="0"
                    value={priceAmount}
                    onChange={(e) => setPriceAmount(e.target.value)}
                    className="glass rounded-lg px-3 py-2 text-sm w-full outline-none"
                    placeholder="-"
                  />
                </div>
                <div>
                  <label className="text-xs text-[rgb(var(--muted))] mb-1 block">Identité du client *</label>
                  <input
                    required
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    className="glass rounded-lg px-3 py-2 text-sm w-full outline-none"
                    placeholder="Nom Prénom"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-xs text-[rgb(var(--muted))] mb-1 block">Téléphone du client (facultatif)</label>
                  <input
                    value={clientPhone}
                    onChange={(e) => setClientPhone(e.target.value)}
                    className="glass rounded-lg px-3 py-2 text-sm w-full outline-none"
                    placeholder="-"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2 mt-4">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold text-white bg-gradient-to-r from-[rgb(var(--brand-500))] to-[rgb(var(--brand-600))] hover:brightness-110 transition-all disabled:opacity-60"
                >
                  <Plus size={15} />
                  {saving ? "Enregistrement…" : "Ajouter la vente"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAdding(false);
                    setError(null);
                  }}
                  className="text-xs text-[rgb(var(--muted))] hover:text-[rgb(var(--foreground))]"
                >
                  Annuler
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      <div className="card-hover glass-strong rounded-xl overflow-hidden max-w-4xl mx-auto border border-transparent">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-[rgb(var(--muted))] border-b border-white/[0.08]">
              <th className="px-4 py-3 font-normal">Date</th>
              <th className="px-4 py-3 font-normal">Habitation</th>
              <th className="px-4 py-3 font-normal">Client</th>
              <th className="px-4 py-3 font-normal">Téléphone</th>
              <th className="px-4 py-3 font-normal text-right">Prix</th>
              {isAdmin && <th className="px-4 py-3 font-normal text-right">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {!loading && sales.length === 0 && (
              <tr>
                <td colSpan={isAdmin ? 6 : 5} className="px-4 py-6 text-center text-[rgb(var(--muted))] text-sm">
                  Aucune vente cette semaine.
                </td>
              </tr>
            )}
            {sales.map((s) =>
              editingId === s.id ? (
                <tr key={s.id} className="border-b border-white/[0.04] last:border-0 bg-white/[0.03]">
                  <td colSpan={isAdmin ? 6 : 5} className="px-4 py-3">
                    {editError && (
                      <div className="rounded-lg bg-[rgb(var(--danger)/0.12)] text-[rgb(var(--danger))] text-xs px-3 py-2 mb-3">
                        {editError}
                      </div>
                    )}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-[rgb(var(--muted))] mb-1 block">Date</label>
                        <input
                          type="date"
                          value={editDate}
                          onChange={(e) => setEditDate(e.target.value)}
                          className="glass rounded-lg px-3 py-2 text-sm w-full outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-[rgb(var(--muted))] mb-1 block">N° d&apos;habitation</label>
                        <input
                          value={editHouseNumber}
                          onChange={(e) => setEditHouseNumber(e.target.value)}
                          className="glass rounded-lg px-3 py-2 text-sm w-full outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-[rgb(var(--muted))] mb-1 block">Prix ($)</label>
                        <input
                          type="number"
                          min="0"
                          value={editPriceAmount}
                          onChange={(e) => setEditPriceAmount(e.target.value)}
                          className="glass rounded-lg px-3 py-2 text-sm w-full outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-[rgb(var(--muted))] mb-1 block">Identité du client</label>
                        <input
                          value={editClientName}
                          onChange={(e) => setEditClientName(e.target.value)}
                          className="glass rounded-lg px-3 py-2 text-sm w-full outline-none"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="text-xs text-[rgb(var(--muted))] mb-1 block">Téléphone (facultatif)</label>
                        <input
                          value={editClientPhone}
                          onChange={(e) => setEditClientPhone(e.target.value)}
                          className="glass rounded-lg px-3 py-2 text-sm w-full outline-none"
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-3">
                      <button
                        onClick={() => saveEdit(s.id)}
                        disabled={editSaving}
                        className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-white bg-gradient-to-r from-[rgb(var(--brand-500))] to-[rgb(var(--brand-600))] hover:brightness-110 transition-all disabled:opacity-60"
                      >
                        <Check size={13} />
                        {editSaving ? "Enregistrement…" : "Enregistrer"}
                      </button>
                      <button
                        onClick={cancelEdit}
                        className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs text-[rgb(var(--muted))] hover:text-[rgb(var(--foreground))]"
                      >
                        <X size={13} />
                        Annuler
                      </button>
                      <button
                        onClick={() => deleteSale(s.id)}
                        className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs text-[rgb(var(--danger))] hover:bg-[rgb(var(--danger)/0.1)] ml-auto"
                      >
                        <Trash2 size={13} />
                        Supprimer
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                <tr key={s.id} className="border-b border-white/[0.04] last:border-0 hover:bg-white/[0.03] group">
                  <td className="px-4 py-2.5">{new Date(s.date).toLocaleDateString("fr-FR")}</td>
                  <td className="px-4 py-2.5">#{s.houseNumber}</td>
                  <td className="px-4 py-2.5">{s.clientName}</td>
                  <td className="px-4 py-2.5 text-[rgb(var(--muted))]">{s.clientPhone ?? "—"}</td>
                  <td className="px-4 py-2.5 text-right font-medium text-[rgb(var(--brand-400))]">
                    ${s.priceAmount.toLocaleString("fr-FR")}
                  </td>
                  {isAdmin && (
                    <td className="px-4 py-2.5 text-right">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <ReassignSaleButton saleId={s.id} currentAgentId={s.agentId} onReassigned={load} />
                        {canEdit && (
                          <>
                            <button
                              onClick={() => startEdit(s)}
                              className="text-[rgb(var(--muted))] hover:text-[rgb(var(--brand-400))] p-1.5"
                              title="Modifier"
                            >
                              <Pencil size={13} />
                            </button>
                            <button
                              onClick={() => deleteSale(s.id)}
                              className="text-[rgb(var(--muted))] hover:text-[rgb(var(--danger))] p-1.5"
                              title="Supprimer"
                            >
                              <Trash2 size={13} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              )
            )}
          </tbody>
        </table>
      </div>

      {garages.length > 0 && (
        <div className="card-hover glass-strong rounded-xl overflow-hidden max-w-4xl mx-auto mt-5 border border-transparent">
          <p className="text-xs text-[rgb(var(--muted))] px-4 py-3 border-b border-white/[0.08]">
            Garages posés — ne compte pas comme une vente
          </p>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-[rgb(var(--muted))] border-b border-white/[0.08]">
                <th className="px-4 py-2 font-normal">Date</th>
                <th className="px-4 py-2 font-normal">Type</th>
                <th className="px-4 py-2 font-normal">Nom</th>
                <th className="px-4 py-2 font-normal">Habitation</th>
                <th className="px-4 py-2 font-normal text-right">Prix</th>
              </tr>
            </thead>
            <tbody>
              {garages.map((g) => (
                <tr key={g.id} className="border-b border-white/[0.04] last:border-0">
                  <td className="px-4 py-2">{new Date(g.date).toLocaleDateString("fr-FR")}</td>
                  <td className="px-4 py-2">{g.type}</td>
                  <td className="px-4 py-2">{g.name || "—"}</td>
                  <td className="px-4 py-2">#{g.houseNumber}</td>
                  <td className="px-4 py-2 text-right font-medium text-[rgb(var(--brand-400))]">
                    ${g.priceAmount.toLocaleString("fr-FR")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </PageShell>
  );
}
