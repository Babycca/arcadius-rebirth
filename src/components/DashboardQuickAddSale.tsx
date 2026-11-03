"use client";

import { useState } from "react";
import { Plus, ReceiptText } from "lucide-react";
import { useToast } from "@/components/ToastProvider";

function todayInputValue() {
  return new Date().toISOString().slice(0, 10);
}

// Raccourci directement sur le Tableau de bord — même formulaire que "Mes
// ventes", pour ne pas avoir à y naviguer juste pour noter une vente.
export default function DashboardQuickAddSale() {
  const toast = useToast();
  const [date, setDate] = useState(todayInputValue());
  const [houseNumber, setHouseNumber] = useState("");
  const [priceAmount, setPriceAmount] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
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
      toast(body?.error ?? "Impossible d'enregistrer cette vente.", "error");
      return;
    }
    toast("Vente ajoutée.");
    setHouseNumber("");
    setPriceAmount("");
    setClientName("");
    setClientPhone("");
    setDate(todayInputValue());
  }

  return (
    <form onSubmit={handleSubmit} className="card-hover glass-strong rounded-xl p-5 border border-transparent">
      <h2 className="font-medium flex items-center gap-2 mb-4">
        <ReceiptText size={15} className="text-[rgb(var(--brand-400))]" />
        Ajouter une vente
      </h2>
      <div className="grid grid-cols-2 gap-3">
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="glass rounded-lg px-3 py-2 text-sm outline-none col-span-2 sm:col-span-1"
        />
        <input
          required
          value={houseNumber}
          onChange={(e) => setHouseNumber(e.target.value)}
          placeholder="N° d'habitation"
          className="glass rounded-lg px-3 py-2 text-sm outline-none"
        />
        <input
          required
          type="number"
          min="0"
          value={priceAmount}
          onChange={(e) => setPriceAmount(e.target.value)}
          placeholder="Prix ($)"
          className="glass rounded-lg px-3 py-2 text-sm outline-none"
        />
        <input
          required
          value={clientName}
          onChange={(e) => setClientName(e.target.value)}
          placeholder="Identité du client"
          className="glass rounded-lg px-3 py-2 text-sm outline-none"
        />
        <input
          value={clientPhone}
          onChange={(e) => setClientPhone(e.target.value)}
          placeholder="Téléphone (facultatif)"
          className="glass rounded-lg px-3 py-2 text-sm outline-none"
        />
      </div>
      <button
        type="submit"
        disabled={saving}
        className="mt-4 flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold text-white bg-gradient-to-r from-[rgb(var(--brand-500))] to-[rgb(var(--brand-600))] hover:brightness-110 transition-all disabled:opacity-60"
      >
        <Plus size={14} />
        {saving ? "Enregistrement…" : "Ajouter la vente"}
      </button>
    </form>
  );
}
