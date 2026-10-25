import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasServerPermission } from "@/lib/permissions-server";
import { logActivity } from "@/lib/audit-log";
import { HIDDEN_FROM_AGENT_LISTS_WHERE } from "@/lib/agent-filters";

export async function GET() {
  const session = await getServerSession(authOptions);
  const user = session?.user as { id?: string; role?: string } | undefined;
  if (!session?.user || !(await hasServerPermission(user?.id, user?.role, "absences")))
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  const [absences, agents] = await Promise.all([
    prisma.absence.findMany({ orderBy: { startDate: "desc" } }),
    prisma.agent.findMany({ where: HIDDEN_FROM_AGENT_LISTS_WHERE, select: { id: true, firstName: true, lastName: true, avatarUrl: true } }),
  ]);
  const byId = new Map(agents.map((a) => [a.id, a]));

  return NextResponse.json(
    absences.map((a) => ({
      ...a,
      agentName: byId.get(a.agentId) ? `${byId.get(a.agentId)!.firstName} ${byId.get(a.agentId)!.lastName}` : "Inconnu",
      agentAvatarUrl: byId.get(a.agentId)?.avatarUrl ?? null,
    }))
  );
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const user = session?.user as { id?: string; name?: string; role?: string } | undefined;
  if (!session?.user || !(await hasServerPermission(user?.id, user?.role, "absences")))
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const agentId = body?.agentId;
  const startDate = body?.startDate ? new Date(body.startDate) : null;
  const endDate = body?.endDate ? new Date(body.endDate) : null;
  const reason = body?.reason?.trim() || null;

  if (!agentId || !startDate || !endDate || isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    return NextResponse.json({ error: "Agent et dates sont requis." }, { status: 400 });
  }
  if (endDate < startDate) {
    return NextResponse.json({ error: "La date de fin doit être après la date de début." }, { status: 400 });
  }

  const agent = await prisma.agent.findUnique({ where: { id: agentId } });
  if (!agent) return NextResponse.json({ error: "Agent introuvable" }, { status: 404 });

  const absence = await prisma.absence.create({
    data: { agentId, startDate, endDate, reason, createdBy: user!.id! },
  });

  const actorName = user!.name ?? "Admin";
  await logActivity({
    actorId: user!.id,
    actorName,
    action: "CREATE",
    entityType: "Absence",
    entityId: absence.id,
    summary: `${actorName} a déclaré une absence pour ${agent.firstName} ${agent.lastName} (${startDate.toLocaleDateString("fr-FR")} → ${endDate.toLocaleDateString("fr-FR")})`,
  });

  return NextResponse.json(absence, { status: 201 });
}
