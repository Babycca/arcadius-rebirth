"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Pencil, Trash2, Check, X } from "lucide-react";
import { PageShell, PageHeader } from "@/components/PageShell";
import { useDialog } from "@/components/DialogProvider";

type Expense = {
  id: string;
  reason: string;
  amount: number;
  createdAt: string;
};

export default function DepensesPage() {
  const { confirm } = useDialog();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [reason, setReason] = useState("");
  const [amount, setAmount] = useState("");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editReason, setEditReason] = useState("");
  const [editAmount, setEditAmount] = useState("");
  const [editError, setEditError] = useState<string | null>(null);
  const [editSaving, setEditSaving] = useState(false);

  async function load() {
    const res = await fetch("/api/accounting/expenses");
    if (res.status === 403) {
      setForbidden(true);
      setLoading(false);
      return;
    }
    if (res.ok) setExpenses(await res.json());
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const res = await fetch("/api/accounting/expenses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason, amount: Number(amount) }),
    });
    setSaving(false);
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(body?.error ?? "Impossible d'enregistrer cette dépense.");
      return;
    }
    setReason("");
    setAmount("");
    load();
  }

  const total = expenses.reduce((s, x) => s + x.amount, 0);

  function startEdit(expense: Expense) {
    setEditingId(expense.id);
    setEditReason(expense.reason);
    setEditAmount(String(expense.amount));
    setEditError(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditError(null);
  }

  async function saveEdit(id: string) {
    setEditSaving(true);
    setEditError(null);
    const res = await fetch(`/api/accounting/expenses/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: editReason, amount: Number(editAmount) }),
    });
    setEditSaving(false);
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setEditError(body?.error ?? "Impossible de modifier cette dépense.");
      return;
    }
    setEditingId(null);
    load();
  }

  async function deleteExpense(id: string) {
    if (!(await confirm("Supprimer cette dépense ?", { danger: true }))) return;
    const res = await fetch(`/api/accounting/expenses/${id}`, { method: "DELETE" });
    if (res.ok) load();
  }

  if (forbidden) {
    return (
      <PageShell>
        <PageHeader title="Dépenses" subtitle="Accès réservé aux administrateurs" />
        <p className="text-sm text-[rgb(var(--muted))]">
          Tu n&apos;as pas accès à cette page. Retourne à la{" "}
          <Link href="/comptabilite" className="text-[rgb(var(--brand-400))] underline">
            Comptabilité
          </Link>
          .
        </p>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <PageHeader
        title="Dépenses"
        subtitle={`Semaine en cours — ${expenses.length} dépense${expenses.length > 1 ? "s" : ""}, $${total.toLocaleString("fr-FR")}`}
      />

      <form onSubmit={handleSubmit} className="glass-strong rounded-xl p-5 mb-6 max-w-4xl mx-auto">
        <h2 className="text-sm font-medium mb-4">Ajouter une dépense</h2>
        {error && (
          <div className="rounded-lg bg-[rgb(var(--danger)/0.12)] text-[rgb(var(--danger))] text-xs px-3 py-2 mb-3">
            {error}
          </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-[rgb(var(--muted))] mb-1 block">Raison *</label>
            <input
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="glass rounded-lg px-3 py-2 text-sm w-full outline-none"
              placeholder="Ex: Fournitures, loyer…"
            />
          </div>
          <div>
            <label className="text-xs text-[rgb(var(--muted))] mb-1 block">Montant ($) *</label>
            <input
              required
              type="number"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
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
          {saving ? "Enregistrement…" : "Ajouter la dépense"}
        </button>
      </form>

      <div className="glass-strong rounded-xl overflow-hidden max-w-4xl mx-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-[rgb(var(--muted))] border-b border-white/[0.08]">
              <th className="px-4 py-3 font-normal">Raison</th>
              <th className="px-4 py-3 font-normal text-right">Montant</th>
              <th className="px-4 py-3 font-normal text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {!loading && expenses.length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-6 text-center text-[rgb(var(--muted))] text-sm">
                  Aucune dépense cette semaine.
                </td>
              </tr>
            )}
            {expenses.map((x) =>
              editingId === x.id ? (
                <tr key={x.id} className="border-b border-white/[0.04] last:border-0 bg-white/[0.03]">
                  <td colSpan={3} className="px-4 py-3">
                    {editError && (
                      <div className="rounded-lg bg-[rgb(var(--danger)/0.12)] text-[rgb(var(--danger))] text-xs px-3 py-2 mb-3">
                        {editError}
                      </div>
                    )}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-[rgb(var(--muted))] mb-1 block">Raison</label>
                        <input
                          value={editReason}
                          onChange={(e) => setEditReason(e.target.value)}
                          className="glass rounded-lg px-3 py-2 text-sm w-full outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-[rgb(var(--muted))] mb-1 block">Montant ($)</label>
                        <input
                          type="number"
                          min="0"
                          value={editAmount}
                          onChange={(e) => setEditAmount(e.target.value)}
                          className="glass rounded-lg px-3 py-2 text-sm w-full outline-none"
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-3">
                      <button
                        onClick={() => saveEdit(x.id)}
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
                        onClick={() => deleteExpense(x.id)}
                        className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs text-[rgb(var(--danger))] hover:bg-[rgb(var(--danger)/0.1)] ml-auto"
                      >
                        <Trash2 size={13} />
                        Supprimer
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                <tr key={x.id} className="border-b border-white/[0.04] last:border-0 hover:bg-white/[0.03] group">
                  <td className="px-4 py-2.5">{x.reason}</td>
                  <td className="px-4 py-2.5 text-right font-medium text-[rgb(var(--danger))]">
                    -${x.amount.toLocaleString("fr-FR")}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => startEdit(x)}
                        className="text-[rgb(var(--muted))] hover:text-[rgb(var(--brand-400))] p-1.5"
                        title="Modifier"
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        onClick={() => deleteExpense(x.id)}
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
