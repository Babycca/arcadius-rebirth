"use client";

import { useState } from "react";
import { Plus, ReceiptText } from "lucide-react";
import { useToast } from "@/components/ToastProvider";
import ClientNameInput from "@/components/ClientNameInput";

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
    if (!houseNumber.trim() || !priceAmount || !clientName.trim() || !clientPhone.trim()) {
      toast("Numéro d'habitation, prix, client et téléphone sont requis.", "error");
      return;
    }
    setSaving(true);
    const res = await fetch("/api/accounting/sales", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date,
        houseNumber,
        priceAmount: Number(priceAmount),
        clientName,
        clientPhone,
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
    <form onSubmit={handleSubmit} noValidate className="card-hover glass-strong rounded-xl p-5 border border-transparent">
      <div className="flex items-center justify-between gap-3 mb-4">
        <h2 className="font-medium flex items-center gap-2">
          <ReceiptText size={15} className="text-[rgb(var(--brand-400))]" />
          Ajouter une vente
        </h2>
        <button
          type="submit"
          disabled={saving}
          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-white bg-gradient-to-r from-[rgb(var(--brand-500))] to-[rgb(var(--brand-600))] hover:brightness-110 transition-all disabled:opacity-60 shrink-0"
        >
          <Plus size={13} />
          {saving ? "…" : "Ajouter"}
        </button>
      </div>
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
        <ClientNameInput
          required
          value={clientName}
          onChange={setClientName}
          onSelect={(s) => {
            setClientName(s.clientName);
            if (s.clientPhone) setClientPhone(s.clientPhone);
          }}
          placeholder="Identité du client"
          className="glass rounded-lg px-3 py-2 text-sm outline-none w-full"
        />
        <input
          required
          value={clientPhone}
          onChange={(e) => setClientPhone(e.target.value)}
          placeholder="Téléphone"
          className="glass rounded-lg px-3 py-2 text-sm outline-none"
        />
      </div>
    </form>
  );
}
