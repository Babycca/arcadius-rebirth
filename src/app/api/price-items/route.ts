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
  const groupId = body?.groupId;
  const name = body?.name?.trim();
  const price = Number(body?.price);
  if (!groupId || !name || !Number.isFinite(price)) {
    return NextResponse.json({ error: "Nom et prix requis." }, { status: 400 });
  }

  const count = await prisma.priceItem.count({ where: { groupId } });
  const item = await prisma.priceItem.create({
    data: { groupId, name, price, order: count },
  });
  return NextResponse.json(item, { status: 201 });
}
