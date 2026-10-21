import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getActiveWeekId } from "@/lib/accounting/week";

function isAdmin(role: string | undefined) {
  return role === "ADMIN" || role === "SUPER_ADMIN";
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ agentId: string }> }) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!session?.user || !isAdmin(role)) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  const { agentId } = await params;
  const body = await req.json().catch(() => null);
  if (typeof body?.enabled !== "boolean") {
    return NextResponse.json({ error: "Valeur enabled requise." }, { status: 400 });
  }

  const weekId = await getActiveWeekId();
  const hasAmount = "amount" in (body ?? {});
  const amount = hasAmount ? (body.amount != null ? Number(body.amount) : null) : undefined;

  const bonus = await prisma.agentWeekBonus.upsert({
    where: { agentId_weekId: { agentId, weekId } },
    update: { enabled: body.enabled, ...(hasAmount ? { amount } : {}) },
    create: { agentId, weekId, enabled: body.enabled, amount: amount ?? null },
  });

  return NextResponse.json(bonus);
}
