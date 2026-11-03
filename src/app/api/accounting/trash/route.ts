import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasServerPermission } from "@/lib/permissions-server";
import { HIDDEN_FROM_AGENT_LISTS_WHERE } from "@/lib/agent-filters";

export async function GET() {
  const session = await getServerSession(authOptions);
  const user = session?.user as { id?: string; role?: string } | undefined;
  if (!session?.user || !(await hasServerPermission(user?.id, user?.role, "ventesSupprimer")))
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  const [deleted, agents] = await Promise.all([
    prisma.deletedSale.findMany({ orderBy: { deletedAt: "desc" } }),
    prisma.agent.findMany({ where: HIDDEN_FROM_AGENT_LISTS_WHERE, select: { id: true, firstName: true, lastName: true } }),
  ]);
  const nameById = new Map(agents.map((a) => [a.id, `${a.firstName} ${a.lastName}`]));

  return NextResponse.json(
    deleted.map((d) => ({
      id: d.id,
      agentName: nameById.get(d.agentId) ?? "Agent inconnu",
      date: d.date,
      houseNumber: d.houseNumber,
      priceAmount: d.priceAmount,
      clientName: d.clientName,
      clientPhone: d.clientPhone,
      weekId: d.weekId,
      deletedAt: d.deletedAt,
    }))
  );
}

// Vide la corbeille — suppression définitive de tout, irréversible.
export async function DELETE() {
  const session = await getServerSession(authOptions);
  const user = session?.user as { id?: string; role?: string } | undefined;
  if (!session?.user || !(await hasServerPermission(user?.id, user?.role, "ventesSupprimer")))
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  const { count } = await prisma.deletedSale.deleteMany();
  return NextResponse.json({ ok: true, count });
}
