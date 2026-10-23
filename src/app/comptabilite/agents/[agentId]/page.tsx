"use client";

import { use, useEffect, useState } from "react";
import { PageShell } from "@/components/PageShell";
import UserAvatar from "@/components/UserAvatar";

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: "Super Admin",
  ADMIN: "Admin",
  AGENT: "Agent",
};

type Sale = {
  id: string;
  date: string;
  houseNumber: string;
  priceAmount: number;
  clientName: string;
  clientPhone: string | null;
};

type GarageSale = {
  id: string;
  type: string;
  name: string | null;
  houseNumber: string;
  priceAmount: number;
  date: string;
};

export default function AgentWeekDetailPage({
  params,
}: {
  params: Promise<{ agentId: string }>;
}) {
  const { agentId } = use(params);
  const [agentName, setAgentName] = useState("");
  const [agentAvatarUrl, setAgentAvatarUrl] = useState<string | null>(null);
  const [agentGrade, setAgentGrade] = useState("");
  const [agentRole, setAgentRole] = useState("");
  const [sales, setSales] = useState<Sale[]>([]);
  const [garages, setGarages] = useState<GarageSale[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/accounting/agents/${agentId}/sales`).then(async (res) => {
      if (res.ok) {
        const data = await res.json();
        setAgentName(data.agent.name);
        setAgentAvatarUrl(data.agent.avatarUrl);
        setAgentGrade(data.agent.grade);
        setAgentRole(data.agent.role);
        setSales(data.sales);
      }
      setLoading(false);
    });
    fetch(`/api/accounting/agents/${agentId}/garage-sales`)
      .then((res) => (res.ok ? res.json() : []))
      .then(setGarages);
  }, [agentId]);

  const total = sales.reduce((s, x) => s + x.priceAmount, 0);

  return (
    <PageShell>
      <div className="flex justify-end mb-2">
        <UserAvatar />
      </div>
      <div className="flex flex-col items-center text-center mb-10">
        <span className="relative w-28 h-28 rounded-full bg-[rgb(var(--brand-500)/0.18)] text-[rgb(var(--brand-400))] flex items-center justify-center text-3xl font-medium overflow-hidden shrink-0 mb-4 ring-4 ring-[rgb(var(--brand-500)/0.25)] shadow-[0_0_40px_rgb(var(--brand-glow)/0.25)]">
          {agentAvatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={agentAvatarUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            (agentName || "?")[0]
          )}
        </span>
        <h1 className="font-heading text-3xl">{agentName || "Agent"}</h1>
        <p className="inline-flex items-center gap-1.5 text-xs font-medium text-[rgb(var(--brand-400))] bg-[rgb(var(--brand-500)/0.12)] border border-[rgb(var(--brand-500)/0.25)] rounded-full px-3 py-1 mt-3">
          {agentGrade}
          {agentRole && agentRole !== "SUPER_ADMIN" && (
            <>
              <span className="w-1 h-1 rounded-full bg-[rgb(var(--brand-400))]" />
              {ROLE_LABELS[agentRole] ?? agentRole}
            </>
          )}
        </p>
        <p className="text-xs text-[rgb(var(--muted))] mt-3">
          {loading ? "Chargement…" : `${sales.length} vente(s) cette semaine — $${total.toLocaleString("fr-FR")}`}
        </p>
      </div>

      <div className="card-hover glass-strong rounded-xl overflow-hidden max-w-4xl mx-auto border border-transparent">
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

      {garages.length > 0 && (
        <div className="card-hover glass-strong rounded-xl overflow-hidden max-w-4xl mx-auto mt-5 border border-transparent">
          <p className="text-xs text-[rgb(var(--muted))] px-4 py-3 border-b border-white/[0.08]">
            Garages posés — ne compte pas comme une vente
          </p>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-[rgb(var(--muted))] border-b border-white/[0.08]">
                <th className="px-4 py-2 font-normal">Date</th>
                <th className="px-4 py-2 font-normal">Type</th>
                <th className="px-4 py-2 font-normal">Nom</th>
                <th className="px-4 py-2 font-normal">Habitation</th>
                <th className="px-4 py-2 font-normal text-right">Prix</th>
              </tr>
            </thead>
            <tbody>
              {garages.map((g) => (
                <tr key={g.id} className="border-b border-white/[0.04] last:border-0">
                  <td className="px-4 py-2">{new Date(g.date).toLocaleDateString("fr-FR")}</td>
                  <td className="px-4 py-2">{g.type}</td>
                  <td className="px-4 py-2">{g.name || "—"}</td>
                  <td className="px-4 py-2">#{g.houseNumber}</td>
                  <td className="px-4 py-2 text-right font-medium text-[rgb(var(--brand-400))]">
                    ${g.priceAmount.toLocaleString("fr-FR")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </PageShell>
  );
}
