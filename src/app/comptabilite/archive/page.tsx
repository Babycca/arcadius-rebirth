"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Archive, ChevronRight, Trash2, Upload, FileClock } from "lucide-react";
import { PageShell, PageHeader } from "@/components/PageShell";
import { useCanEdit } from "@/lib/use-can-edit";
import { useDialog } from "@/components/DialogProvider";
import { weekDateRangeLabel } from "@/lib/accounting/week-client";

type ArchiveRow = { weekId: string; periodStart: string | null; archivedAt: string; salesCount: number; totalSales: number };
type LegacyRow = { id: string; label: string; createdAt: string; salesCount: number; totalSales: number };

export default function ComptabiliteArchivePage() {
  const { isAdmin, canEdit } = useCanEdit();
  const { confirm } = useDialog();
  const [rows, setRows] = useState<ArchiveRow[] | null>(null);
  const [legacyRows, setLegacyRows] = useState<LegacyRow[] | null>(null);
  const [forbidden, setForbidden] = useState(false);

  function load() {
    fetch("/api/accounting/archive").then(async (res) => {
      if (res.status === 403) {
        setForbidden(true);
        return;
      }
      setRows(await res.json());
    });
    fetch("/api/accounting/legacy-archives").then((res) => (res.ok ? res.json() : [])).then(setLegacyRows);
  }

  useEffect(() => {
    load();
  }, []);

  async function deleteArchive(weekId: string) {
    const ok = await confirm(
      "Supprimer cette archive ? Les ventes elles-mêmes resteront en base, mais cette entrée disparaîtra de l'archive.",
      { danger: true }
    );
    if (!ok) return;
    await fetch(`/api/accounting/archive/${encodeURIComponent(weekId)}`, { method: "DELETE" });
    load();
  }

  async function deleteLegacyArchive(id: string) {
    const ok = await confirm("Supprimer cette archive importée ?", { danger: true });
    if (!ok) return;
    await fetch(`/api/accounting/legacy-archives/${id}`, { method: "DELETE" });
    load();
  }

  if (forbidden || (!isAdmin && rows === null)) {
    return (
      <PageShell>
        <PageHeader title="Archive Comptabilité" subtitle="Accès réservé aux administrateurs" />
        <p className="text-sm text-[rgb(var(--muted))]">Tu n&apos;as pas accès à cette page.</p>
      </PageShell>
    );
  }

  const nothing = (rows?.length ?? 0) === 0 && (legacyRows?.length ?? 0) === 0;

  return (
    <PageShell>
      <div className="flex items-center justify-between flex-wrap gap-4 mb-8">
        <div>
          <h1 className="font-heading text-2xl sm:text-3xl leading-normal pb-1">Archive Comptabilité</h1>
          <p className="text-sm text-[rgb(var(--muted))] mt-1.5">Semaines clôturées — historique conservé</p>
        </div>
        {isAdmin && (
          <Link
            href="/comptabilite/archive/import"
            className="flex items-center gap-2 text-sm rounded-xl px-4 py-2.5 glass hover:border-[rgb(var(--brand-500)/0.4)] transition-colors"
          >
            <Upload size={14} />
            Importer une ancienne archive
          </Link>
        )}
      </div>

      <div className="glass-strong rounded-xl overflow-hidden max-w-4xl mx-auto">
        {nothing && (
          <p className="px-4 py-6 text-center text-[rgb(var(--muted))] text-sm">Aucune semaine archivée pour l&apos;instant.</p>
        )}
        {rows?.map((r) => (
          <div
            key={r.weekId}
            className="flex items-center justify-between gap-3 px-4 py-3 border-b border-white/[0.04] last:border-0 hover:bg-white/[0.03] transition-colors group"
          >
            <Link href={`/comptabilite/archive/${encodeURIComponent(r.weekId)}`} className="flex items-center gap-3 flex-1 min-w-0">
              <Archive size={16} className="text-[rgb(var(--brand-400))] shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-medium">{r.weekId}</p>
                <p className="text-xs text-[rgb(var(--muted))]">
                  {r.periodStart ? `${weekDateRangeLabel(new Date(r.periodStart))} — ` : ""}
                  {r.salesCount} vente
                  {r.salesCount > 1 ? "s" : ""}, ${r.totalSales.toLocaleString("fr-FR")}
                </p>
              </div>
            </Link>
            {canEdit && (
              <button
                onClick={() => deleteArchive(r.weekId)}
                className="text-[rgb(var(--muted))] hover:text-[rgb(var(--danger))] p-2 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                title="Supprimer cette archive"
              >
                <Trash2 size={15} />
              </button>
            )}
            <Link href={`/comptabilite/archive/${encodeURIComponent(r.weekId)}`}>
              <ChevronRight size={16} className="text-[rgb(var(--muted))]" />
            </Link>
          </div>
        ))}
        {legacyRows?.map((r) => (
          <div
            key={r.id}
            className="flex items-center justify-between gap-3 px-4 py-3 border-b border-white/[0.04] last:border-0 hover:bg-white/[0.03] transition-colors group"
          >
            <Link href={`/comptabilite/archive/legacy/${r.id}`} className="flex items-center gap-3 flex-1 min-w-0">
              <FileClock size={16} className="text-[rgb(var(--muted))] shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-medium">
                  {r.label} <span className="text-xs text-[rgb(var(--muted))] font-normal">— importée</span>
                </p>
                <p className="text-xs text-[rgb(var(--muted))]">
                  {r.salesCount} vente{r.salesCount > 1 ? "s" : ""}, ${r.totalSales.toLocaleString("fr-FR")}
                </p>
              </div>
            </Link>
            {canEdit && (
              <button
                onClick={() => deleteLegacyArchive(r.id)}
                className="text-[rgb(var(--muted))] hover:text-[rgb(var(--danger))] p-2 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                title="Supprimer cette archive"
              >
                <Trash2 size={15} />
              </button>
            )}
            <Link href={`/comptabilite/archive/legacy/${r.id}`}>
              <ChevronRight size={16} className="text-[rgb(var(--muted))]" />
            </Link>
          </div>
        ))}
      </div>
    </PageShell>
  );
}
