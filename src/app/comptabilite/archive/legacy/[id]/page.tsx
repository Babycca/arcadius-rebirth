"use client";

import { Fragment, useEffect, useState } from "react";
import { use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Trash } from "lucide-react";
import { PageShell, PageHeader } from "@/components/PageShell";
import { useCanEdit } from "@/lib/use-can-edit";
import { useDialog } from "@/components/DialogProvider";
import TranscriptButton from "@/components/TranscriptButton";

type LegacySale = {
  id: string;
  agentName: string;
  date: string | null;
  houseNumber: string | null;
  priceAmount: number;
  clientName: string | null;
  clientPhone: string | null;
};

type LegacyArchive = { id: string; label: string; createdAt: string; sales: LegacySale[] };

export default function LegacyArchiveDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { canEdit } = useCanEdit();
  const { confirm } = useDialog();
  const [data, setData] = useState<LegacyArchive | null>(null);
  const [forbidden, setForbidden] = useState(false);

  useEffect(() => {
    fetch(`/api/accounting/legacy-archives/${id}`).then(async (res) => {
      if (res.status === 403) {
        setForbidden(true);
        return;
      }
      setData(await res.json());
    });
  }, [id]);

  async function handleDelete() {
    const ok = await confirm("Supprimer cette archive importée ?", { danger: true });
    if (!ok) return;
    await fetch(`/api/accounting/legacy-archives/${id}`, { method: "DELETE" });
    router.push("/comptabilite/archive");
  }

  if (forbidden) {
    return (
      <PageShell>
        <PageHeader title="Archive Comptabilité" subtitle="Accès réservé aux administrateurs" />
      </PageShell>
    );
  }

  const sales = data?.sales ?? [];
  const totalSales = sales.reduce((s, x) => s + x.priceAmount, 0);

  const groups = new Map<string, LegacySale[]>();
  for (const s of sales) {
    if (!groups.has(s.agentName)) groups.set(s.agentName, []);
    groups.get(s.agentName)!.push(s);
  }

  const transcriptRows: (string | number)[][] = [
    ["Agent", "Date", "N° habitation", "Client", "Téléphone", "Prix"],
    ...sales.map((s) => [
      s.agentName,
      s.date ? new Date(s.date).toLocaleDateString("fr-FR") : "",
      s.houseNumber ?? "",
      s.clientName ?? "",
      s.clientPhone ?? "",
      s.priceAmount,
    ]),
  ];

  return (
    <PageShell>
      <div className="flex items-center justify-between mb-3">
        <Link
          href="/comptabilite/archive"
          className="flex items-center gap-1.5 text-xs text-[rgb(var(--muted))] hover:text-[rgb(var(--brand-400))]"
        >
          <ArrowLeft size={13} />
          Archive Comptabilité
        </Link>
        <div className="flex items-center gap-2">
          {sales.length > 0 && <TranscriptButton rows={transcriptRows} />}
          {canEdit && (
            <button
              onClick={handleDelete}
              className="flex items-center gap-1.5 text-xs text-[rgb(var(--danger))] hover:bg-[rgb(var(--danger)/0.1)] rounded-lg px-2.5 py-1.5"
            >
              <Trash size={13} />
              Supprimer cette archive
            </button>
          )}
        </div>
      </div>
      <PageHeader
        title={data?.label ?? "Archive importée"}
        subtitle={
          data
            ? `Archive importée — ${sales.length} vente${sales.length > 1 ? "s" : ""}, $${totalSales.toLocaleString("fr-FR")} — pas de salaire calculé`
            : "Chargement…"
        }
      />

      <div className="glass-strong rounded-xl overflow-hidden max-w-4xl">
        {sales.length === 0 ? (
          <p className="px-4 py-6 text-center text-[rgb(var(--muted))] text-sm">
            {data ? "Aucune vente." : "Chargement…"}
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-[rgb(var(--muted))] border-b border-white/[0.08]">
                <th className="px-4 py-3 font-normal">Date</th>
                <th className="px-4 py-3 font-normal">Habitation</th>
                <th className="px-4 py-3 font-normal">Client</th>
                <th className="px-4 py-3 font-normal">Téléphone</th>
                <th className="px-4 py-3 font-normal text-right">Prix</th>
              </tr>
            </thead>
            <tbody>
              {[...groups.entries()].map(([agentName, agentSales]) => (
                <Fragment key={agentName}>
                  <tr className="bg-white/[0.03]">
                    <td colSpan={5} className="px-4 py-2 text-xs font-semibold text-[rgb(var(--brand-400))]">
                      {agentName}
                    </td>
                  </tr>
                  {agentSales.map((s) => (
                    <tr key={s.id} className="border-b border-white/[0.04] last:border-0">
                      <td className="px-4 py-2.5">{s.date ? new Date(s.date).toLocaleDateString("fr-FR") : "—"}</td>
                      <td className="px-4 py-2.5">{s.houseNumber ? `#${s.houseNumber}` : "—"}</td>
                      <td className="px-4 py-2.5">{s.clientName ?? "—"}</td>
                      <td className="px-4 py-2.5 text-[rgb(var(--muted))]">{s.clientPhone ?? "—"}</td>
                      <td className="px-4 py-2.5 text-right font-medium text-[rgb(var(--brand-400))]">
                        ${s.priceAmount.toLocaleString("fr-FR")}
                      </td>
                    </tr>
                  ))}
                </Fragment>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </PageShell>
  );
}
