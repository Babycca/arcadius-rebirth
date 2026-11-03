"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Trash2, RotateCcw, Eraser } from "lucide-react";
import { PageShell, PageHeader } from "@/components/PageShell";
import { usePermissions } from "@/lib/use-permissions";
import { useDialog } from "@/components/DialogProvider";
import { useToast } from "@/components/ToastProvider";
import Tooltip from "@/components/Tooltip";

type DeletedSale = {
  id: string;
  agentName: string;
  date: string;
  houseNumber: string;
  priceAmount: number;
  clientName: string;
  clientPhone: string | null;
  weekId: string;
  deletedAt: string;
};

export default function TrashPage() {
  const { has } = usePermissions();
  const canManage = has("ventesSupprimer");
  const { confirm } = useDialog();
  const toast = useToast();
  const [rows, setRows] = useState<DeletedSale[] | null>(null);

  function load() {
    fetch("/api/accounting/trash")
      .then((r) => (r.ok ? r.json() : []))
      .then(setRows);
  }

  useEffect(() => {
    load();
  }, []);

  async function restore(id: string) {
    const res = await fetch(`/api/accounting/trash/${id}`, { method: "POST" });
    if (res.ok) {
      toast("Vente restaurée.");
      load();
    } else {
      toast("Impossible de restaurer cette vente.", "error");
    }
  }

  async function deleteOne(id: string) {
    const ok = await confirm("Supprimer définitivement cette vente ? Impossible à annuler.", { danger: true });
    if (!ok) return;
    await fetch(`/api/accounting/trash/${id}`, { method: "DELETE" });
    load();
  }

  async function emptyTrash() {
    const ok = await confirm(
      `Vider la corbeille ? Les ${rows?.length ?? 0} vente(s) seront supprimées définitivement, sans possibilité de retour.`,
      { danger: true }
    );
    if (!ok) return;
    await fetch("/api/accounting/trash", { method: "DELETE" });
    toast("Corbeille vidée.");
    load();
  }

  if (!canManage) {
    return (
      <PageShell>
        <PageHeader title="Corbeille" subtitle="Accès réservé" />
        <p className="text-sm text-[rgb(var(--muted))]">Tu n&apos;as pas accès à cette page.</p>
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
      <div className="flex items-center justify-between flex-wrap gap-4 mb-8">
        <div>
          <h1 className="font-heading text-2xl sm:text-3xl leading-normal pb-1">Corbeille</h1>
          <p className="text-sm text-[rgb(var(--muted))] mt-1.5">
            {rows ? `${rows.length} vente${rows.length > 1 ? "s" : ""} supprimée${rows.length > 1 ? "s" : ""}` : "Chargement…"}
          </p>
        </div>
        {rows && rows.length > 0 && (
          <button
            onClick={emptyTrash}
            className="flex items-center gap-2 text-sm rounded-xl px-4 py-2.5 text-[rgb(var(--danger))] bg-[rgb(var(--danger)/0.1)] hover:bg-[rgb(var(--danger)/0.18)] transition-colors"
          >
            <Eraser size={14} />
            Vider la corbeille
          </button>
        )}
      </div>

      <div className="glass-strong rounded-xl overflow-hidden max-w-5xl mx-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-[rgb(var(--muted))] border-b border-white/[0.08]">
              <th className="px-4 py-3 font-normal">Date</th>
              <th className="px-4 py-3 font-normal">Habitation</th>
              <th className="px-4 py-3 font-normal">Client</th>
              <th className="px-4 py-3 font-normal">Agent</th>
              <th className="px-4 py-3 font-normal">Semaine</th>
              <th className="px-4 py-3 font-normal text-right">Prix</th>
              <th className="px-4 py-3 font-normal text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows?.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-[rgb(var(--muted))] text-sm">
                  Corbeille vide.
                </td>
              </tr>
            )}
            {rows?.map((r) => (
              <tr key={r.id} className="border-b border-white/[0.04] last:border-0 hover:bg-white/[0.03]">
                <td className="px-4 py-2.5">{new Date(r.date).toLocaleDateString("fr-FR")}</td>
                <td className="px-4 py-2.5">#{r.houseNumber}</td>
                <td className="px-4 py-2.5">{r.clientName}</td>
                <td className="px-4 py-2.5 text-[rgb(var(--muted))]">{r.agentName}</td>
                <td className="px-4 py-2.5 text-[rgb(var(--muted))]">{r.weekId}</td>
                <td className="px-4 py-2.5 text-right font-medium text-[rgb(var(--brand-400))]">
                  ${r.priceAmount.toLocaleString("fr-FR")}
                </td>
                <td className="px-4 py-2.5 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Tooltip label="Restaurer">
                      <button
                        onClick={() => restore(r.id)}
                        className="text-[rgb(var(--muted))] hover:text-[rgb(var(--success))] p-1.5"
                      >
                        <RotateCcw size={14} />
                      </button>
                    </Tooltip>
                    <Tooltip label="Supprimer définitivement">
                      <button
                        onClick={() => deleteOne(r.id)}
                        className="text-[rgb(var(--muted))] hover:text-[rgb(var(--danger))] p-1.5"
                      >
                        <Trash2 size={14} />
                      </button>
                    </Tooltip>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </PageShell>
  );
}
