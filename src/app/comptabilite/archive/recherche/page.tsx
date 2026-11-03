"use client";

import { useState } from "react";
import Link from "next/link";
import { Search, Archive, FileClock } from "lucide-react";
import { PageShell, PageHeader } from "@/components/PageShell";
import { usePermissions } from "@/lib/use-permissions";

type SaleResult = {
  id: string;
  agentId: string;
  agentName: string;
  date: string;
  houseNumber: string;
  priceAmount: number;
  clientName: string;
  clientPhone: string | null;
  weekId: string;
  isFormallyArchived: boolean;
};

type GarageResult = {
  id: string;
  agentId: string;
  agentName: string;
  date: string;
  type: string;
  name: string | null;
  houseNumber: string;
  priceAmount: number;
  weekId: string;
  isFormallyArchived: boolean;
};

type LegacySaleResult = {
  id: string;
  archiveId: string;
  archiveLabel: string;
  agentName: string;
  date: string | null;
  houseNumber: string | null;
  priceAmount: number;
  clientName: string | null;
  clientPhone: string | null;
};

function destinationFor(weekId: string, agentId: string, isFormallyArchived: boolean) {
  return isFormallyArchived ? `/comptabilite/archive/${encodeURIComponent(weekId)}` : `/comptabilite/agents/${agentId}`;
}

export default function AccountingSearchPage() {
  const { has } = usePermissions();
  const canSearch = has("archiveComptabilite");
  const [q, setQ] = useState("");
  const [sales, setSales] = useState<SaleResult[] | null>(null);
  const [garages, setGarages] = useState<GarageResult[] | null>(null);
  const [legacySales, setLegacySales] = useState<LegacySaleResult[] | null>(null);
  const [loading, setLoading] = useState(false);

  async function runSearch(value: string) {
    setQ(value);
    if (value.trim().length < 2) {
      setSales(null);
      setGarages(null);
      setLegacySales(null);
      return;
    }
    setLoading(true);
    const res = await fetch(`/api/accounting/search?q=${encodeURIComponent(value.trim())}`);
    setLoading(false);
    if (res.ok) {
      const data = await res.json();
      setSales(data.sales);
      setGarages(data.garages);
      setLegacySales(data.legacySales);
    }
  }

  if (!canSearch) {
    return (
      <PageShell>
        <PageHeader title="Recherche Comptabilité" subtitle="Accès réservé" />
        <p className="text-sm text-[rgb(var(--muted))]">Tu n&apos;as pas accès à cette page.</p>
      </PageShell>
    );
  }

  const nothing =
    sales !== null &&
    garages !== null &&
    legacySales !== null &&
    sales.length === 0 &&
    garages.length === 0 &&
    legacySales.length === 0;

  return (
    <PageShell>
      <PageHeader
        title="Recherche Comptabilité"
        subtitle="Cherche un client ou un numéro d'habitation à travers toutes les semaines, archivées ou non"
      />

      <div className="relative max-w-2xl mx-auto mb-6">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[rgb(var(--muted))]" />
        <input
          autoFocus
          value={q}
          onChange={(e) => runSearch(e.target.value)}
          placeholder="Nom, prénom ou numéro d'habitation…"
          className="glass rounded-lg pl-10 pr-3 py-2.5 text-sm w-full outline-none"
        />
      </div>

      <div className="max-w-2xl mx-auto flex flex-col gap-4">
        {loading && <p className="text-sm text-[rgb(var(--muted))] text-center">Recherche…</p>}
        {nothing && <p className="text-sm text-[rgb(var(--muted))] text-center">Aucun résultat.</p>}

        {sales !== null && sales.length > 0 && (
          <div className="glass-strong rounded-xl overflow-hidden">
            <p className="text-xs text-[rgb(var(--muted))] px-4 py-2.5 border-b border-white/[0.08]">Ventes</p>
            {sales.map((s) => (
              <Link
                key={s.id}
                href={destinationFor(s.weekId, s.agentId, s.isFormallyArchived)}
                className="flex items-center justify-between gap-3 px-4 py-3 border-b border-white/[0.04] last:border-0 hover:bg-white/[0.03] transition-colors"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium flex items-center gap-2">
                    {s.clientName}
                    {s.isFormallyArchived && <Archive size={11} className="text-[rgb(var(--muted))]" />}
                  </p>
                  <p className="text-xs text-[rgb(var(--muted))]">
                    #{s.houseNumber} — {s.agentName} — {new Date(s.date).toLocaleDateString("fr-FR")} — {s.weekId}
                  </p>
                </div>
                <span className="text-sm font-medium text-[rgb(var(--brand-400))] shrink-0">
                  ${s.priceAmount.toLocaleString("fr-FR")}
                </span>
              </Link>
            ))}
          </div>
        )}

        {garages !== null && garages.length > 0 && (
          <div className="glass-strong rounded-xl overflow-hidden">
            <p className="text-xs text-[rgb(var(--muted))] px-4 py-2.5 border-b border-white/[0.08]">Garages</p>
            {garages.map((g) => (
              <Link
                key={g.id}
                href={destinationFor(g.weekId, g.agentId, g.isFormallyArchived)}
                className="flex items-center justify-between gap-3 px-4 py-3 border-b border-white/[0.04] last:border-0 hover:bg-white/[0.03] transition-colors"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium flex items-center gap-2">
                    {g.name || g.type}
                    {g.isFormallyArchived && <Archive size={11} className="text-[rgb(var(--muted))]" />}
                  </p>
                  <p className="text-xs text-[rgb(var(--muted))]">
                    #{g.houseNumber} — {g.agentName} — {new Date(g.date).toLocaleDateString("fr-FR")} — {g.weekId}
                  </p>
                </div>
                <span className="text-sm font-medium text-[rgb(var(--brand-400))] shrink-0">
                  ${g.priceAmount.toLocaleString("fr-FR")}
                </span>
              </Link>
            ))}
          </div>
        )}

        {legacySales !== null && legacySales.length > 0 && (
          <div className="glass-strong rounded-xl overflow-hidden">
            <p className="text-xs text-[rgb(var(--muted))] px-4 py-2.5 border-b border-white/[0.08]">Archives importées</p>
            {legacySales.map((s) => (
              <Link
                key={s.id}
                href={`/comptabilite/archive/legacy/${s.archiveId}`}
                className="flex items-center justify-between gap-3 px-4 py-3 border-b border-white/[0.04] last:border-0 hover:bg-white/[0.03] transition-colors"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium flex items-center gap-2">
                    {s.clientName || "—"}
                    <FileClock size={11} className="text-[rgb(var(--muted))]" />
                  </p>
                  <p className="text-xs text-[rgb(var(--muted))]">
                    {s.houseNumber ? `#${s.houseNumber} — ` : ""}
                    {s.agentName} — {s.date ? new Date(s.date).toLocaleDateString("fr-FR") : "date inconnue"} —{" "}
                    {s.archiveLabel}
                  </p>
                </div>
                <span className="text-sm font-medium text-[rgb(var(--brand-400))] shrink-0">
                  ${s.priceAmount.toLocaleString("fr-FR")}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </PageShell>
  );
}
