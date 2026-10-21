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
  const name = body?.name?.trim();
  if (!name) return NextResponse.json({ error: "Nom requis." }, { status: 400 });

  const count = await prisma.priceGroup.count();
  const group = await prisma.priceGroup.create({ data: { name, order: count }, include: { items: true } });
  return NextResponse.json(group, { status: 201 });
}
