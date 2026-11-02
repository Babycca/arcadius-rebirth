import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasServerPermission } from "@/lib/permissions-server";

// Liste uniquement les semaines formellement archivées (bouton "Archiver"
// cliqué) — tout ce qui n'a pas encore été archivé reste affiché dans la
// comptabilité "en cours" (/comptabilite), jamais ici, voir
// lib/accounting/week.ts.
export async function GET() {
  const session = await getServerSession(authOptions);
  const user = session?.user as { id?: string; role?: string } | undefined;
  if (!session?.user || !(await hasServerPermission(user?.id, user?.role, "archiveComptabilite")))
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  const resets = await prisma.weeklyReset.findMany({ orderBy: { createdAt: "desc" } });

  const archives = await Promise.all(
    resets.map(async (r) => {
      const sales = await prisma.sale.findMany({ where: { weekId: r.weekId } });
      return {
        weekId: r.weekId,
        periodStart: r.periodStart,
        archivedAt: r.createdAt,
        salesCount: sales.length,
        totalSales: sales.reduce((s, x) => s + x.priceAmount, 0),
      };
    })
  );

  return NextResponse.json(archives);
}
