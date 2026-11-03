import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getArchivedWeekIds } from "@/lib/accounting/week";
import { computeAgentPayroll } from "@/lib/accounting/payroll";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Non connecté" }, { status: 401 });

  const userId = (session.user as { id: string }).id;
  const [agent, archivedWeekIds, rules] = await Promise.all([
    prisma.agent.findUnique({
      where: { id: userId },
      select: {
        firstName: true,
        lastName: true,
        loginHandle: true,
        phone: true,
        grade: true,
        role: true,
        accentColor: true,
        avatarUrl: true,
        clientSuggestionsDisabled: true,
      },
    }),
    getArchivedWeekIds(),
    prisma.commissionRule.findMany(),
  ]);

  if (!agent) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  const [sales, bonus] = await Promise.all([
    prisma.sale.findMany({ where: { agentId: userId, weekId: { notIn: archivedWeekIds } } }),
    // orderBy id desc : plusieurs lignes de prime peuvent coexister tant que
    // rien n'est archivé (une semaine fusionnée avec une autre, voir
    // lib/accounting/week.ts) — on veut toujours la plus récente, pas celle
    // que Postgres renvoie en premier par défaut.
    prisma.agentWeekBonus.findFirst({
      where: { agentId: userId, weekId: { notIn: archivedWeekIds } },
      orderBy: { id: "desc" },
    }),
  ]);
  const rule = rules.find((r) => r.grade === agent.grade) ?? null;
  const payroll = computeAgentPayroll(sales, rule, bonus ? { enabled: bonus.enabled, amount: bonus.amount } : null);

  return NextResponse.json({ ...agent, payroll });
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Non connecté" }, { status: 401 });

  const userId = (session.user as { id: string }).id;
  const body = await req.json().catch(() => null);
  const data: Record<string, unknown> = {};
  if (typeof body?.phone === "string") data.phone = body.phone || null;
  if (typeof body?.clientSuggestionsDisabled === "boolean") {
    data.clientSuggestionsDisabled = body.clientSuggestionsDisabled;
  }

  const agent = await prisma.agent.update({ where: { id: userId }, data });
  return NextResponse.json(agent);
}
