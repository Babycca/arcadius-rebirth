import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function isAdmin(role: string | undefined) {
  return role === "ADMIN" || role === "SUPER_ADMIN";
}

export async function GET() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!session?.user || !isAdmin(role)) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

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
