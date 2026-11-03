import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getArchivedWeekIds } from "@/lib/accounting/week";
import { sortByHouseNumberDesc } from "@/lib/accounting/sort-sales";
import { canAccessPage } from "@/lib/page-access";
import { hasServerPermission } from "@/lib/permissions-server";

export async function GET(req: NextRequest, { params }: { params: Promise<{ agentId: string }> }) {
  const session = await getServerSession(authOptions);
  const user = session?.user as { id?: string; role?: string } | undefined;

  const requestedWeekId = req.nextUrl.searchParams.get("weekId");
  if (requestedWeekId) {
    if (!session?.user || !(await hasServerPermission(user?.id, user?.role, "archiveComptabilite"))) {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }
  } else if (!session?.user || !(await canAccessPage("/comptabilite", user?.id, user?.role))) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const { agentId } = await params;
  const where = requestedWeekId
    ? { agentId, weekId: requestedWeekId }
    : { agentId, weekId: { notIn: await getArchivedWeekIds() } };
  const garageSales = await prisma.garageSale.findMany({ where });

  return NextResponse.json(sortByHouseNumberDesc(garageSales));
}
