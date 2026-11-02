import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasServerPermission } from "@/lib/permissions-server";
import { getActiveWeekId } from "@/lib/accounting/week";

// Toute semaine passée qui a des ventes/garages/dépenses doit rester
// consultable, même si personne n'a cliqué sur "Archiver" avant que le
// calendrier ne passe à la semaine suivante (la semaine active bascule
// automatiquement, voir lib/accounting/week.ts) — sinon ces données
// deviennent invisibles sans être perdues pour autant. On liste donc aussi
// les semaines "orphelines" (sans WeeklyReset), en plus des vraies archives.
export async function GET() {
  const session = await getServerSession(authOptions);
  const user = session?.user as { id?: string; role?: string } | undefined;
  if (!session?.user || !(await hasServerPermission(user?.id, user?.role, "archiveComptabilite")))
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  const liveWeekId = await getActiveWeekId();

  const [resets, saleWeeks, garageWeeks, expenseWeeks] = await Promise.all([
    prisma.weeklyReset.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.sale.findMany({ distinct: ["weekId"], select: { weekId: true } }),
    prisma.garageSale.findMany({ distinct: ["weekId"], select: { weekId: true } }),
    prisma.expense.findMany({ distinct: ["weekId"], select: { weekId: true } }),
  ]);

  const resetWeekIds = new Set(resets.map((r) => r.weekId));
  const weeksWithData = new Set([
    ...saleWeeks.map((s) => s.weekId),
    ...garageWeeks.map((g) => g.weekId),
    ...expenseWeeks.map((e) => e.weekId),
  ]);
  weeksWithData.delete(liveWeekId);
  const orphanWeekIds = [...weeksWithData].filter((w) => !resetWeekIds.has(w));

  async function summarize(weekId: string) {
    const sales = await prisma.sale.findMany({ where: { weekId } });
    return { salesCount: sales.length, totalSales: sales.reduce((s, x) => s + x.priceAmount, 0) };
  }

  const archivesFromResets = await Promise.all(
    resets.map(async (r) => ({
      weekId: r.weekId,
      periodStart: r.periodStart,
      archivedAt: r.createdAt,
      isFormallyArchived: true,
      ...(await summarize(r.weekId)),
    }))
  );

  const archivesFromOrphans = await Promise.all(
    orphanWeekIds.map(async (weekId) => ({
      weekId,
      periodStart: null,
      archivedAt: null,
      isFormallyArchived: false,
      ...(await summarize(weekId)),
    }))
  );

  const archives = [...archivesFromResets, ...archivesFromOrphans].sort((a, b) => (a.weekId < b.weekId ? 1 : -1));

  return NextResponse.json(archives);
}
