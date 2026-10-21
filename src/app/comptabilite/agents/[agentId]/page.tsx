"use client";

import { use, useEffect, useState } from "react";
import { PageShell, PageHeader } from "@/components/PageShell";

type Sale = {
  id: string;
  date: string;
  houseNumber: string;
  priceAmount: number;
  clientName: string;
  clientPhone: string | null;
};

export default function AgentWeekDetailPage({
  params,
}: {
  params: Promise<{ agentId: string }>;
}) {
  const { agentId } = use(params);
  const [agentName, setAgentName] = useState("");
  const [agentAvatarUrl, setAgentAvatarUrl] = useState<string | null>(null);
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/accounting/agents/${agentId}/sales`).then(async (res) => {
      if (res.ok) {
        const data = await res.json();
        setAgentName(data.agent.name);
        setAgentAvatarUrl(data.agent.avatarUrl);
        setSales(data.sales);
      }
      setLoading(false);
    });
  }, [agentId]);

  const total = sales.reduce((s, x) => s + x.priceAmount, 0);

  return (
    <PageShell>
      <PageHeader
        title={
          <div className="flex items-center gap-3">
            <span className="w-9 h-9 rounded-full bg-[rgb(var(--brand-500)/0.18)] text-[rgb(var(--brand-400))] flex items-center justify-center text-sm font-medium overflow-hidden shrink-0">
              {agentAvatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={agentAvatarUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                (agentName || "?")[0]
              )}
            </span>
            {agentName || "Agent"}
          </div>
        }
        subtitle={loading ? "Chargement…" : `${sales.length} vente(s) cette semaine — $${total.toLocaleString("fr-FR")}`}
      />

      <div className="glass-strong rounded-xl overflow-hidden max-w-2xl">
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
            {!loading && sales.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-[rgb(var(--muted))] text-sm">
                  Aucune vente cette semaine.
                </td>
              </tr>
            )}
            {sales.map((s) => (
              <tr key={s.id} className="border-b border-white/[0.04] last:border-0 hover:bg-white/[0.03]">
                <td className="px-4 py-2.5">{new Date(s.date).toLocaleDateString("fr-FR")}</td>
                <td className="px-4 py-2.5">#{s.houseNumber}</td>
                <td className="px-4 py-2.5">{s.clientName}</td>
                <td className="px-4 py-2.5 text-[rgb(var(--muted))]">{s.clientPhone ?? "—"}</td>
                <td className="px-4 py-2.5 text-right font-medium text-[rgb(var(--brand-400))]">
                  ${s.priceAmount.toLocaleString("fr-FR")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </PageShell>
  );
}
