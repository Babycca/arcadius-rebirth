"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Upload } from "lucide-react";
import { PageShell, PageHeader } from "@/components/PageShell";
import { useCanEdit } from "@/lib/use-can-edit";

export default function ImportLegacyArchivePage() {
  const { isAdmin } = useCanEdit();
  const router = useRouter();
  const [label, setLabel] = useState("");
  const [pasted, setPasted] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isAdmin) {
    return (
      <PageShell>
        <PageHeader title="Importer une archive" subtitle="Accès réservé aux administrateurs" />
      </PageShell>
    );
  }

  async function handleImport() {
    if (!label.trim() || !pasted.trim()) return;
    setSaving(true);
    setError(null);
    const res = await fetch("/api/accounting/legacy-archives", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label: label.trim(), pasted }),
    });
    setSaving(false);
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(body?.error ?? "Impossible d'importer cette archive.");
      return;
    }
    const archive = await res.json();
    router.push(`/comptabilite/archive/legacy/${archive.id}`);
  }

  return (
    <PageShell>
      <Link
        href="/comptabilite/archive"
        className="flex items-center gap-1.5 text-xs text-[rgb(var(--muted))] hover:text-[rgb(var(--brand-400))] mb-3"
      >
        <ArrowLeft size={13} />
        Archive Comptabilité
      </Link>
      <PageHeader
        title="Importer une ancienne archive"
        subtitle="Colle les lignes copiées depuis l'ancien Google Sheets — aucun calcul de salaire, juste un listing des ventes."
      />

      <div className="glass-strong rounded-xl p-5 max-w-2xl flex flex-col gap-4">
        {error && (
          <div className="rounded-lg bg-[rgb(var(--danger)/0.12)] text-[rgb(var(--danger))] text-xs px-3 py-2">
            {error}
          </div>
        )}
        <div>
          <label className="text-xs text-[rgb(var(--muted))] mb-1 block">Nom de cette archive</label>
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Ex : Semaine du 11 au 18 octobre 2026"
            className="glass rounded-lg px-3 py-2 text-sm w-full outline-none"
          />
        </div>
        <div>
          <label className="text-xs text-[rgb(var(--muted))] mb-1 block">
            Contenu collé (depuis Google Sheets — sélectionne les colonnes Date / N° habitation / Prix / Client /
            Téléphone, avec les lignes de nom d&apos;agent au-dessus de chaque groupe)
          </label>
          <textarea
            value={pasted}
            onChange={(e) => setPasted(e.target.value)}
            rows={14}
            placeholder={"Emy\n11/10/2026\t22094\t$100 000\tIsmael Belkacem\t602800872416\n…"}
            className="glass rounded-lg px-3 py-2 text-sm w-full outline-none font-mono"
          />
        </div>
        <button
          onClick={handleImport}
          disabled={saving || !label.trim() || !pasted.trim()}
          className="flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-[rgb(var(--brand-500))] to-[rgb(var(--brand-600))] hover:brightness-110 transition-all disabled:opacity-60"
        >
          <Upload size={15} />
          {saving ? "Import…" : "Importer"}
        </button>
      </div>
    </PageShell>
  );
}
