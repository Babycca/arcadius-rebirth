"use client";

import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Check, X } from "lucide-react";
import { PageShell, PageHeader } from "@/components/PageShell";
import { useDialog } from "@/components/DialogProvider";

type Sale = {
  id: string;
  date: string;
  houseNumber: string;
  priceAmount: number;
  clientName: string;
  clientPhone: string | null;
};

function todayInputValue() {
  return new Date().toISOString().slice(0, 10);
}

export default function MesVentesPage() {
  const { confirm } = useDialog();
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [date, setDate] = useState(todayInputValue());
  const [houseNumber, setHouseNumber] = useState("");
  const [priceAmount, setPriceAmount] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDate, setEditDate] = useState("");
  const [editHouseNumber, setEditHouseNumber] = useState("");
  const [editPriceAmount, setEditPriceAmount] = useState("");
  const [editClientName, setEditClientName] = useState("");
  const [editClientPhone, setEditClientPhone] = useState("");
  const [editError, setEditError] = useState<string | null>(null);
  const [editSaving, setEditSaving] = useState(false);

  async function load() {
    const res = await fetch("/api/accounting/sales");
    if (res.ok) setSales(await res.json());
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const res = await fetch("/api/accounting/sales", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date,
        houseNumber,
        priceAmount: Number(priceAmount),
        clientName,
        clientPhone: clientPhone || undefined,
      }),
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
    load();
  }

  const totalWeek = sales.reduce((s, x) => s + x.priceAmount, 0);

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
      <PageHeader
        title="Mes ventes"
        subtitle={`Semaine en cours — ${sales.length} vente${sales.length > 1 ? "s" : ""}, $${totalWeek.toLocaleString("fr-FR")}`}
      />

      <form onSubmit={handleSubmit} className="glass-strong rounded-xl p-5 mb-6 max-w-2xl">
        <h2 className="text-sm font-medium mb-4">Ajouter une vente</h2>
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
            <label className="text-xs text-[rgb(var(--muted))] mb-1 block">
              Téléphone du client (facultatif)
            </label>
            <input
              value={clientPhone}
              onChange={(e) => setClientPhone(e.target.value)}
              className="glass rounded-lg px-3 py-2 text-sm w-full outline-none"
              placeholder="-"
            />
          </div>
        </div>
        <button
          type="submit"
          disabled={saving}
          className="mt-4 flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold text-white bg-gradient-to-r from-[rgb(var(--brand-500))] to-[rgb(var(--brand-600))] hover:brightness-110 transition-all disabled:opacity-60"
        >
          <Plus size={15} />
          {saving ? "Enregistrement…" : "Ajouter la vente"}
        </button>
      </form>

      <div className="glass-strong rounded-xl overflow-hidden max-w-3xl">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-[rgb(var(--muted))] border-b border-white/[0.08]">
              <th className="px-4 py-3 font-normal">Date</th>
              <th className="px-4 py-3 font-normal">Habitation</th>
              <th className="px-4 py-3 font-normal">Client</th>
              <th className="px-4 py-3 font-normal text-right">Prix</th>
              <th className="px-4 py-3 font-normal text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {!loading && sales.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-[rgb(var(--muted))] text-sm">
                  Aucune vente cette semaine.
                </td>
              </tr>
            )}
            {sales.map((s) =>
              editingId === s.id ? (
                <tr key={s.id} className="border-b border-white/[0.04] last:border-0 bg-white/[0.03]">
                  <td colSpan={5} className="px-4 py-3">
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
                  <td className="px-4 py-2.5 text-right font-medium text-[rgb(var(--brand-400))]">
                    ${s.priceAmount.toLocaleString("fr-FR")}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
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
                    </div>
                  </td>
                </tr>
              )
            )}
          </tbody>
        </table>
      </div>
    </PageShell>
  );
}
