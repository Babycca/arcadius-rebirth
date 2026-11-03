"use client";

import { useEffect, useState } from "react";
import { TriangleAlert } from "lucide-react";

type GapsResponse = { missing: number[]; min: number | null; max: number | null; tooWide?: boolean };

// Avertissement discret : des numéros d'habitation "sautés" dans la
// comptabilité de la semaine en cours (tous agents) suggèrent une vente
// jamais notée. Rien de bloquant, juste un signal pour aller vérifier.
export default function HouseNumberGapsAlert() {
  const [data, setData] = useState<GapsResponse | null>(null);

  useEffect(() => {
    fetch("/api/accounting/house-number-gaps")
      .then((r) => (r.ok ? r.json() : null))
      .then(setData);
  }, []);

  if (!data || data.missing.length === 0) return null;

  return (
    <div className="flex items-start gap-3 rounded-xl px-4 py-3 mb-6 max-w-6xl mx-auto bg-[rgb(var(--warning)/0.1)] border border-[rgb(var(--warning)/0.3)]">
      <TriangleAlert size={16} className="text-[rgb(var(--warning))] shrink-0 mt-0.5" />
      <p className="text-sm text-[rgb(var(--warning))]">
        <span className="font-medium">N° d&apos;habitation manquant{data.missing.length > 1 ? "s" : ""} cette semaine :</span>{" "}
        {data.missing.map((n) => `#${n}`).join(", ")} — vérifie qu&apos;aucune vente n&apos;a été oubliée.
      </p>
    </div>
  );
}
