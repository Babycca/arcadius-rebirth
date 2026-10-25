import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasServerPermission } from "@/lib/permissions-server";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  const user = session?.user as { id?: string; role?: string } | undefined;
  if (!session?.user || !(await hasServerPermission(user?.id, user?.role, "administration")))
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  const { id } = await params;
  const body = await req.json().catch(() => null);
  const data: Record<string, unknown> = {};
  if (body?.commissionRate != null) data.commissionRate = Number(body.commissionRate);
  if (body?.bonusAmount != null) data.bonusAmount = Number(body.bonusAmount);

  if (typeof body?.grade === "string" && body.grade.trim()) {
    const newGrade = body.grade.trim();
    const existing = await prisma.commissionRule.findUnique({ where: { id } });
    if (existing && existing.grade !== newGrade) {
      const clash = await prisma.commissionRule.findUnique({ where: { grade: newGrade } });
      if (clash) return NextResponse.json({ error: "Ce nom de grade existe déjà." }, { status: 409 });
      // Agent.grade référence le nom en texte libre (pas de clé étrangère) :
      // on met à jour les agents existants pour qu'ils suivent le renommage.
      await prisma.agent.updateMany({ where: { grade: existing.grade }, data: { grade: newGrade } });
      data.grade = newGrade;
    }
  }

  const rule = await prisma.commissionRule.update({ where: { id }, data });
  return NextResponse.json(rule);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  const user = session?.user as { id?: string; role?: string } | undefined;
  if (!session?.user || !(await hasServerPermission(user?.id, user?.role, "administration")))
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  const { id } = await params;
  await prisma.commissionRule.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
