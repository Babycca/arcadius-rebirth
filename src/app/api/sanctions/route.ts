import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/audit-log";
import { HIDDEN_FROM_AGENT_LISTS_WHERE } from "@/lib/agent-filters";

function isAdmin(role: string | undefined) {
  return role === "ADMIN" || role === "SUPER_ADMIN";
}

export async function GET() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!session?.user || !isAdmin(role)) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  const [sanctions, agents] = await Promise.all([
    prisma.sanction.findMany({ orderBy: { date: "desc" } }),
    prisma.agent.findMany({ where: HIDDEN_FROM_AGENT_LISTS_WHERE, select: { id: true, firstName: true, lastName: true, avatarUrl: true } }),
  ]);
  const byId = new Map(agents.map((a) => [a.id, a]));

  return NextResponse.json(
    sanctions.map((s) => ({
      ...s,
      agentName: byId.get(s.agentId) ? `${byId.get(s.agentId)!.firstName} ${byId.get(s.agentId)!.lastName}` : "Inconnu",
      agentAvatarUrl: byId.get(s.agentId)?.avatarUrl ?? null,
    }))
  );
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const user = session?.user as { id?: string; name?: string; role?: string } | undefined;
  if (!session?.user || !isAdmin(user?.role)) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const agentId = body?.agentId;
  const type = body?.type?.trim();
  const reason = body?.reason?.trim();
  const date = body?.date ? new Date(body.date) : new Date();

  if (!agentId || !type || !reason || isNaN(date.getTime())) {
    return NextResponse.json({ error: "Agent, type et motif sont requis." }, { status: 400 });
  }

  const agent = await prisma.agent.findUnique({ where: { id: agentId } });
  if (!agent) return NextResponse.json({ error: "Agent introuvable" }, { status: 404 });

  const sanction = await prisma.sanction.create({
    data: { agentId, type, reason, date, createdBy: user!.id! },
  });

  const actorName = user!.name ?? "Admin";
  await logActivity({
    actorId: user!.id,
    actorName,
    action: "CREATE",
    entityType: "Sanction",
    entityId: sanction.id,
    summary: `${actorName} a ajouté une sanction (${type}) pour ${agent.firstName} ${agent.lastName}`,
  });

  return NextResponse.json(sanction, { status: 201 });
}
