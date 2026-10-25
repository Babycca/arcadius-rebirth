import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasServerPermission } from "@/lib/permissions-server";

export async function GET() {
  const session = await getServerSession(authOptions);
  const user = session?.user as { id?: string; role?: string } | undefined;
  if (!session?.user || !(await hasServerPermission(user?.id, user?.role, "archiveComptabilite")))
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  const resets = await prisma.weeklyReset.findMany({ orderBy: { createdAt: "desc" } });

  const archives = await Promise.all(
    resets.map(async (r) => {
      const sales = await prisma.sale.findMany({ where: { weekId: r.weekId } });
      const totalSales = sales.reduce((s, x) => s + x.priceAmount, 0);
      return {
        weekId: r.weekId,
        periodStart: r.periodStart,
        archivedAt: r.createdAt,
        salesCount: sales.length,
        totalSales,
      };
    })
  );

  return NextResponse.json(archives);
}
