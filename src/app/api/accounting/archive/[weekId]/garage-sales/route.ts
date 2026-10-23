import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function isAdmin(role: string | undefined) {
  return role === "ADMIN" || role === "SUPER_ADMIN";
}

// Tous les garages posés une semaine donnée (archivée ou en cours), avec le
// nom de l'agent attaché — même principe que archive/[weekId]/sales.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ weekId: string }> }) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!session?.user || !isAdmin(role)) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  const { weekId } = await params;
  const garageSales = await prisma.garageSale.findMany({
    where: { weekId: decodeURIComponent(weekId) },
    orderBy: { date: "desc" },
  });

  const agents = await prisma.agent.findMany({
    where: { id: { in: [...new Set(garageSales.map((g) => g.agentId))] } },
    select: { id: true, firstName: true, lastName: true },
  });
  const nameById = new Map(agents.map((a) => [a.id, `${a.firstName} ${a.lastName}`]));

  return NextResponse.json(
    garageSales.map((g) => ({
      id: g.id,
      agentId: g.agentId,
      agentName: nameById.get(g.agentId) ?? "Inconnu",
      date: g.date,
      type: g.type,
      houseNumber: g.houseNumber,
      priceAmount: g.priceAmount,
    }))
  );
}
