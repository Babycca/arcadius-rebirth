import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getActiveWeekId } from "@/lib/accounting/week";
import { canAccessPage } from "@/lib/page-access";
import { hasServerPermission } from "@/lib/permissions-server";

export async function GET(req: NextRequest, { params }: { params: Promise<{ agentId: string }> }) {
  const session = await getServerSession(authOptions);
  const user = session?.user as { id?: string; role?: string } | undefined;

  const requestedWeekId = req.nextUrl.searchParams.get("weekId");
  // Une semaine archivée n'est consultable qu'avec la permission
  // "archiveComptabilite".
  if (requestedWeekId) {
    if (!session?.user || !(await hasServerPermission(user?.id, user?.role, "archiveComptabilite"))) {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }
  } else if (!session?.user || !(await canAccessPage("/comptabilite", user?.id, user?.role))) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const { agentId } = await params;
  const weekId = requestedWeekId || (await getActiveWeekId());
  const [agent, sales] = await Promise.all([
    prisma.agent.findUnique({ where: { id: agentId } }),
    prisma.sale.findMany({
      where: { agentId, weekId },
      orderBy: { date: "desc" },
    }),
  ]);

  if (!agent) return NextResponse.json({ error: "Agent introuvable" }, { status: 404 });

  // Absence affichée uniquement sur la semaine en cours (une semaine
  // archivée reflète une période passée, l'absence actuelle n'a pas de sens).
  let isAbsentToday = false;
  if (!requestedWeekId) {
    const today = new Date();
    const absence = await prisma.absence.findFirst({
      where: { agentId, startDate: { lte: today }, endDate: { gte: today } },
    });
    isAbsentToday = !!absence;
  }

  return NextResponse.json({
    agent: {
      id: agent.id,
      name: `${agent.firstName} ${agent.lastName}`,
      avatarUrl: agent.avatarUrl,
      grade: agent.grade,
      role: agent.role,
    },
    sales,
    isAbsentToday,
  });
}
