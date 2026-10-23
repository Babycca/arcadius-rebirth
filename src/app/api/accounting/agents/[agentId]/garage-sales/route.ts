import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getActiveWeekId } from "@/lib/accounting/week";
import { canAccessPage } from "@/lib/page-access";

function isAdmin(role: string | undefined) {
  return role === "ADMIN" || role === "SUPER_ADMIN";
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ agentId: string }> }) {
  const session = await getServerSession(authOptions);
  const user = session?.user as { id?: string; role?: string } | undefined;

  const requestedWeekId = req.nextUrl.searchParams.get("weekId");
  if (requestedWeekId) {
    if (!session?.user || !isAdmin(user?.role)) {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }
  } else if (!session?.user || !(await canAccessPage("/comptabilite", user?.id, user?.role))) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const { agentId } = await params;
  const weekId = requestedWeekId || (await getActiveWeekId());
  const garageSales = await prisma.garageSale.findMany({
    where: { agentId, weekId },
    orderBy: { date: "desc" },
  });

  return NextResponse.json(garageSales);
}
