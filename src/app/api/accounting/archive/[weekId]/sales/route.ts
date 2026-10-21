import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function isAdmin(role: string | undefined) {
  return role === "ADMIN" || role === "SUPER_ADMIN";
}

// Toutes les ventes d'une semaine (archivée ou en cours), avec le nom de
// l'agent attaché — évite une requête par agent côté page détail d'archive.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ weekId: string }> }) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!session?.user || !isAdmin(role)) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  const { weekId } = await params;
  const sales = await prisma.sale.findMany({
    where: { weekId: decodeURIComponent(weekId) },
    orderBy: { date: "desc" },
  });

  const agents = await prisma.agent.findMany({
    where: { id: { in: [...new Set(sales.map((s) => s.agentId))] } },
    select: { id: true, firstName: true, lastName: true },
  });
  const nameById = new Map(agents.map((a) => [a.id, `${a.firstName} ${a.lastName}`]));

  return NextResponse.json(
    sales.map((s) => ({
      id: s.id,
      agentId: s.agentId,
      agentName: nameById.get(s.agentId) ?? "Inconnu",
      date: s.date,
      houseNumber: s.houseNumber,
      priceAmount: s.priceAmount,
      clientName: s.clientName,
      clientPhone: s.clientPhone,
    }))
  );
}
