import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { HIDDEN_FROM_AGENT_LISTS_WHERE } from "@/lib/agent-filters";

const ONLINE_THRESHOLD_MS = 90 * 1000;

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Non connecté" }, { status: 401 });

  const since = new Date(Date.now() - ONLINE_THRESHOLD_MS);
  const agents = await prisma.agent.findMany({
    where: { ...HIDDEN_FROM_AGENT_LISTS_WHERE, lastSeenAt: { gte: since } },
    select: { id: true, firstName: true, lastName: true, avatarUrl: true, grade: true },
    orderBy: { firstName: "asc" },
  });

  return NextResponse.json(
    agents.map((a) => ({ id: a.id, name: `${a.firstName} ${a.lastName}`, avatarUrl: a.avatarUrl, grade: a.grade }))
  );
}
