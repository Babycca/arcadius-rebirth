"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, TriangleAlert, Check } from "lucide-react";
import { PageShell, PageHeader } from "@/components/PageShell";
import { useCanEdit } from "@/lib/use-can-edit";

type GapsResponse = { missing: number[]; min: number | null; max: number | null; tooWide?: boolean };

export default function HouseNumberGapsPage() {
  const { isAdmin } = useCanEdit();
  const [data, setData] = useState<GapsResponse | null>(null);
  const [validating, setValidating] = useState<number | null>(null);

  function load() {
    fetch("/api/accounting/house-number-gaps")
      .then((r) => (r.ok ? r.json() : null))
      .then(setData);
  }

  useEffect(() => {
    load();
  }, []);

  async function validate(houseNumber: number) {
    setValidating(houseNumber);
    const res = await fetch("/api/accounting/house-number-gaps", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ houseNumber }),
    });
    setValidating(null);
    if (res.ok) load();
  }

  if (!isAdmin) {
    return (
      <PageShell>
        <PageHeader title="Numéros d'habitation" subtitle="Accès réservé aux administrateurs" />
      </PageShell>
    );
  }

  return (
    <PageShell>
      <Link
        href="/administration"
        className="flex items-center gap-1.5 text-xs text-[rgb(var(--muted))] hover:text-[rgb(var(--brand-400))] mb-3"
      >
        <ArrowLeft size={13} />
        Administration
      </Link>
      <PageHeader
        title="Numéros d'habitation"
        subtitle="Numéros 'sautés' dans la comptabilité de la semaine en cours — probablement une vente oubliée"
      />

      <div className="max-w-2xl mx-auto">
        {!data && <p className="text-sm text-[rgb(var(--muted))] text-center py-6">Chargement…</p>}

        {data && data.tooWide && (
          <p className="text-sm text-[rgb(var(--muted))] text-center py-6">
            L&apos;écart entre le plus petit et le plus grand numéro de la semaine est trop large pour une
            vérification fiable.
          </p>
        )}

        {data && !data.tooWide && data.missing.length === 0 && (
          <p className="text-sm text-[rgb(var(--success))] text-center py-6 flex items-center justify-center gap-2">
            <Check size={16} />
            Aucun numéro manquant pour l&apos;instant.
          </p>
        )}

        {data && data.missing.length > 0 && (
          <div className="glass-strong rounded-xl overflow-hidden">
            {data.missing.map((n) => (
              <div
                key={n}
                className="flex items-center justify-between gap-3 px-4 py-3 border-b border-white/[0.04] last:border-0"
              >
                <div className="flex items-center gap-2.5">
                  <TriangleAlert size={15} className="text-[rgb(var(--warning))] shrink-0" />
                  <p className="text-sm">
                    Habitation <span className="font-medium">#{n}</span> jamais notée cette semaine
                  </p>
                </div>
                <button
                  onClick={() => validate(n)}
                  disabled={validating === n}
                  className="flex items-center gap-1.5 text-xs font-medium rounded-lg px-3 py-1.5 text-[rgb(var(--success))] bg-[rgb(var(--success)/0.12)] hover:bg-[rgb(var(--success)/0.2)] transition-colors disabled:opacity-60 shrink-0"
                >
                  <Check size={13} />
                  {validating === n ? "…" : "C'est bon"}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </PageShell>
  );
}
