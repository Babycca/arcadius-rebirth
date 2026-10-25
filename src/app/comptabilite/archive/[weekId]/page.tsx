"use client";

import { Fragment, useEffect, useState } from "react";
import { use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ChevronDown, Pencil, Trash2, Check, X, Trash } from "lucide-react";
import { PageShell, PageHeader } from "@/components/PageShell";
import { useCanEdit } from "@/lib/use-can-edit";
import { useDialog } from "@/components/DialogProvider";
import TranscriptButton from "@/components/TranscriptButton";
import CsvExportButton from "@/components/CsvExportButton";
import { weekDateRangeLabel } from "@/lib/accounting/week-client";
import { parseMoneyAmount } from "@/lib/accounting/parse-amount";

type AgentSummary = {
  id: string;
  name: string;
  avatarUrl: string | null;
  phone: string | null;
  grade: string;
  commissionRate: number;
  totalSales: number;
  companyProfit: number;
  bonusAmount: number;
  salary: number;
  salesCount: number;
  invoiceCount: number;
};

type Sale = {
  id: string;
  date: string;
  houseNumber: string;
  priceAmount: number;
  clientName: string;
  clientPhone: string | null;
};

type Expense = {
  id: string;
  reason: string;
  amount: number;
  createdAt: string;
};

type GarageSale = {
  id: string;
  type: string;
  name: string | null;
  houseNumber: string;
  priceAmount: number;
  date: string;
};

function AgentSalesRow({ agentId, weekId, canEdit, onChanged }: { agentId: string; weekId: string; canEdit: boolean; onChanged: () => void }) {
  const { confirm } = useDialog();
  const [sales, setSales] = useState<Sale[] | null>(null);
  const [garages, setGarages] = useState<GarageSale[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editHouseNumber, setEditHouseNumber] = useState("");
  const [editPriceAmount, setEditPriceAmount] = useState("");
  const [editClientName, setEditClientName] = useState("");

  function load() {
    fetch(`/api/accounting/agents/${agentId}/sales?weekId=${encodeURIComponent(weekId)}`)
      .then((r) => r.json())
      .then((d) => setSales(d.sales ?? []));
    fetch(`/api/accounting/agents/${agentId}/garage-sales?weekId=${encodeURIComponent(weekId)}`)
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => setGarages(Array.isArray(d) ? d : []));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agentId, weekId]);

  function startEdit(s: Sale) {
    setEditingId(s.id);
    setEditHouseNumber(s.houseNumber);
    setEditPriceAmount(String(s.priceAmount));
    setEditClientName(s.clientName);
  }

  async function saveEdit(id: string) {
    await fetch(`/api/accounting/sales/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ houseNumber: editHouseNumber, priceAmount: Number(editPriceAmount), clientName: editClientName }),
    });
    setEditingId(null);
    load();
    onChanged();
  }

  async function deleteSale(id: string) {
    if (!confirm("Supprimer cette vente ?")) return;
    await fetch(`/api/accounting/sales/${id}`, { method: "DELETE" });
    load();
    onChanged();
  }

  if (!sales) return <p className="px-4 py-3 text-xs text-[rgb(var(--muted))]">Chargement…</p>;

  return (
    <>
    {sales.length === 0 ? (
      <p className="px-4 py-3 text-xs text-[rgb(var(--muted))]">Aucune vente.</p>
    ) : (
    <table className="w-full text-xs">
      <thead>
        <tr className="text-left text-[rgb(var(--muted))] border-b border-white/[0.06]">
          <th className="px-4 py-2 font-normal">Date</th>
          <th className="px-4 py-2 font-normal">Habitation</th>
          <th className="px-4 py-2 font-normal">Client</th>
          <th className="px-4 py-2 font-normal text-right">Prix</th>
          {canEdit && <th className="px-4 py-2 font-normal text-right">Actions</th>}
        </tr>
      </thead>
      <tbody>
        {sales.map((s) =>
          editingId === s.id ? (
            <tr key={s.id} className="border-b border-white/[0.04] last:border-0 bg-white/[0.02]">
              <td className="px-4 py-2">{new Date(s.date).toLocaleDateString("fr-FR")}</td>
              <td className="px-4 py-2">
                <input
                  value={editHouseNumber}
                  onChange={(e) => setEditHouseNumber(e.target.value)}
                  className="glass rounded px-1.5 py-1 w-20 outline-none"
                />
              </td>
              <td className="px-4 py-2">
                <input
                  value={editClientName}
                  onChange={(e) => setEditClientName(e.target.value)}
                  className="glass rounded px-1.5 py-1 w-28 outline-none"
                />
              </td>
              <td className="px-4 py-2 text-right">
                <input
                  type="number"
                  value={editPriceAmount}
                  onChange={(e) => setEditPriceAmount(e.target.value)}
                  className="glass rounded px-1.5 py-1 w-24 outline-none text-right"
                />
              </td>
              <td className="px-4 py-2 text-right">
                <div className="flex items-center justify-end gap-1">
                  <button onClick={() => saveEdit(s.id)} className="text-[rgb(var(--brand-400))] p-1">
                    <Check size={13} />
                  </button>
                  <button onClick={() => setEditingId(null)} className="text-[rgb(var(--muted))] p-1">
                    <X size={13} />
                  </button>
                </div>
              </td>
            </tr>
          ) : (
            <tr key={s.id} className="border-b border-white/[0.04] last:border-0 hover:bg-white/[0.02] group">
              <td className="px-4 py-2">{new Date(s.date).toLocaleDateString("fr-FR")}</td>
              <td className="px-4 py-2">#{s.houseNumber}</td>
              <td className="px-4 py-2">{s.clientName}</td>
              <td className="px-4 py-2 text-right font-medium text-[rgb(var(--brand-400))]">
                ${s.priceAmount.toLocaleString("fr-FR")}
              </td>
              {canEdit && (
                <td className="px-4 py-2 text-right">
                  <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => startEdit(s)} className="text-[rgb(var(--muted))] hover:text-[rgb(var(--brand-400))] p-1">
                      <Pencil size={13} />
                    </button>
                    <button onClick={() => deleteSale(s.id)} className="text-[rgb(var(--muted))] hover:text-[rgb(var(--danger))] p-1">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </td>
              )}
            </tr>
          )
        )}
      </tbody>
    </table>
    )}
    {garages.length > 0 && (
      <div className="border-t border-white/[0.06]">
        <p className="text-[11px] text-[rgb(var(--muted))] px-4 pt-2.5">Garages posés (hors ventes)</p>
        <table className="w-full text-xs">
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
    </>
  );
}

export default function ComptabiliteArchiveDetailPage({ params }: { params: Promise<{ weekId: string }> }) {
  const { weekId } = use(params);
  const router = useRouter();
  const { canEdit } = useCanEdit();
  const { confirm } = useDialog();
  const [data, setData] = useState<{
    weekId: string;
    periodStart: string | null;
    semaineA: string | null;
    semaineB: string | null;
    lotEmploye: string | null;
    agents: AgentSummary[];
  } | null>(null);
  const [allSales, setAllSales] = useState<
    { id: string; agentName: string; date: string; houseNumber: string; priceAmount: number; clientName: string; clientPhone: string | null }[]
  >([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [forbidden, setForbidden] = useState(false);
  const [expandedIds, setExpandedIds] = useState<string[]>([]);

  function toggleExpanded(id: string) {
    setExpandedIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));
  }

  function load() {
    fetch(`/api/accounting/agents-summary?weekId=${encodeURIComponent(weekId)}`).then(async (res) => {
      if (res.status === 403) {
        setForbidden(true);
        return;
      }
      setData(await res.json());
    });
    fetch(`/api/accounting/archive/${encodeURIComponent(weekId)}/sales`)
      .then((res) => (res.ok ? res.json() : []))
      .then(setAllSales);
    fetch(`/api/accounting/expenses?weekId=${encodeURIComponent(weekId)}`)
      .then((res) => (res.ok ? res.json() : []))
      .then(setExpenses);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekId]);

  async function deleteArchive() {
    const ok = await confirm("Supprimer cette archive ? Les ventes elles-mêmes resteront en base.", { danger: true });
    if (!ok) return;
    await fetch(`/api/accounting/archive/${encodeURIComponent(weekId)}`, { method: "DELETE" });
    router.push("/comptabilite/archive");
  }

  if (forbidden) {
    return (
      <PageShell>
        <PageHeader title="Archive Comptabilité" subtitle="Accès réservé aux administrateurs" />
        <p className="text-sm text-[rgb(var(--muted))]">Tu n&apos;as pas accès à cette page.</p>
      </PageShell>
    );
  }

  const agents = data?.agents ?? [];
  const totalSales = agents.reduce((s, a) => s + a.totalSales, 0);
  const totalProfit = agents.reduce((s, a) => s + a.companyProfit, 0);
  const totalSalaries = agents.reduce((s, a) => s + a.salary, 0);
  const totalExpenses = expenses.reduce((s, x) => s + x.amount, 0);
  const lotEmployeAmount = parseMoneyAmount(data?.lotEmploye);
  const netProfit = totalProfit - totalSalaries - totalExpenses - lotEmployeAmount;
  const taxes = netProfit * 0.3;

  const exportRows: (string | number | null)[][] = [
    ["Agent", "Téléphone", "Grade", "%", "Nb facture", "CA", "Prime", "Salaire"],
    ...agents.map((a) => [a.name, a.phone ?? "", a.grade, a.commissionRate, a.invoiceCount, a.totalSales, a.bonusAmount, a.salary]),
    [],
    ["Détail des ventes"],
    ["Agent", "Date", "Habitation", "Client", "Téléphone", "Prix"],
    ...allSales.map((s) => [
      s.agentName,
      new Date(s.date).toLocaleDateString("fr-FR"),
      s.houseNumber,
      s.clientName,
      s.clientPhone ?? "",
      s.priceAmount,
    ]),
    [],
    ["Dépenses"],
    ["Raison", "Montant"],
    ...expenses.map((x) => [x.reason, x.amount]),
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
          {agents.length > 0 && (
            <>
              <TranscriptButton rows={exportRows} />
              <CsvExportButton rows={exportRows} filename={`comptabilite-${weekId}`} />
            </>
          )}
          {canEdit && (
            <button
              onClick={deleteArchive}
              className="flex items-center gap-1.5 text-xs text-[rgb(var(--danger))] hover:bg-[rgb(var(--danger)/0.1)] rounded-lg px-2.5 py-1.5"
            >
              <Trash size={13} />
              Supprimer cette archive
            </button>
          )}
        </div>
      </div>
      <PageHeader
        title={`Semaine ${weekId}`}
        subtitle={
          !data
            ? "Chargement…"
            : data.periodStart
            ? `${weekDateRangeLabel(new Date(data.periodStart))} — archivée, lecture seule`
            : "Archivée, lecture seule"
        }
      />

      <div className="flex gap-4 mb-4 flex-wrap">
        <div className="glass-strong rounded-xl px-4 py-2.5">
          <p className="text-xs text-[rgb(var(--muted))]">Nombre de salariés</p>
          <p className="text-lg font-semibold">{agents.length}</p>
        </div>
        <div className="glass-strong rounded-xl px-4 py-2.5">
          <p className="text-xs text-[rgb(var(--muted))]">Total facture</p>
          <p className="text-lg font-semibold">${totalSales.toLocaleString("fr-FR")}</p>
        </div>
        <div className="glass-strong rounded-xl px-4 py-2.5">
          <p className="text-xs text-[rgb(var(--muted))]">Bénéfices</p>
          <p className="text-lg font-semibold text-[rgb(var(--brand-400))]">${totalProfit.toLocaleString("fr-FR")}</p>
        </div>
        <div className="glass-strong rounded-xl px-4 py-2.5">
          <p className="text-xs text-[rgb(var(--muted))]">Salaires</p>
          <p className="text-lg font-semibold">${totalSalaries.toLocaleString("fr-FR")}</p>
        </div>
        <div className="glass-strong rounded-xl px-4 py-2.5">
          <p className="text-xs text-[rgb(var(--muted))]">Dépenses</p>
          <p className="text-lg font-semibold text-[rgb(var(--danger))]">-${totalExpenses.toLocaleString("fr-FR")}</p>
        </div>
        <div className="glass-strong rounded-xl px-4 py-2.5">
          <p className="text-xs text-[rgb(var(--muted))]">Bénéfices net</p>
          <p className="text-lg font-semibold text-[rgb(var(--success))]">${netProfit.toLocaleString("fr-FR")}</p>
        </div>
        <div className="glass-strong rounded-xl px-4 py-2.5">
          <p className="text-xs text-[rgb(var(--muted))]">Taxes (30%)</p>
          <p className="text-lg font-semibold text-[rgb(var(--warning))]">${taxes.toLocaleString("fr-FR")}</p>
        </div>
      </div>

      <div className="flex gap-4 mb-5 flex-wrap">
        <div className="glass-strong rounded-xl px-4 py-2.5">
          <p className="text-xs text-[rgb(var(--muted))]">Semaine A</p>
          <p className="text-lg font-semibold">{data?.semaineA || "—"}</p>
        </div>
        <div className="glass-strong rounded-xl px-4 py-2.5">
          <p className="text-xs text-[rgb(var(--muted))]">Semaine B</p>
          <p className="text-lg font-semibold">{data?.semaineB || "—"}</p>
        </div>
        <div className="glass-strong rounded-xl px-4 py-2.5">
          <p className="text-xs text-[rgb(var(--muted))]">Lot employé</p>
          <p className="text-lg font-semibold">{data?.lotEmploye || "—"}</p>
        </div>
      </div>

      {agents.length > 0 && (
        <div className="flex justify-end mb-2">
          <button
            onClick={() =>
              setExpandedIds((ids) => (ids.length === agents.length ? [] : agents.map((a) => a.id)))
            }
            className="text-xs text-[rgb(var(--muted))] hover:text-[rgb(var(--brand-400))]"
          >
            {expandedIds.length === agents.length ? "Tout replier" : "Tout déplier"}
          </button>
        </div>
      )}

      <div className="glass-strong rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-[rgb(var(--muted))] border-b border-white/[0.08]">
              <th className="px-4 py-3 font-normal w-6" />
              <th className="px-4 py-3 font-normal">Agent</th>
              <th className="px-4 py-3 font-normal">Téléphone</th>
              <th className="px-4 py-3 font-normal">Grade</th>
              <th className="px-4 py-3 font-normal">%</th>
              <th className="px-4 py-3 font-normal">Nb facture</th>
              <th className="px-4 py-3 font-normal">CA</th>
              <th className="px-4 py-3 font-normal">Prime</th>
              <th className="px-4 py-3 font-normal text-right">Salaire</th>
            </tr>
          </thead>
          <tbody>
            {agents.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-6 text-center text-[rgb(var(--muted))] text-sm">
                  {data ? "Aucun agent." : "Chargement…"}
                </td>
              </tr>
            )}
            {agents.map((a) => {
              const open = expandedIds.includes(a.id);
              return (
                <Fragment key={a.id}>
                  <tr
                    onClick={() => toggleExpanded(a.id)}
                    className="border-b border-white/[0.04] last:border-0 hover:bg-white/[0.03] cursor-pointer"
                  >
                    <td className="px-4 py-3">
                      <ChevronDown size={14} className={`text-[rgb(var(--muted))] transition-transform ${open ? "rotate-180" : ""}`} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <span className="w-6 h-6 rounded-full bg-[rgb(var(--brand-500)/0.18)] text-[rgb(var(--brand-400))] flex items-center justify-center text-xs font-medium overflow-hidden shrink-0">
                          {a.avatarUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={a.avatarUrl} alt="" className="w-full h-full object-cover" />
                          ) : (
                            a.name[0]
                          )}
                        </span>
                        {a.name}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[rgb(var(--muted))]">{a.phone || "—"}</td>
                    <td className="px-4 py-3 text-[rgb(var(--muted))]">{a.grade}</td>
                    <td className="px-4 py-3 text-[rgb(var(--muted))]">{a.commissionRate}%</td>
                    <td className="px-4 py-3">{a.invoiceCount}</td>
                    <td className="px-4 py-3">${a.totalSales.toLocaleString("fr-FR")}</td>
                    <td className="px-4 py-3">${a.bonusAmount.toLocaleString("fr-FR")}</td>
                    <td className="px-4 py-3 text-right font-medium text-[rgb(var(--brand-400))]">
                      ${a.salary.toLocaleString("fr-FR")}
                    </td>
                  </tr>
                  {open && (
                    <tr className="bg-black/10">
                      <td colSpan={9} className="p-0">
                        <AgentSalesRow agentId={a.id} weekId={weekId} canEdit={canEdit} onChanged={load} />
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {expenses.length > 0 && (
        <div className="glass-strong rounded-xl overflow-hidden mt-5 max-w-2xl">
          <p className="text-xs text-[rgb(var(--muted))] px-4 py-3 border-b border-white/[0.08]">Dépenses de la semaine</p>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-[rgb(var(--muted))] border-b border-white/[0.08]">
                <th className="px-4 py-2 font-normal">Raison</th>
                <th className="px-4 py-2 font-normal text-right">Montant</th>
              </tr>
            </thead>
            <tbody>
              {expenses.map((x) => (
                <tr key={x.id} className="border-b border-white/[0.04] last:border-0">
                  <td className="px-4 py-2">{x.reason}</td>
                  <td className="px-4 py-2 text-right font-medium text-[rgb(var(--danger))]">
                    -${x.amount.toLocaleString("fr-FR")}
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
