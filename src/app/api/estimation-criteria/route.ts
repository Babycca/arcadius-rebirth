import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function canEdit(role: string | undefined) {
  return role === "ADMIN" || role === "SUPER_ADMIN";
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!session?.user || !canEdit(role)) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const profileId = body?.profileId;
  const label = body?.label?.trim();
  const type = body?.type === "radio" ? "radio" : "checkbox";
  if (!profileId || !label) return NextResponse.json({ error: "Nom requis." }, { status: 400 });

  const count = await prisma.estimationCriterion.count({ where: { profileId } });
  const criterion = await prisma.estimationCriterion.create({
    data: { profileId, label, type, order: count },
    include: { options: true },
  });
  return NextResponse.json(criterion, { status: 201 });
}
