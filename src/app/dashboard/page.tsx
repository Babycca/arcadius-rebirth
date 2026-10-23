import { ChevronRight, Wallet, TrendingUp, Receipt, MapPin } from "lucide-react";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { PageShell, PageHeader } from "@/components/PageShell";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { categoryFor, MAP_CONFIG } from "@/lib/reserved-zone-categories";
import { zoneCentroidPercent } from "@/lib/zone-centroid";
import { getActiveWeekId } from "@/lib/accounting/week";
import { computeAgentPayroll } from "@/lib/accounting/payroll";
import { HIDDEN_FROM_AGENT_LISTS_WHERE } from "@/lib/agent-filters";
import DashboardGreeting from "@/components/DashboardGreeting";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;

  const [zonesRaw, zoneCategories, weekId] = await Promise.all([
    prisma.reservedZone.findMany({ select: { id: true, categoryId: true, geometry: true } }),
    prisma.reservedZoneCategory.findMany(),
    getActiveWeekId(),
  ]);

  const zonePoints = zonesRaw
    .map((z) => ({ ...z, pos: zoneCentroidPercent(z.geometry) }))
    .filter((z): z is typeof z & { pos: { x: number; y: number } } => z.pos != null);

  const [weekSales, weekGarageSales] = await Promise.all([
    prisma.sale.findMany({ where: { weekId } }),
    prisma.garageSale.findMany({ where: { weekId } }),
  ]);
  const salesCount = weekSales.length;
  const totalInvoices =
    weekSales.reduce((s, x) => s + x.priceAmount, 0) + weekGarageSales.reduce((s, x) => s + x.priceAmount, 0);

  let mySalary = 0;
  let mySalesCount = 0;
  if (userId) {
    const [me, mySales, myGarageSales] = await Promise.all([
      prisma.agent.findUnique({ where: { id: userId } }),
      prisma.sale.findMany({ where: { agentId: userId, weekId } }),
      prisma.garageSale.findMany({ where: { agentId: userId, weekId } }),
    ]);
    mySalesCount = mySales.length;
    if (me) {
      const [rule, bonus] = await Promise.all([
        prisma.commissionRule.findUnique({ where: { grade: me.grade } }),
        prisma.agentWeekBonus.findUnique({ where: { agentId_weekId: { agentId: userId, weekId } } }),
      ]);
      mySalary = computeAgentPayroll(
        mySales,
        rule,
        bonus ? { enabled: bonus.enabled, amount: bonus.amount } : null,
        myGarageSales
      ).salary;
    }
  }

  const recentSalesRaw = await prisma.sale.findMany({ where: { weekId }, orderBy: { createdAt: "desc" }, take: 15 });
  const visibleAgents = await prisma.agent.findMany({
    where: { id: { in: [...new Set(recentSalesRaw.map((s) => s.agentId))] }, ...HIDDEN_FROM_AGENT_LISTS_WHERE },
  });
  const agentById = new Map(visibleAgents.map((a) => [a.id, a]));
  const DERNIERES_VENTES = recentSalesRaw
    .filter((s) => agentById.has(s.agentId))
    .slice(0, 3)
    .map((s) => {
      const agent = agentById.get(s.agentId)!;
      return { id: s.id, agent: agent.firstName, house: s.houseNumber, price: s.priceAmount };
    });

  return (
    <PageShell>
      <PageHeader
        title={<DashboardGreeting />}
        subtitle="Vue d'ensemble — données réelles importées"
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Link
          href="/comptabilite/mes-ventes"
          className="card-hover glass-strong rounded-xl p-4 flex flex-col gap-2.5 border border-transparent"
        >
          <span className="flex items-center justify-between">
            <span className="w-9 h-9 rounded-lg bg-[rgb(var(--brand-500)/0.14)] flex items-center justify-center">
              <Wallet size={16} className="text-[rgb(var(--brand-400))]" />
            </span>
            <ChevronRight size={14} className="text-[rgb(var(--muted))]" />
          </span>
          <span className="text-2xl font-semibold text-[rgb(var(--brand-400))]">{mySalesCount}</span>
          <span className="text-xs text-[rgb(var(--muted))]">Ma comptabilité — mes ventes</span>
        </Link>
        <div className="card-hover glass-strong rounded-xl p-4 flex flex-col gap-2.5 border border-transparent">
          <span className="w-9 h-9 rounded-lg bg-white/[0.06] flex items-center justify-center">
            <TrendingUp size={16} className="text-[rgb(var(--muted))]" />
          </span>
          <span className="text-2xl font-semibold">{salesCount}</span>
          <span className="text-xs text-[rgb(var(--muted))]">Ventes cette semaine</span>
        </div>
        <div className="card-hover glass-strong rounded-xl p-4 flex flex-col gap-2.5 border border-transparent">
          <span className="w-9 h-9 rounded-lg bg-white/[0.06] flex items-center justify-center">
            <Receipt size={16} className="text-[rgb(var(--muted))]" />
          </span>
          <span className="text-2xl font-semibold">${totalInvoices.toLocaleString("fr-FR")}</span>
          <span className="text-xs text-[rgb(var(--muted))]">Chiffre des factures</span>
        </div>
        <div
          className="card-hover rounded-xl p-4 flex flex-col gap-2.5 border border-[rgb(var(--brand-500)/0.3)] relative overflow-hidden"
          style={{ background: "linear-gradient(135deg, rgb(var(--brand-500)/0.14), rgb(var(--brand-600)/0.05))" }}
        >
          <Wallet size={56} className="absolute -right-2 -bottom-3 text-[rgb(var(--brand-500)/0.1)]" />
          <span className="w-9 h-9 rounded-lg bg-[rgb(var(--brand-500)/0.18)] flex items-center justify-center">
            <Wallet size={16} className="text-[rgb(var(--brand-400))]" />
          </span>
          <span className="text-2xl font-semibold brand-gradient-text">${mySalary.toLocaleString("fr-FR")}</span>
          <span className="text-xs text-[rgb(var(--muted))]">Mon salaire</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="glass-strong rounded-xl p-5">
          <Link href="/comptabilite" className="flex items-center justify-between mb-4 group">
            <h2 className="font-medium flex items-center gap-2">
              <TrendingUp size={15} className="text-[rgb(var(--brand-400))]" />
              Dernières ventes
            </h2>
            <ChevronRight
              size={16}
              className="text-[rgb(var(--muted))] group-hover:text-[rgb(var(--brand-400))] transition-colors"
            />
          </Link>
          <div className="flex flex-col gap-1">
            {DERNIERES_VENTES.length === 0 && (
              <p className="text-sm text-[rgb(var(--muted))] px-3 py-2.5">Aucune vente pour l&apos;instant.</p>
            )}
            {DERNIERES_VENTES.map((s) => (
              <div
                key={s.id}
                className="flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-white/[0.04] transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-[rgb(var(--brand-500)/0.18)] text-[rgb(var(--brand-400))] flex items-center justify-center text-xs font-medium">
                    {s.agent[0]}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{s.agent}</p>
                    <p className="text-xs text-[rgb(var(--muted))]">Habitation #{s.house}</p>
                  </div>
                </div>
                <span className="text-sm font-medium text-[rgb(var(--brand-400))]">${s.price.toLocaleString("fr-FR")}</span>
              </div>
            ))}
          </div>
        </div>

        <Link
          href="/carte-biens-reserves"
          className="glass-strong rounded-xl p-5 flex flex-col card-hover block border border-transparent"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-medium flex items-center gap-2">
              <MapPin size={15} className="text-[rgb(var(--brand-400))]" />
              Carte des zones réservées
            </h2>
            <ChevronRight size={16} className="text-[rgb(var(--muted))]" />
          </div>
          <div className="relative flex-1 rounded-lg overflow-hidden border border-white/[0.08] min-h-[180px]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={MAP_CONFIG.imageUrl} alt="" className="absolute inset-0 w-full h-full object-cover opacity-80" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
            {zonePoints.map((z) => {
              const cat = categoryFor(zoneCategories, z.categoryId);
              return (
                <span
                  key={z.id}
                  className="absolute w-1.5 h-1.5 rounded-full -translate-x-1/2 -translate-y-1/2 ring-2 ring-black/30"
                  style={{ left: `${z.pos.x}%`, top: `${z.pos.y}%`, backgroundColor: cat?.color ?? "#888" }}
                />
              );
            })}
          </div>
        </Link>
      </div>
    </PageShell>
  );
}
