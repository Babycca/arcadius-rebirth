import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasServerPermission } from "@/lib/permissions-server";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Non connecté" }, { status: 401 });

  const rules = await prisma.commissionRule.findMany({ orderBy: { order: "asc" } });
  return NextResponse.json(rules);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const user = session?.user as { id?: string; role?: string } | undefined;
  if (!session?.user || !(await hasServerPermission(user?.id, user?.role, "grades")))
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const grade = body?.grade?.trim();
  const commissionRate = Number(body?.commissionRate);
  const bonusAmount = Number(body?.bonusAmount) || 0;
  if (!grade || !Number.isFinite(commissionRate)) {
    return NextResponse.json({ error: "Nom du grade et % de commission requis." }, { status: 400 });
  }

  const existing = await prisma.commissionRule.findUnique({ where: { grade } });
  if (existing) return NextResponse.json({ error: "Ce grade existe déjà." }, { status: 409 });

  const count = await prisma.commissionRule.count();
  const rule = await prisma.commissionRule.create({ data: { grade, commissionRate, bonusAmount, order: count } });
  return NextResponse.json(rule, { status: 201 });
}
