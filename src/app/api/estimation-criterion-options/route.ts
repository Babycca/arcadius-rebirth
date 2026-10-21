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
  const criterionId = body?.criterionId;
  const label = body?.label?.trim();
  const priceMode = ["add", "subtract", "fixed"].includes(body?.priceMode) ? body.priceMode : "add";
  const amount = Number(body?.amount);
  if (!criterionId || !label || !Number.isFinite(amount)) {
    return NextResponse.json({ error: "Nom et montant requis." }, { status: 400 });
  }

  const count = await prisma.estimationCriterionOption.count({ where: { criterionId } });
  const option = await prisma.estimationCriterionOption.create({
    data: { criterionId, label, priceMode, amount, order: count },
  });
  return NextResponse.json(option, { status: 201 });
}
